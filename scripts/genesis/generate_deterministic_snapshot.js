#!/usr/bin/env node
// Generate deterministic genesis metadata (addresses, BULEN_GENESIS_VALIDATORS env string)
// and compute the snapshot hash using Bulen's genesis block + sorted accounts.
//
// Dev-only: uses static validator private keys under scripts/genesis/validators/*.pem
// so that test/dev networks can reproduce identical genesis and snapshot hashes.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const { deriveAddressFromPublicKey } = require('../../bulennode/src/identity');
const { computeSnapshotHash } = require('../../bulennode/src/storage');
const { createGenesisBlock } = require('../../bulennode/src/chain');

const ROOT = path.resolve(__dirname, '..', '..');
const VALIDATOR_DIR = path.join(ROOT, 'scripts', 'genesis', 'validators');
const OUTPUT = path.join(ROOT, 'scripts', 'genesis', 'deterministic_snapshot.json');

function loadValidators() {
  const files = fs.readdirSync(VALIDATOR_DIR).filter((f) => f.endsWith('.pem'));
  return files.map((file) => {
    const pem = fs.readFileSync(path.join(VALIDATOR_DIR, file), 'utf8');
    const publicKeyPem = crypto.createPublicKey(pem).export({ type: 'spki', format: 'pem' });
    const address = deriveAddressFromPublicKey(publicKeyPem);
    return {
      name: path.basename(file, '.pem'),
      pem,
      publicKeyPem,
      address,
      stake: 1000,
    };
  });
}

function buildSnapshot(chainId, validators) {
  const state = {
    chainId,
    blocks: [],
    accounts: {},
    feeBurnedTotal: 0,
    ecosystemPool: 0,
    mintedRewardsTotal: 0,
    checkpoints: [],
  };
  createGenesisBlock({ chainId }, state);
  for (const v of validators) {
    state.accounts[v.address] = { balance: 0, stake: v.stake, nonce: 0, reputation: 0 };
  }
  const snapshotHash = computeSnapshotHash({
    chainId: state.chainId,
    blocks: state.blocks,
    accounts: state.accounts,
    feeBurnedTotal: state.feeBurnedTotal,
    ecosystemPool: state.ecosystemPool,
    mintedRewardsTotal: state.mintedRewardsTotal,
  });
  return { state, snapshotHash };
}

function main() {
  const chainId = process.env.CHAIN_ID || 'bulencoin-deterministic-1';
  const validators = loadValidators();
  if (!validators.length) {
    console.error(`No validator PEMs found under ${VALIDATOR_DIR}`);
    process.exit(1);
  }
  const envString = validators.map((v) => `${v.address}:${v.stake}`).join(',');
  const { snapshotHash } = buildSnapshot(chainId, validators);
  const result = {
    chainId,
    validators: validators.map((v) => ({
      name: v.name,
      address: v.address,
      stake: v.stake,
    })),
    bulenGenesisValidators: envString,
    snapshotHash,
  };
  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
  console.log(
    [
      'Deterministic genesis prepared',
      `validators=${validators.length}`,
      `BULEN_GENESIS_VALIDATORS="${envString}"`,
      `snapshotHash=${snapshotHash}`,
      `output=${OUTPUT}`,
    ].join(' | '),
  );
}

main();
