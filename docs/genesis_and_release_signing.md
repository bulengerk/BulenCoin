# Deterministic genesis, snapshot hash, and release signing

This doc describes how to produce a reproducible genesis (fixed validator keys + stakes), verify the snapshot hash, and publish signed checksums for a release.

## Deterministic genesis for dev/test

We ship three **dev/test-only** validator keys in `scripts/genesis/validators/validator{1,2,3}.pem`. They are not suitable for production but allow deterministic genesis/snapshot reproduction for CI and staging.

To generate the genesis metadata and snapshot hash offline:

```bash
# optional: export CHAIN_ID=bulencoin-deterministic-1
node scripts/genesis/generate_deterministic_snapshot.js
```

Output is written to `scripts/genesis/deterministic_snapshot.json` and printed as:

- `BULEN_GENESIS_VALIDATORS="addr_50b2...:1000,addr_717f...:1000,addr_824e...:1000"`
- `snapshotHash=929bf54ad046a45264447cd494e62d0e4ea3d46ccbafcaa4ff654643c5db89d9`

To start a 3-node deterministic cluster locally (example):

```bash
GENESIS="addr_50b2ca973e0626d7000cacecc36f3b383765b453:1000,addr_717f068b5d541fc33b4c0084378393ca7533e44e:1000,addr_824e72cfb70724791df13e1a6a21b7805cfb8b8c3:1000"

# node1
BULEN_NODE_PRIVATE_KEY=$(cat scripts/genesis/validators/validator1.pem) \
BULEN_GENESIS_VALIDATORS="$GENESIS" \
BULEN_HTTP_PORT=7010 BULEN_P2P_PORT=7011 BULEN_NODE_ID=val1 \
BULEN_ALLOW_UNSIGNED_BLOCKS=false BULEN_REQUIRE_SIGNATURES=true \
node bulennode/src/index.js
# node2/node3: swap validatorN.pem and ports/node IDs
```

After first block, check the snapshot hash:

```bash
curl -H "x-bulen-status-token: bulen-status" http://127.0.0.1:7010/api/status | jq .checkpoint.snapshotHash
# expect: 929bf54ad046a45264447cd494e62d0e4ea3d46ccbafcaa4ff654643c5db89d9
```

## Release checksums and signatures (recommended)

1) Build artifacts (binaries, zip/tarballs) into `dist/` or your release folder.  
2) Generate SHA256 sums:

```bash
cd dist
sha256sum * > SHA256SUMS
```

3) Sign the checksum file with a release key (GPG example):

```bash
gpg --detach-sign --armor --output SHA256SUMS.asc SHA256SUMS
```

4) Publish `SHA256SUMS` and `SHA256SUMS.asc` alongside the release artifacts.  
5) Document the expected `snapshotHash` and `BULEN_GENESIS_VALIDATORS` in the release notes so operators can verify:

- Compare `SHA256SUMS` with `sha256sum` locally.
- Verify signature: `gpg --verify SHA256SUMS.asc SHA256SUMS`.
- Start node(s) with the published `BULEN_GENESIS_VALIDATORS` and confirm `/api/status` → `checkpoint.snapshotHash` matches the published hash.

For production, generate validator keys securely (HSM/KMS), rotate keys per validator, and replace the dev PEMs with production keys. Only the deterministic process should remain the same: fixed validator set → published `BULEN_GENESIS_VALIDATORS` → reproducible snapshot hash → signed release checksums.
