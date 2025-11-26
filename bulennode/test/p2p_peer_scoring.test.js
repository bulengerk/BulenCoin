const test = require('node:test');
const assert = require('node:assert');

const { recordPeerObservation, loadPeerBook, persistPeerBook, selectPeers } = require('../src/p2p');

function createContext(peers = [], peerBookEntries = []) {
  const config = {
    peers,
    p2pFanout: peers.length || 4,
    p2pMaxPeers: 8,
    dataDir: require('os').tmpdir(),
    chainId: 'bulencoin-devnet-1',
  };
  const peerBook = new Map(peerBookEntries.map(({ peer, score, lastSeen }) => [peer, { score, lastSeen }]));
  const context = { config, peerBook };
  return { config, context };
}

test('peer scoring increases for successful observations and influences selection', () => {
  const { context } = createContext(['p1:1234', 'p2:1234'], [
    { peer: 'p3:1234', score: 5, lastSeen: Date.now() - 1000 },
    { peer: 'p4:1234', score: 1, lastSeen: Date.now() - 1000 },
  ]);

  recordPeerObservation(context, 'p4:1234', true);
  recordPeerObservation(context, 'p4:1234', true);
  recordPeerObservation(context, 'p3:1234', false);
  recordPeerObservation(context, 'p3:1234', false);
  recordPeerObservation(context, 'p3:1234', false); // drop p3 below p4

  const peers = selectPeers(context);
  // Highest score should come first
  assert.strictEqual(peers[0], 'p4:1234');
  assert.ok(peers.includes('p3:1234'));
  assert.strictEqual(peers.length, 2);
});

test('peer book persists and loads from disk', () => {
  const os = require('os');
  const path = require('path');
  const fs = require('fs');
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bulen-peerbook-'));
  const config = { dataDir, chainId: 'bulencoin-devnet-1' };
  const peerBook = new Map();
  const context = { config, peerBook };

  recordPeerObservation(context, 'persisted:4101', true);
  persistPeerBook(context);

  const loaded = loadPeerBook(config);
  assert.ok(loaded.has('persisted:4101'));
  const meta = loaded.get('persisted:4101');
  assert.ok(meta.score >= 1);
});
