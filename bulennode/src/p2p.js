const crypto = require('crypto');
const dgram = require('dgram');
const http = require('http');
const https = require('https');
const { createPeerProof, createPeerSessionToken } = require('./security');
const { deriveServerNonce } = require('./consensus');

const sessionCache = new Map();
let quicSocket = null;

function parsePeer(peer) {
  const [host, port] = peer.split(':');
  return { host, port: Number(port) };
}

function postJson(urlString, payload, headers, tlsOptions = {}) {
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
        ...tlsOptions,
      };

      const chunks = [];
      const request = client.request(options, (response) => {
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          let bodyJson = null;
          if (chunks.length) {
            try {
              bodyJson = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            } catch (error) {
              bodyJson = null;
            }
          }
          resolve({ status: response.statusCode, body: bodyJson });
        });
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

function getJson(urlString, headers, tlsOptions = {}) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlString);
      const client = url.protocol === 'https:' ? https : http;
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + (url.search || ''),
        method: 'GET',
        headers: headers || {},
        ...tlsOptions,
      };
      const chunks = [];
      const request = client.request(options, (response) => {
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          let bodyJson = null;
          if (chunks.length) {
            try {
              bodyJson = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            } catch (error) {
              bodyJson = null;
            }
          }
          resolve({ status: response.statusCode, body: bodyJson });
        });
      });
      request.on('error', (error) => reject(error));
      request.end();
    } catch (error) {
      reject(error);
    }
  });
}

function protocolForPeer(config) {
  return config.p2pTlsEnabled || config.p2pRequireTls ? 'https' : 'http';
}

function tlsOptions(config) {
  if (!config.p2pTlsEnabled) {
    return {};
  }
  return { rejectUnauthorized: !config.p2pTlsAllowSelfSigned };
}

function baseHeaders(config) {
  const headers = {
    'x-bulen-protocol-version': config.protocolVersion,
  };
  if (config.p2pToken && !config.p2pRequireHandshake) {
    headers['x-bulen-p2p-token'] = config.p2pToken;
  }
  return headers;
}

function selectPeers(config) {
  const peers = Array.isArray(config.peers) ? [...config.peers] : [];
  const maxPeers = Number.isFinite(config.p2pMaxPeers) ? config.p2pMaxPeers : peers.length;
  const fanout = Math.max(
    1,
    Math.min(peers.length, Number.isFinite(config.p2pFanout) ? config.p2pFanout : peers.length),
  );
  // Hard cap peers list to p2pMaxPeers
  if (peers.length > maxPeers) {
    peers.length = maxPeers;
  }
  for (let i = peers.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [peers[i], peers[j]] = [peers[j], peers[i]];
  }
  return peers.slice(0, fanout);
}

async function ensureHandshake(context, peer) {
  const { config } = context;
  if (!config.p2pToken || config.p2pRequireHandshake === false) {
    return null;
  }
  if (sessionCache.has(peer)) {
    const cached = sessionCache.get(peer);
    if (cached.expiresAt && cached.expiresAt < Date.now()) {
      sessionCache.delete(peer);
    } else {
      return cached;
    }
  }
  const clientNonce = crypto.randomBytes(12).toString('hex');
  const proof = createPeerProof(config, config.nodeId, config.chainId, clientNonce);
  const headers = {
    ...baseHeaders(config),
    'x-bulen-peer-proof': proof,
    'x-bulen-peer-nonce': clientNonce,
  };
  const protocol = protocolForPeer(config);
  const result = await postJson(
    `${protocol}://${peer}/p2p/handshake`,
    {
      nodeId: config.nodeId,
      chainId: config.chainId,
      protocolVersion: config.protocolVersion,
      nonce: clientNonce,
    },
    headers,
    tlsOptions(config),
  );
  if (!result || result.status !== 200 || !result.body || !result.body.sessionToken) {
    throw new Error('Handshake failed');
  }
  const session = {
    token: result.body.sessionToken,
    nonce: clientNonce,
    serverNonce: result.body.serverNonce,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes TTL
  };
  sessionCache.set(peer, session);
  return session;
}

function authHeaders(config, peerSession) {
  const headers = baseHeaders(config);
  if (peerSession) {
    headers['x-bulen-peer-id'] = config.nodeId;
    headers['x-bulen-peer-session'] = peerSession.token;
    headers['x-bulen-peer-nonce'] = peerSession.nonce;
  }
  return headers;
}

async function broadcastTransaction(context, transaction) {
  const { config } = context;
  const protocol = protocolForPeer(config);
  const peers = selectPeers(config);
  const tasks = peers.map(async (peer) => {
    try {
      const session = await ensureHandshake(context, peer);
      const headers = authHeaders(config, session);
      await postJson(
        `${protocol}://${peer}/p2p/tx`,
        { transaction },
        headers,
        tlsOptions(config),
      );
      if (config.p2pQuicEnabled && quicSocket) {
        const packet = {
          type: 'tx',
          peerId: config.nodeId,
          chainId: config.chainId,
          nonce: session ? session.nonce : crypto.randomBytes(8).toString('hex'),
          session:
            (session && session.token) ||
            createPeerSessionToken(
              config,
              config.nodeId,
              config.chainId,
              session ? session.nonce : deriveServerNonce(config, config.nodeId),
            ),
          payload: transaction,
        };
        const { host, port } = parsePeer(peer);
        const targetPort = Number.isFinite(config.p2pQuicPort)
          ? config.p2pQuicPort
          : Number.isFinite(port) && port > 0
            ? port
            : undefined;
        if (targetPort) {
          quicSocket.send(Buffer.from(JSON.stringify(packet)), targetPort, host, () => {});
        }
      }
    } catch (error) {
      console.warn('Failed to broadcast transaction to peer', peer, error.message);
    }
  });
  await Promise.all(tasks);
}

async function broadcastBlock(context, block) {
  const { config } = context;
  const protocol = protocolForPeer(config);
  const peers = selectPeers(config);
  const tasks = peers.map(async (peer) => {
    try {
      const session = await ensureHandshake(context, peer);
      const headers = authHeaders(config, session);
      await postJson(
        `${protocol}://${peer}/p2p/block`,
        { block },
        headers,
        tlsOptions(config),
      );
      if (config.p2pQuicEnabled && quicSocket) {
        const packet = {
          type: 'block',
          peerId: config.nodeId,
          chainId: config.chainId,
          nonce: session ? session.nonce : crypto.randomBytes(8).toString('hex'),
          session:
            (session && session.token) ||
            createPeerSessionToken(
              config,
              config.nodeId,
              config.chainId,
              session ? session.nonce : deriveServerNonce(config, config.nodeId),
            ),
          payload: block,
        };
        const { host, port } = parsePeer(peer);
        const targetPort = Number.isFinite(config.p2pQuicPort)
          ? config.p2pQuicPort
          : Number.isFinite(port) && port > 0
            ? port
            : undefined;
        if (targetPort) {
          quicSocket.send(Buffer.from(JSON.stringify(packet)), targetPort, host, () => {});
        }
      }
    } catch (error) {
      console.warn('Failed to broadcast block to peer', peer, error.message);
    }
  });
  await Promise.all(tasks);
}

function startQuicListener(context, handlers = {}) {
  const { config } = context;
  if (!config.p2pQuicEnabled || quicSocket) {
    return null;
  }
  if (!config.p2pToken) {
    console.warn('P2P QUIC disabled: BULEN_P2P_TOKEN is required for authenticated UDP gossip');
    return null;
  }
  quicSocket = dgram.createSocket('udp4');

  quicSocket.on('message', (message) => {
    try {
      const packet = JSON.parse(message.toString('utf8'));
      if (!packet || !packet.type) {
        return;
      }
      if (config.p2pRequireHandshake && config.p2pToken) {
        const expected = createPeerSessionToken(
          config,
          packet.peerId,
          config.chainId,
          packet.nonce,
        );
        if (!packet.session || expected !== packet.session) {
          return;
        }
      } else if (config.p2pToken) {
        // Token required even without handshake
        const expected = createPeerSessionToken(
          config,
          packet.peerId,
          config.chainId,
          packet.nonce,
        );
        if (!packet.session || expected !== packet.session) {
          return;
        }
      } else {
        return;
      }
      if (packet.chainId && packet.chainId !== config.chainId) {
        return;
      }
      if (packet.type === 'tx' && handlers.onTransaction) {
        handlers.onTransaction(packet.payload, packet.peerId || 'unknown');
      }
      if (packet.type === 'block' && handlers.onBlock) {
        handlers.onBlock(packet.payload, packet.peerId || 'unknown');
      }
    } catch (error) {
      // Ignore malformed packets
    }
  });

  quicSocket.bind(config.p2pQuicPort, () => {
    console.log(`P2P QUIC-lite listener on UDP ${config.p2pQuicPort}`);
  });
  return quicSocket;
}

async function fetchBlockFromPeer(context, peer, hash) {
  const { config } = context;
  const protocol = protocolForPeer(config);
  const session = await ensureHandshake(context, peer);
  const headers = authHeaders(config, session);
  const result = await getJson(
    `${protocol}://${peer}/p2p/block/${hash}`,
    headers,
    tlsOptions(config),
  );
  if (result && result.status === 200 && result.body && result.body.block) {
    return result.body.block;
  }
  return null;
}

module.exports = {
  broadcastTransaction,
  broadcastBlock,
  ensureHandshake,
  startQuicListener,
  fetchBlockFromPeer,
};
