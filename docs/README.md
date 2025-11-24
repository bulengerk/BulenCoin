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
- `testing_strategy.md` – test levels (service, full-stack smoke, Docker) and how to run
  them locally.

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

If you add new documentation files, please link them here to keep the documentation
navigable for future contributors and operators.
