# Changelog

## Unreleased

- Added signed checkpoints with snapshot hash validation, peer reputation persistence, and security counters (invalid signatures/rejected P2P).
- Expanded test suite (+30%): P2P block signing, checkpoint API, backpressure 503, peer scoring/persistency, monetary/chainId/state checksum cases, stricter fork/equivocation tests.
- Localnet tooling: docker-compose for 2-node demo and TLS variant (handshake + self-signed certs).
- Observability: Prometheus metrics doc and starter Grafana dashboard JSON.
- CI: GitHub Actions with Node 18/20 matrix for BulenNode plus explorer lint/test; `scripts/ci.sh` helper.
- Explorer: added ESLint/Prettier config and formatting; lint+test wired into CI.
