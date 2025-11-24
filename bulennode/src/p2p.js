const http = require('http');
const https = require('https');

function postJson(urlString, payload, headers) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlString);
      const body = JSON.stringify(payload);
      const client = url.protocol === 'https:' ? https : http;

      const mergedHeaders = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...(headers || {}),
      };

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + (url.search || ''),
        method: 'POST',
        headers: mergedHeaders,
      };

      const request = client.request(options, (response) => {
        response.on('data', () => {});
        response.on('end', () => resolve());
      });

      request.on('error', (error) => {
        reject(error);
      });

      request.write(body);
      request.end();
    } catch (error) {
      reject(error);
    }
  });
}

async function broadcastTransaction(config, transaction) {
  const headers = {};
  if (config.p2pToken) {
    headers['x-bulen-p2p-token'] = config.p2pToken;
  }
  headers['x-bulen-protocol-version'] = config.protocolVersion;
  const tasks = config.peers.map((peer) =>
    postJson(`http://${peer}/p2p/tx`, { transaction }, headers).catch((error) => {
      console.warn('Failed to broadcast transaction to peer', peer, error.message);
    }),
  );
  await Promise.all(tasks);
}

async function broadcastBlock(config, block) {
  const headers = {};
  if (config.p2pToken) {
    headers['x-bulen-p2p-token'] = config.p2pToken;
  }
  headers['x-bulen-protocol-version'] = config.protocolVersion;
  const tasks = config.peers.map((peer) =>
    postJson(`http://${peer}/p2p/block`, { block }, headers).catch((error) => {
      console.warn('Failed to broadcast block to peer', peer, error.message);
    }),
  );
  await Promise.all(tasks);
}

module.exports = {
  broadcastTransaction,
  broadcastBlock,
};
