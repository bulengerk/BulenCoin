# BulenCoin Documentation Index

This directory contains the main technical and operational documentation for the BulenCoin
project.

## Core specifications

- `bulencoin_spec_pl.md` – full protocol specification in Polish:
  - network architecture and node types,
  - consensus and reward model,
  - applications (BulenNode) and platform requirements,
  - setup phases (testnet → mainnet),
  - security considerations.
- `tokenomics_and_roadmap.md` – tokenomics, fee burn podział, slashing oraz plan (devnet → testnet → audyt → mainnet) wraz z parametrami konfiguracyjnymi.
- `whitesheet_investor_pl.md` (+ PDF: `whitesheet_investor_pl.pdf`) – investors’ view of
  the project: problem/solution fit, economics, roadmap, security and funding needs.
  Generate/update the PDF via `scripts/generate_whitesheet_pdf.py` (uses reportlab and
  system DejaVuSans fonts).

## Deployment and operations

- `deployment_guide.md` – detailed deployment guide (PL) for:
  - the static website,
  - prototype BulenNode, explorer and status service,
  - testnet/mainnet bootstrapping,
  - installation scripts and systemd units.
- `deployment_guide_en.md` – English companion summarising:
  - project components,
  - local and Docker-based setups,
  - security-related configuration,
  - high-level legal notes.
- `operator_runbook.md` – praktyczny runbook dla walidatorów/gateway: parametry bezpieczeństwa, start w trybie strict, obserwacja i alerty, kopie/przywracanie, twardnienie serwera.
- `testing_strategy.md` – test levels (service, full-stack smoke, Docker) and how to run
  them locally.
- `payment_integration.md` – payment and wallet integration API (invoice lifecycle, memo
  binding, signed-message wallet auth, production guardrails).
- `onboarding_quickstart.md` – 5-minute start for desktop/server/gateway/mobile light, wallet backup and safety checklist.
- `rewards_policy.md` – prototype reward parameters and mainnet adjustment policy (transparency, no guaranteed profit).

## Legal, security and overview

- `legal_compliance_pl.md` – high-level legal and regulatory considerations (PL):
  - MiCA/AML/RODO context at a conceptual level,
  - responsibilities of node operators,
  - disclaimer that this is not legal advice.
- `security_hardening_pl.md` – security and hardening recommendations (PL):
  - OS-level setup and user separation,
  - API/P2P configuration, logging, and RODO-friendly practices,
  - networking, TLS, firewall and monitoring guidance.
- `overview_en.md` – technical overview in English:
  - goals and design philosophy,
  - consensus and reward model summary,
  - node types and prototype implementation scope.
- `dev_cookbook.md` – quick integration recipes (payments, paywall, reward calc) with Node/Go/Python snippets and SDK pointers.

If you add new documentation files, please link them here to keep the documentation
navigable for future contributors and operators.
