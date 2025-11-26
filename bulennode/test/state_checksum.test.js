const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { saveState, loadState } = require('../src/storage');

test('state file stores checksum and loadState strips it', () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bulen-state-'));
  const config = { dataDir, chainId: 'bulencoin-devnet-1' };
  const state = {
    chainId: config.chainId,
    blocks: [],
    accounts: {},
    feeBurnedTotal: 0,
    ecosystemPool: 0,
    mintedRewardsTotal: 0,
  };

  saveState(config, state);
  const raw = JSON.parse(fs.readFileSync(path.join(dataDir, 'state.json'), 'utf8'));
  assert.ok(raw._checksum, 'Expected checksum present in state file');

  const loaded = loadState(config);
  assert.strictEqual(loaded._checksum, undefined, 'Checksum should not leak into loaded state');
});
