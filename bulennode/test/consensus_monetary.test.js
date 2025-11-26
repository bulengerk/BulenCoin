const test = require('node:test');
const assert = require('node:assert');

const { createGenesisBlock, createBlock, ensureAccount } = require('../src/chain');
const { ensureConsensusState, handleIncomingBlock } = require('../src/consensus');

function createContext() {
  const config = {
    chainId: 'bulencoin-devnet-1',
    nodeId: 'node-test',
    nodeRole: 'validator',
    protocolVersion: '1.0.0',
    protocolMajor: 1,
    allowUnsignedBlocks: true,
    enableProtocolRewards: true,
    blockReward: 5,
    feeBurnFraction: 0.3,
    feeEcosystemFraction: 0.1,
    blockProducerRewardFraction: 0.4,
  };
  const state = {
    chainId: config.chainId,
    blocks: [],
    accounts: {},
  };
  createGenesisBlock(config, state);
  ensureConsensusState(state);
  return { config, state };
}

test('block with mismatched monetary summary is rejected', () => {
  const { config, state } = createContext();
  ensureAccount(state, config.nodeId).stake = 100;
  const txs = [{ from: 'alice', to: 'bob', amount: 10, fee: 4, nonce: 1 }];
  const block = createBlock(config, state, config.nodeId, txs);
  // Tamper with monetary summary to mismatch actual fees
  const badBlock = {
    ...block,
    monetary: { totalFees: 1, burned: 0, ecosystem: 0, minted: 5 },
  };
  const res = handleIncomingBlock({ config, state, mempool: [], payments: [] }, badBlock, {
    source: 'local',
  });
  assert.strictEqual(res.accepted, false);
  assert.match(res.reason || '', /monetary/i);
});

test('block with correct monetary summary is accepted', () => {
  const { config, state } = createContext();
  ensureAccount(state, config.nodeId).stake = 100;
  const txs = [{ from: 'alice', to: 'bob', amount: 10, fee: 4, nonce: 1 }];
  const block = createBlock(config, state, config.nodeId, txs);
  const res = handleIncomingBlock({ config, state, mempool: [], payments: [] }, block, {
    source: 'local',
  });
  assert.strictEqual(res.accepted, true, res.reason);
});
