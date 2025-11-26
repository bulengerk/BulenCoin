const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');

const { canonicalTransactionPayload, verifyTransactionSignature } = require('../src/security');

function signTx(privateKeyPem, tx, chainId) {
  const signer = crypto.createSign('sha256');
  signer.update(canonicalTransactionPayload(tx, chainId));
  signer.end();
  return signer.sign(privateKeyPem, 'base64');
}

test('transaction signature requires matching chainId', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });

  const config = { requireSignatures: true, chainId: 'bulencoin-devnet-1' };
  const account = { nonce: 0 };
  const baseTx = {
    from: `addr_${crypto.createHash('sha256').update(publicKeyPem).digest('hex').slice(0, 40)}`,
    to: 'bob',
    amount: 10,
    fee: 1,
    nonce: 1,
    action: 'transfer',
    chainId: config.chainId,
    publicKey: publicKeyPem,
  };

  const goodTx = {
    ...baseTx,
  };
  goodTx.signature = signTx(privateKeyPem, goodTx, config.chainId);
  const ok = verifyTransactionSignature(config, account, goodTx);
  assert.strictEqual(ok.ok, true, ok.reason);

  const badTx = { ...baseTx, chainId: 'other-chain' };
  badTx.signature = signTx(privateKeyPem, badTx, badTx.chainId);
  const bad = verifyTransactionSignature(config, account, badTx);
  assert.strictEqual(bad.ok, false);
  assert.match(bad.reason || '', /chainId/i);
});
