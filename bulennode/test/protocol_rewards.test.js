const test = require('node:test');
const assert = require('node:assert');

const {
  createGenesisBlock,
  createBlock,
  applyBlock,
  ensureAccount,
} = require('../src/chain');

function createState(chainId) {
  return {
    chainId,
    blocks: [],
    accounts: {},
    feeBurnedTotal: 0,
    ecosystemPool: 0,
    mintedRewardsTotal: 0,
  };
}

test('protocol rewards distribute fees, burns and block reward autonomously to stakers', () => {
  const config = {
    chainId: 'bulencoin-devnet-1',
    nodeId: 'validator-1',
    enableProtocolRewards: true,
    blockReward: 5,
    feeBurnFraction: 0.3,
    feeEcosystemFraction: 0.1,
    blockProducerRewardFraction: 0.4,
  };
  const state = createState(config.chainId);
  createGenesisBlock(config, state);

  const alice = ensureAccount(state, 'alice');
  alice.balance = 1000;
  const validator = ensureAccount(state, config.nodeId);
  validator.stake = 200;
  const delegator = ensureAccount(state, 'delegator');
  delegator.stake = 800;

  const tx1 = { from: 'alice', to: 'bob', amount: 100, fee: 4, nonce: 1 };
  const tx2 = { from: 'alice', to: 'carol', amount: 50, fee: 6, nonce: 2 };
  const block = createBlock(config, state, config.nodeId, [tx1, tx2]);

  applyBlock(config, state, block);

  assert.strictEqual(state.feeBurnedTotal, 3); // 30% of total fees (10)
  assert.strictEqual(state.ecosystemPool, 1); // 10% of total fees
  assert.strictEqual(state.mintedRewardsTotal, 5);

  const validatorBalance = state.accounts[config.nodeId].balance;
  const delegatorBalance = state.accounts.delegator.balance;
  // Reward pool = (fees validator share 6) + blockReward 5 = 11
  // Producer gets 40% = 4.4 plus stake-weighted share from remaining 6.6 (20%) = 1.32 -> total 5.72
  assert.ok(Math.abs(validatorBalance - 5.72) < 1e-6);
  // Delegator has 80% of stake -> 80% of 6.6 = 5.28
  assert.ok(Math.abs(delegatorBalance - 5.28) < 1e-6);

  assert.strictEqual(state.accounts.alice.balance, 1000 - (100 + 4) - (50 + 6));
  assert.strictEqual(state.accounts.bob.balance, 100);
  assert.strictEqual(state.accounts.carol.balance, 50);
});
