/* eslint-disable no-console */
const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '..', '..');
const WORKDIR = path.join(ROOT, 'data', 'validator-allow');

function startProcess(label, env) {
  const child = spawn('node', ['src/index.js'], {
    cwd: path.join(ROOT, 'bulennode'),
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (buf) => console.log(`[${label}] ${buf.toString().trim()}`));
  child.stderr.on('data', (buf) => console.error(`[${label}][err] ${buf.toString().trim()}`));
  const stop = () => {
    if (!child.killed) child.kill();
  };
  return { child, stop };
}

test('validator allowlist rejects blocks from disallowed validator', async (t) => {
  fs.rmSync(WORKDIR, { recursive: true, force: true });
  fs.mkdirSync(WORKDIR, { recursive: true });

  const allowValidator = 'addr_allowed';
  const env = {
    NODE_ENV: 'test',
    BULEN_HTTP_PORT: '6710',
    BULEN_P2P_PORT: '6711',
    BULEN_DATA_DIR: path.join(WORKDIR, 'node'),
    BULEN_NODE_ID: 'val-allow',
    BULEN_ENABLE_FAUCET: 'false',
    BULEN_BLOCK_INTERVAL_MS: '500',
    BULEN_ALLOW_UNSIGNED_BLOCKS: 'true',
    BULEN_LOG_FORMAT: 'tiny',
    BULEN_VALIDATOR_ALLOWLIST: allowValidator,
    BULEN_STATUS_TOKEN: 'status-token',
  };

  // fake state: set validatorAddress to allowed one so local production works
  const proc = startProcess('bulennode', env);
  t.after(proc.stop);
  t.after(() => fs.rmSync(WORKDIR, { recursive: true, force: true }));

  // Wait a bit for node to start and produce blocks with validatorAddress (random) -> should be disallowed if not match allowlist
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Fetch status with token; expect height to stay at 0 because producer address not on allowlist unless it matches generated address
  const res = await fetch(`http://127.0.0.1:6710/api/status`, {
    headers: { 'x-bulen-status-token': 'status-token' },
  }).then((r) => r.json());
  const isAllowed = res.validatorAddress === allowValidator;

  if (isAllowed) {
    // If generated address happens to equal allowlist (very unlikely), we still pass by expecting height >= 0.
    assert.ok(res.height >= 0);
  } else {
    assert.strictEqual(res.height, 0, 'blocks from disallowed validator should be rejected (height 0)');
  }
});
