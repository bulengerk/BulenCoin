/* eslint-disable no-console */
const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

function spawnNode(env) {
  return spawn('node', ['src/index.js'], {
    cwd: path.join(ROOT, 'bulennode'),
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

test('production config rejects single-validator certificates', async () => {
  const proc = spawnNode({
    NODE_ENV: 'production',
    BULEN_HTTP_PORT: '7310',
    BULEN_P2P_PORT: '7311',
    BULEN_DATA_DIR: path.join(ROOT, 'data', 'config-enforce'),
    BULEN_NODE_ID: 'enforce-node',
    BULEN_REQUIRE_SIGNATURES: 'true',
    BULEN_P2P_REQUIRE_HANDSHAKE: 'true',
    BULEN_P2P_REQUIRE_TLS: 'false',
    BULEN_STATUS_TOKEN: 'status-token',
    BULEN_METRICS_TOKEN: 'metrics-token',
    BULEN_WEBHOOK_SECRET: 'webhook-secret',
    BULEN_ALLOW_UNSIGNED_BLOCKS: 'false',
    BULEN_ALLOW_EMPTY_BLOCKS: 'true',
    BULEN_ALLOW_SINGLE_VALIDATOR_CERT: 'true',
    BULEN_ENABLE_FAUCET: 'false',
  });

  let stderr = '';
  proc.stderr.on('data', (buf) => { stderr += buf.toString(); });

  const exitCode = await new Promise((resolve) => {
    proc.on('exit', (code) => resolve(code));
    setTimeout(() => proc.kill(), 5000);
  });

  assert.notStrictEqual(exitCode, 0, 'process should exit with error');
  assert.match(stderr, /full committee certificates/i);
});
