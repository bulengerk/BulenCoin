#!/usr/bin/env node
/**
 * Mini network simulation: spins up N BulenNode instances in-process,
 * wires them with P2P token + handshake, submits a transaction, and
 * reports propagation status after a short wait.
 *
 * Usage:
 *   node scripts/tests/mini_network_sim.js [numNodes]
 *
 * Defaults: 6 nodes, fanout=3, mempoolMaxSize=200, blockIntervalMs=400ms.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const baseConfig = require('../../src/config');
const { createNodeContext, createServer, startBlockProducer } = require('../../src/server');
const { startUptimeSampler } = require('../../src/rewards');

const numNodes = Math.max(3, Number(process.argv[2]) || 6);
const token = 'sim-token';

function cloneConfig(overrides) {
  return {
    ...baseConfig,
    peers: [],
    ...overrides,
  };
}

async function fetchJson(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options && options.headers ? options.headers : {}),
    },
  });
  let body = null;
  try {
    body = await response.json();
  } catch (error) {
    body = null;
  }
  return { status: response.status, body };
}

async function main() {
  const nodes = [];
  const dataDirs = [];

  try {
    for (let i = 0; i < numNodes; i += 1) {
      const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `bulen-mini-${i}-`));
      dataDirs.push(dataDir);
      const config = cloneConfig({
        nodeId: `mini-${i}`,
        dataDir,
        httpPort: 0,
        blockIntervalMs: 400,
        mempoolMaxSize: 200,
        p2pToken: token,
        p2pRequireHandshake: true,
        p2pFanout: Math.min(3, numNodes - 1),
        p2pMaxPeers: numNodes - 1,
        requireSignatures: false,
        enableFaucet: true,
      });
      const context = createNodeContext(config);
      const server = createServer(context);
      startBlockProducer(context);
      startUptimeSampler(context);
      const addressInfo = server.address();
      nodes.push({ context, server, baseUrl: `http://127.0.0.1:${addressInfo.port}` });
    }

    // Wire peers after knowing ports
    const peerList = nodes.map((n) =>
      n.baseUrl.replace('http://', '').replace('/api', '').replace(/\/$/, ''),
    );
    for (const node of nodes) {
      node.context.config.peers = peerList.filter((p) => !node.baseUrl.includes(p));
    }

    const node0 = nodes[0];
    console.log(`Funding alice on ${node0.baseUrl}`);
    await fetchJson(`${node0.baseUrl}/api/faucet`, {
      method: 'POST',
      body: JSON.stringify({ address: 'alice-sim', amount: 1000 }),
    });

    console.log('Submitting transaction on node0');
    await fetchJson(`${node0.baseUrl}/api/transactions`, {
      method: 'POST',
      body: JSON.stringify({
        from: 'alice-sim',
        to: 'bob-sim',
        amount: 5,
        fee: 0,
        nonce: 1,
      }),
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const statuses = [];
    for (const node of nodes) {
      const res = await fetchJson(`${node.baseUrl}/api/status`, { method: 'GET' });
      statuses.push({ node: node.context.config.nodeId, height: res.body.height });
    }

    console.log('Heights after propagation:', statuses);
  } finally {
    for (const node of nodes) {
      if (Array.isArray(node.context.timers)) {
        node.context.timers.forEach((handle) => clearInterval(handle));
      }
      node.server.close();
    }
    for (const dir of dataDirs) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch (error) {
        // ignore
      }
    }
  }
}

main().catch((error) => {
  console.error('Simulation failed:', error);
  process.exit(1);
});
