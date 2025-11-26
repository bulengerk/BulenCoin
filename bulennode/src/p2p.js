const crypto = require('crypto');
const dgram = require('dgram');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { createPeerProof, createPeerSessionToken } = require('./security');
const { deriveServerNonce, signPayload } = require('./identity');

const sessionCache = new Map();
let quicSocket = null;

function recordPeerObservation(context, peer, ok) {
  if (!context.peerBook) {
    return;
  }
  const current = context.peerBook.get(peer) || { score: 0, lastSeen: 0 };
  current.score = (current.score || 0) + (ok ? 1 : -1);
  current.lastSeen = Date.now();
  context.peerBook.set(peer, current);
  persistPeerBook(context);
}

function peerBookPath(config) {
  return path.join(config.dataDir || '.', 'p2p_peers.json');
}

function persistPeerBook(context) {
  if (!context.peerBook || !context.config || !context.config.dataDir) {
    return;
  }
  try {
    const entries = Array.from(context.peerBook.entries()).map(([peer, meta]) => ({
      peer,
      score: meta.score || 0,
      lastSeen: meta.lastSeen || 0,
    }));
    fs.mkdirSync(context.config.dataDir, { recursive: true });
    fs.writeFileSync(peerBookPath(context.config), JSON.stringify({ peers: entries }, null, 2));
  } catch (error) {
    // best-effort; ignore
  }
}

function loadPeerBook(config) {
  const map = new Map();
  try {
    const file = peerBookPath(config);
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (raw && Array.isArray(raw.peers)) {
      raw.peers.forEach((entry) => {
        if (entry.peer) {
          map.set(entry.peer, { score: entry.score || 0, lastSeen: entry.lastSeen || 0 });
        }
      });
    }
  } catch (error) {
    // ignore
  }
  return map;
}

async function discoverPeers(context, peer, session) {
  if (!context.peerBook) {
    return;
  }
  const entry = context.peerBook.get(peer);
  if (entry && entry.discoveredAt && Date.now() - entry.discoveredAt < 60_000) {
    return;
  }
  const { config } = context;
  const protocol = protocolForPeer(config);
  try {
    const headers = authHeaders(config, session);
    const res = await getJson(`${protocol}://${peer}/p2p/peers`, headers, tlsOptions(config));
    if (res && res.status === 200 && res.body && Array.isArray(res.body.peers)) {
      for (const candidate of res.body.peers) {
        if (!candidate || typeof candidate !== 'string') continue;
        if (!context.peerBook.has(candidate)) {
          context.peerBook.set(candidate, { score: 0, lastSeen: 0, discoveredAt: Date.now() });
        }
      }
      context.peerBook.set(peer, { ...(entry || {}), score: (entry ? entry.score : 0), lastSeen: Date.now(), discoveredAt: Date.now() });
    }
  } catch (error) {
    // ignore discovery errors
  }
}

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

function selectPeers(context) {
  const { config, peerBook } = context;
  const peers = Array.isArray(config.peers) ? [...config.peers] : [];
  if (peerBook) {
    for (const peer of peerBook.keys()) {
      if (!peers.includes(peer)) {
        peers.push(peer);
      }
    }
  }
  const scored = peers.map((peer) => ({
    peer,
    score: peerBook && peerBook.has(peer) ? peerBook.get(peer).score || 0 : 0,
  }));
  scored.sort((a, b) => b.score - a.score);
  const sortedPeers = scored.map((entry) => entry.peer);
  const maxPeers = Number.isFinite(config.p2pMaxPeers) ? config.p2pMaxPeers : sortedPeers.length;
  const fanout = Math.max(
    1,
    Math.min(sortedPeers.length, Number.isFinite(config.p2pFanout) ? config.p2pFanout : sortedPeers.length),
  );
  const trimmed = sortedPeers.slice(0, maxPeers);
  return trimmed.slice(0, fanout);
}

async function ensureHandshake(context, peer) {
  const { config } = context;
  if (config.p2pRequireHandshake === false) {
    return null;
  }
  const nodeIdentity = config.validatorAddress || config.nodeId;
  if (sessionCache.has(peer)) {
    const cached = sessionCache.get(peer);
    if (cached.expiresAt && cached.expiresAt < Date.now()) {
      sessionCache.delete(peer);
    } else {
      return cached;
    }
  }
  const clientNonce = crypto.randomBytes(12).toString('hex');
  const protocol = protocolForPeer(config);
  let body;
  let headers = baseHeaders(config);

  if (!config.p2pToken) {
    const payload = `${nodeIdentity}|${config.chainId}|${clientNonce}`;
    const signature = signPayload(context.identity.privateKeyPem, payload);
    body = {
      nodeId: nodeIdentity,
      chainId: config.chainId,
      protocolVersion: config.protocolVersion,
      nonce: clientNonce,
      publicKey: context.identity.publicKeyPem,
      signature,
    };
  } else {
    const proof = createPeerProof(config, nodeIdentity, config.chainId, clientNonce);
    headers = {
      ...headers,
      'x-bulen-peer-proof': proof,
      'x-bulen-peer-nonce': clientNonce,
    };
    body = {
      nodeId: nodeIdentity,
      chainId: config.chainId,
      protocolVersion: config.protocolVersion,
      nonce: clientNonce,
    };
  }

  const result = await postJson(
    `${protocol}://${peer}/p2p/handshake`,
    body,
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
    peerPublicKey: result.body.publicKey || null,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes TTL
  };
  sessionCache.set(peer, session);
  return session;
}

function authHeaders(config, peerSession) {
  const headers = baseHeaders(config);
  if (peerSession) {
    headers['x-bulen-peer-id'] = config.validatorAddress || config.nodeId;
    headers['x-bulen-peer-session'] = peerSession.token;
    headers['x-bulen-peer-nonce'] = peerSession.nonce;
  }
  return headers;
}

async function broadcastTransaction(context, transaction) {
  const { config } = context;
  const protocol = protocolForPeer(config);
  const peers = selectPeers(context);
  const tasks = peers.map(async (peer) => {
    try {
      const session = await ensureHandshake(context, peer);
      const headers = authHeaders(config, session);
      await discoverPeers(context, peer, session);
      await postJson(
        `${protocol}://${peer}/p2p/tx`,
        { transaction },
        headers,
        tlsOptions(config),
      );
      recordPeerObservation(context, peer, true);
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
        if (!config.p2pToken && context.identity) {
          const payloadString = JSON.stringify({
            type: packet.type,
            chainId: packet.chainId,
            peerId: packet.peerId,
            nonce: packet.nonce,
            payload: transaction,
          });
          packet.publicKey = context.identity.publicKeyPem;
          packet.signature = signPayload(context.identity.privateKeyPem, payloadString);
        }
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
      recordPeerObservation(context, peer, false);
    }
  });
  await Promise.all(tasks);
}

async function broadcastBlock(context, block) {
  const { config } = context;
  const protocol = protocolForPeer(config);
  const peers = selectPeers(context);
  const tasks = peers.map(async (peer) => {
    try {
      const session = await ensureHandshake(context, peer);
      const headers = authHeaders(config, session);
      await discoverPeers(context, peer, session);
      const res = await postJson(
        `${protocol}://${peer}/p2p/block`,
        { block },
        headers,
        tlsOptions(config),
      );
      if (!res || res.status >= 300) {
        const reason = res && res.body && res.body.error ? res.body.error : `status ${res && res.status}`;
        throw new Error(`Peer rejected block: ${reason}`);
      }
      recordPeerObservation(context, peer, true);
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
        if (!config.p2pToken && context.identity) {
          const payloadString = JSON.stringify({
            type: packet.type,
            chainId: packet.chainId,
            peerId: packet.peerId,
            nonce: packet.nonce,
            payload: block,
          });
          packet.publicKey = context.identity.publicKeyPem;
          packet.signature = signPayload(context.identity.privateKeyPem, payloadString);
        }
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
      recordPeerObservation(context, peer, false);
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
        if (!packet.signature || !packet.publicKey) {
          return;
        }
        const payload = JSON.stringify({
          type: packet.type,
          chainId: packet.chainId,
          peerId: packet.peerId,
          nonce: packet.nonce,
          payload: packet.payload,
        });
        const ok = require('./identity').verifyPayload(packet.publicKey, payload, packet.signature);
        if (!ok) {
          return;
        }
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
    const peers = Array.isArray(result.body.peers) ? result.body.peers : [];
    for (const candidate of peers) {
      if (!context.peerBook.has(candidate)) {
        context.peerBook.set(candidate, { score: 0, lastSeen: Date.now() });
      }
    }
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
  loadPeerBook,
  persistPeerBook,
  recordPeerObservation,
  selectPeers,
};
