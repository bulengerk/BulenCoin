# BulenCoin Documentation Index

This directory holds the technical and operational documentation for the BulenCoin project.

## Core specifications

- `bulencoin_spec_pl.md` – full protocol specification (now in English) covering network architecture, node types, consensus, rewards, applications and rollout phases.
- `tokenomics_and_roadmap.md` – tokenomics, fee-burn split, slashing, phased roadmap (devnet → testnet → audit → mainnet) and configurable parameters.
- `whitesheet_investor_pl.md` – investor-facing view of the project (problem/solution fit, economics, roadmap, security, funding needs) with instructions to regenerate the PDF via `scripts/generate_whitesheet_pdf.py`.

## Deployment and operations

- `deployment_guide.md` – detailed deployment guide for the static site, BulenNode prototype, explorer, status service, testnet/mainnet bootstrapping, install scripts and systemd units.
- `deployment_guide_en.md` – concise English companion for quick setups, Docker usage and security configuration.
- `operator_runbook.md` – practical runbook for validators/gateways: security parameters, strict mode, observability/alerts, backups, hardening.
- `testing_strategy.md` – service/full-stack/Docker test levels and how to run them locally.
- `payment_integration.md` – payment and wallet API (invoice lifecycle, memo binding, signed-message auth, prod guardrails).
- `onboarding_quickstart.md` – 5-minute start for desktop/server/gateway/mobile-light with wallet backup checklist.
- `rewards_policy.md` – prototype reward parameters and guidance for mainnet adjustments (transparency, no guaranteed profit).

## Legal, security and overview

- `legal_compliance_pl.md` – high-level legal and regulatory considerations (now in English): MiCA/AML/GDPR context, operator responsibilities, disclaimer.
- `security_hardening_pl.md` – security and hardening checklist (now in English): OS setup, API/P2P configuration, logging/privacy, networking, TLS, firewall, monitoring.
- `overview_en.md` – technical overview in English: goals and design philosophy, consensus and rewards, node types, prototype scope.
- `dev_cookbook.md` – quick integration recipes (payments, paywall, reward calculator) with Node/Go/Python snippets and SDK pointers.

## Operations and production

- `prod_manifests.md` – production topology sketch (validators/gateways/sentries, reverse proxy, monitoring).
- `feasibility_min_hardware.md` – realistic minimum hardware analysis for pilot/testnet and small production footprint.
- `metrics.md` – available Prometheus metrics and dashboards.
- `downloads.md` – where to fetch artifacts/binaries.
- `grafana-dashboard.json` – Grafana dashboard for Bulen metrics.

If you add new documentation, link it here so it remains discoverable for future contributors and operators.
