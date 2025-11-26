# Security Policy for BulenCoin

This repository contains experimental code and documentation for the BulenCoin protocol
and prototype infrastructure services. While every effort is made to handle data and
network interactions safely, the project is not yet a hardened production system.

## Reporting a vulnerability

If you believe you have found a security issue in:

- the BulenNode implementation (`bulennode/`),
- the explorer (`explorer/`),
- the status service (`status/`),
- or any deployment scripts and documentation,

please **do not** open a public issue with full details.

Instead:

1. Prepare a short, clear description including:
   - affected component(s),
   - observed behaviour and impact,
   - minimal steps to reproduce,
   - environment information (OS, Node.js version, commit hash).
2. Contact the maintainers privately through the channel agreed for this project (e.g. via
   e-mail or a private issue in a dedicated security repository).

If you are unsure which contact channel to use, document the issue locally and wait until a
contact address is published by the project owners. Do not publish sensitive details
publicly without explicit consent.

## Handling of reports

While this repository does not yet operate a formal security response process, the goal is
to:

- acknowledge receipt of your report,
- validate the issue,
- prepare a fix or mitigation,
- coordinate publication of details, if appropriate.

## Hardening guidance

Operators and integrators should follow the recommendations in:

- `docs/security_hardening_pl.md` – hardening and logging guidelines,
- `docs/legal_compliance_pl.md` – high-level legal/compliance notes (PL),
- `docs/deployment_guide.md` – operational deployment patterns (PL).

The BulenCoin prototype does **not** enable telemetry by default and does not collect
personal data beyond what is needed for HTTP/P2P communication. It is your responsibility
to deploy additional services (logging, monitoring, analytics) in a way that complies with
local law (including GDPR/RODO where applicable).

## Pre-publication hygiene

- Scrub local state before packaging or publishing: remove `data/` and `.venv/` (`rm -rf data .venv`). These directories are gitignored but can be accidentally bundled in archives.
- Treat previously present keys as compromised: the former `data/desktop-full/node_key.pem` has been deleted. Generate fresh node keys outside the repo, e.g.:
  - `mkdir -p ~/.bulencoin/keys && chmod 700 ~/.bulencoin/keys`
  - `openssl ecparam -name prime256v1 -genkey -noout -out ~/.bulencoin/keys/node_key.pem`
  - `chmod 600 ~/.bulencoin/keys/node_key.pem`
- Rotate any dev tokens or sample secrets (P2P/status/metrics/webhook/rewards) to production-only values provided via environment variables, never committed.
- Run a secret scan (e.g. `gitleaks detect --no-git --source .`) before releasing artifacts to ensure no tokens or private keys remain.
