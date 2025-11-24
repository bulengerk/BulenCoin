# Contributing to BulenCoin

Thank you for your interest in contributing to BulenCoin. This repository contains the
protocol specification, a multilingual website, and prototype infrastructure services
(BulenNode, explorer, status aggregator).

This document describes how to set up your environment, run tests and propose changes in a
way that keeps the project maintainable and safe.

## Environment and prerequisites

- Node.js 18 or newer (LTS recommended).
- npm (bundled with Node).
- Git for version control.

Optional:

- Docker and docker-compose for container-based setups.
- A Linux server or Raspberry Pi for real-world node experiments.

## Project structure

- `docs/` – specifications, deployment guides, legal and security notes.
- `bulennode/` – prototype BulenNode implementation (HTTP/P2P node), tests live in
  `bulennode/test`.
- `explorer/` – block explorer.
- `status/` – status aggregation service for multiple nodes.
- `scripts/` – installation helpers and example systemd units.

## Setup and tests

Install dependencies and run tests for BulenNode:

```bash
cd bulennode
npm install
node --test
```

For explorer and status services:

```bash
cd explorer
npm install

cd ../status
npm install
```

You can spin up the full stack using Docker:

```bash
docker-compose up --build
```

Then visit:

- Node API: `http://localhost:4100/api/status`
- Explorer: `http://localhost:4200`
- Status service: `http://localhost:4300`

Full-stack smoke test (launches BulenNode + Explorer + Status together on test ports):

```bash
node --test scripts/tests/full_stack_smoke.test.js
```

Security guardrails test (signatures required, P2P token, rate limiter):

```bash
node --test scripts/tests/security_guardrails.test.js
```

## Coding guidelines

- Prefer simple, readable code over premature optimisation.
- Keep configuration in environment variables or configuration files – do not hardcode
  secrets or environment-specific values.
- When modifying BulenNode:
  - keep the HTTP API and P2P headers backwards compatible where possible,
  - update or add tests in `bulennode/test`,
  - ensure `node --test` passes.
- When changing protocol-level behaviour, reflect it in `docs/bulencoin_spec_pl.md` and,
  where relevant, `docs/overview_en.md`.

## Security and privacy

- Never commit private keys, seed phrases, secret tokens or real user data.
- If you believe you have found a security issue:
  - do **not** create a public GitHub issue with sensitive details,
  - contact the maintainers privately (see `SECURITY.md` for guidance),
  - provide minimal reproducible steps and version information.
- Follow the recommendations in `docs/security_hardening_pl.md` when describing or
  proposing deployment setups.

## Submitting changes

1. Fork the repository and create a feature branch.
2. Make your changes in small, focused commits with clear messages.
3. Update documentation and tests alongside code changes.
4. Ensure:
   - `node --test` passes in `bulennode/`,
   - the services (`bulennode`, `explorer`, `status`) start successfully.
5. Open a pull request describing:
   - what problem is solved,
   - what parts of the codebase are affected,
   - how you validated the change (tests, manual steps).

By contributing, you agree that your contributions may be licensed under the project’s
future open-source license (to be chosen by the project owners).
