const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function loadConfig(env) {
  const result = spawnSync(
    'node',
    [
      '-e',
      `
      const config = require('${path.join(__dirname, '..', 'src', 'config.js').replace(/\\/g, '\\\\')}');
      console.log(JSON.stringify({ requireSignatures: config.requireSignatures, enableFaucet: config.enableFaucet, p2pToken: config.p2pToken }));
    `,
    ],
    {
      env,
      encoding: 'utf-8',
    },
  );
  if (result.status !== 0) {
    throw new Error(`Config loader failed: ${result.stderr}`);
  }
  return JSON.parse(result.stdout.trim());
}

test('production defaults enforce signatures and disable faucet', () => {
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    BULEN_P2P_TOKEN: 'token-test',
  };
  const cfg = loadConfig(env);
  assert.strictEqual(cfg.requireSignatures, true);
  assert.strictEqual(cfg.enableFaucet, false);
});

test('development defaults keep faucet/profile behaviour', () => {
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    BULEN_P2P_TOKEN: '',
  };
  const cfg = loadConfig(env);
  assert.strictEqual(cfg.requireSignatures, false);
});

test('startup fails in production when guardrails are missing', () => {
  const result = spawnSync(
    'node',
    [path.join(__dirname, '..', 'src', 'index.js')],
    {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        BULEN_HTTP_PORT: '0',
        BULEN_P2P_PORT: '0',
        BULEN_ENABLE_FAUCET: 'true',
        BULEN_REQUIRE_SIGNATURES: 'false',
      },
      encoding: 'utf-8',
    },
  );
  assert.notStrictEqual(result.status, 0, 'Expected process to exit non-zero');
  assert.match(result.stderr || '', /requires BULEN_REQUIRE_SIGNATURES/i);
});
