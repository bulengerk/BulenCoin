# BulenCoin – rewards parameters (prototype & mainnet intent)

This document summarises how rewards are computed in the prototype client and how we expect to handle parameters when the product matures. It is **not** a promise of profit; values are subject to change via governance/release notes.

## Prototype (Node.js) knobs

- Base uptime reward: `BULEN_BASE_UPTIME_REWARD` (default: `1` unit/hour).  
- Profile weights: `server-full=1.0`, `gateway=0.9`, `desktop-full=0.8`, `raspberry=0.75`, `mobile-light=0.5`, `tablet-light=0.6`, `phone-superlight=0.35`.  
- Device boosts (defaults): `phone=1.15`, `tablet=1.1`, `raspberry=1.12`.  
- Loyalty boosts: 30d `1.05`, 180d `1.10`, 365d `1.20`, 730d `1.35`, 1825d `1.50`.  
- Stake multiplier: `stakeWeight = min(3, 1 + stake/10000)`.

Protocol-reward splits (prototype defaults, guarded by `enableProtocolRewards`):
- Block reward: `BULEN_BLOCK_REWARD` (dev default 0, prod default 10).  
- Fee splits: burn `0.3`, ecosystem `0.1`, producer `0.4`, stakers remainder.

## Mainnet intent (subject to governance)

- Publish a public parameter file per release (JSON + checksums): base reward, profile weights, loyalty steps, fee/burn splits, min versions.  
- Version gating: clients warn on protocol mismatch; minimum supported version announced ahead of time.  
- Adjustment policy: only within narrow bands, on a schedule, with changelog + signed release notes.  
- Diversity goal: keep mobile/ARM profiles viable via weighting/boosts, but cap max advantage to avoid gaming.  
- Uptime focus: rewards favour consistent availability (with signed health samples); slash/penalise double-sign/faults where applicable.

## Transparency & safety

- No guaranteed returns. Rewards depend on network usage, parameters, stake, uptime and honest operation.  
- Snapshots/checkpoints should be signed to prevent tampering; parameters should be published with hashes.  
- Telemetry (rewards-hub) is opt-in and must be documented with clear privacy posture.

## Where to see current values

- Running node: `GET /api/status` (fields: `rewardWeight`, `rewardProjection`, `baseUptimeRewardPerHour`).  
- Config overrides: environment variables in `bulennode/src/config.js`.  
- Release notes: upcoming releases should include the parameter JSON + checksum.
