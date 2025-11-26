# BulenCoin – investor whitesheet

This document summarizes BulenCoin from an investor perspective: problem, product, market, economics, security, and rollout plan.

## At a glance

- **Goal:** prove a full PoS network can run on common devices (phones, laptops, servers) with predictable uptime rewards.
- **Product:** BulenNode client (mobile, desktop, gateway), block explorer, status page, installers/systemd units.
- **State:** working prototype (HTTP API, block production, simple uptime reward), complete technical/security docs, multilingual website.
- **Model:** inflationary base reward + transaction fees + explicit uptime reward; preference for lower-cost devices to keep hardware diversity.
- **Roadmap:** public testnet → bootstrap mainnet with mixed node set → gradual decentralization of validator committees.
- **Needs:** funding for full client, mobile/desktop UX, security audits, and testnet bootstrap infra.

## Problem

Most L1s need expensive hardware or centralised RPC providers. Users who want to support the network face energy/disk costs and operational overhead, driving centralisation and high entry barriers.

## Value proposition

- **Uptime as a product:** network rewards real availability on typical devices, not just stake.
- **Lightweight client:** one codebase runs on phones, laptops, servers; profiles tune ports/limits/faucet.
- **User experience:** night/Wi‑Fi-only modes on mobile, disk caps on desktop, installers and systemd on servers.
- **Predictable cost:** energy-efficient PoS, small committees, no GPU/ASIC.

## Product and architecture

- **BulenNode:** modular client (networking, PoS consensus, storage, wallet, resource monitor) with HTTP-based P2P, ECDSA signatures, and reputation.
- **Device profiles:** `mobile-light`, `desktop-full`, `server-full`, `raspberry`, `gateway` with distinct ports, reward weights, faucet defaults.
- **Data layer:** headers + account state + mempool; blocks carry txs with fees and validator stake.
- **Web stack:** explorer, status page, static multilingual site, install scripts, Docker images.
- **Security:** JSON body limits, optional signature requirement, P2P token, rate limiting, hardening tips in `docs/security_hardening_pl.md` (now English).

## Economic model

- **Reward sources:** inflationary block reward + fees + explicit uptime reward calibrated per device class.
- **Reputation/diversity:** under-represented profiles (e.g., phones) get a small selection boost to keep a heterogeneous network.
- **Slashing:** penalties for double-signing and misbehaviour; lower reputation reduces committee selection odds.
- **Delegation:** mobile users can delegate stake to full validators while keeping a simplified UX.

## Market and use cases

- **Segments:** crypto enthusiasts with always-on devices, owners of older phones/SBCs, small-server operators, integrators needing a light PoS network.
- **Use cases:** micropayments, APIs for games/mobile apps, educational PoS deployments, research on hardware diversity.

## Go-to-market

- **Open testnet:** fast client distribution with faucet, uptime-reward program, leaderboard.
- **Hardware partners:** images for Raspberry Pi/mini-servers; desktop installers and mobile packages.
- **Community:** docs in English/Spanish/Polish on the site, simple onboarding, education on key safety.
- **Ecosystem:** early APIs for external wallets/exchanges, ready gateway node.

## Operational roadmap

1. **Phase 0 – prototype (done):** HTTP API, block production, explorer/status, docs, website.
2. **Phase 1 – public testnet:** security audits, privacy-minimal telemetry, mobile/desktop push, uptime rewards program.
3. **Phase 2 – bootstrap mainnet:** mixed team/community nodes, constrained centralisation parameters, stake delegation.
4. **Phase 3 – decentralisation:** reduce team node share, expand validator committees, governance over reward params.

## Security and compliance

- **Operational:** user separation, firewall/TLS, request limits, origin control (CORS).
- **Legal:** MiCA/AML/GDPR concepts covered in `docs/legal_compliance_pl.md`; clear warning that the project is experimental.
- **Privacy:** telemetry off by default; future versions to use user consent and data minimisation.

## Funding and use of proceeds

- **Product (40%):** full client (storage, consensus, networking), mobile/desktop apps, UX, code audits.
- **Infrastructure (25%):** testnet/mainnet bootstrap, monitoring, CDN for binaries, CI and integration testing.
- **Security and compliance (20%):** external audits, SDLC processes, legal consultations.
- **Ecosystem/community (15%):** grants for integrators, hackathons, educational material.

## Key KPIs

- Active nodes in testnet/mainnet by device class.
- Average uptime and block finality time.
- Share of community validators producing blocks (decentralisation).
- Transaction volume and count of API/gateway integrations.

## Call to action

We seek financial/technical partners for testnet → mainnet bootstrap. Ready for audits and pilots on partner hardware. Contact: core@bulencoin.example (temporary alias for investor coordination).
