const test = require('node:test');
const assert = require('node:assert');

const {
  createGenesisBlock,
  createBlock,
  applyBlock,
  validateTransaction,
  ensureAccount,
  getLastBlock,
} = require('../src/chain');

function createTestState() {
  return {
    chainId: 'bulencoin-devnet-1',
    blocks: [],
    accounts: {},
  };
}

test('createGenesisBlock initializes first block', () => {
  const config = { chainId: 'bulencoin-devnet-1' };
  const state = createTestState();
  createGenesisBlock(config, state);
  assert.strictEqual(state.blocks.length, 1);
  const genesis = state.blocks[0];
  assert.strictEqual(genesis.index, 0);
  assert.strictEqual(genesis.previousHash, null);
  assert.strictEqual(genesis.validator, 'genesis');
});

test('createBlock and applyBlock append a valid block', () => {
  const config = { chainId: 'bulencoin-devnet-1', nodeId: 'node-test' };
  const state = createTestState();
  createGenesisBlock(config, state);

  ensureAccount(state, 'alice').balance = 1000;
  const tx = { from: 'alice', to: 'bob', amount: 100, fee: 1, nonce: 1 };

  const validation = validateTransaction(state, tx);
  assert.ok(validation.ok, validation.reason);

  const block = createBlock(config, state, config.nodeId, [tx]);
  applyBlock(state, block);

  const last = getLastBlock(state);
  assert.strictEqual(last.index, 1);
  assert.strictEqual(state.accounts.alice.balance, 899);
  assert.strictEqual(state.accounts.bob.balance, 100);
  assert.strictEqual(state.accounts.alice.nonce, 1);
});

test('validateTransaction rejects insufficient balance and bad nonce', () => {
  const state = createTestState();
  ensureAccount(state, 'alice').balance = 50;

  let result = validateTransaction(state, {
    from: 'alice',
    to: 'bob',
    amount: 60,
    fee: 0,
  });
  assert.ok(!result.ok);

  const account = ensureAccount(state, 'alice');
  account.balance = 100;
  account.nonce = 5;

  result = validateTransaction(state, {
    from: 'alice',
    to: 'bob',
    amount: 10,
    fee: 0,
    nonce: 5,
  });
  assert.ok(!result.ok);
});

