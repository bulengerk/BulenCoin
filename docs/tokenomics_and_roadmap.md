# BulenCoin tokenomics and roadmap

## Assumptions
- Lightweight chain usable on end-user devices, with real economic motivation for operators.
- Transparent inflation and reward distribution.
- Simple, tunable parameters (adjustable on testnet without protocol changes).

## Emission and rewards
- Inflation proposal: 8% year 1 → 6% year 2 → 4% year 3 → 2.5% year 4 → 1.5% year 5+; decay can be tuned within an approved band.
- Base block reward (`BULEN_BLOCK_REWARD`, default 10 in `BULEN_SECURITY_PRESET=strict`, 0 in dev) goes to the block producer.
- Uptime/loyalty currently simulated locally (calculator in `/api/status`); planned on-chain once parameters stabilise.
- Reward distribution is **fully autonomous** when `BULEN_ENABLE_PROTOCOL_REWARDS=true`—each block splits fees and base reward without admin actions.

## Transaction fees (fee burn)
- Prototype split: 30% burn (`BULEN_FEE_BURN_FRACTION=0.3`), 10% ecosystem pool (`BULEN_FEE_ECOSYSTEM_FRACTION=0.1`), 60% validator pool.
- Validator pool split automatically: `BULEN_BLOCK_PRODUCER_FRACTION` (default 0.4) to producer, remainder proportional to stake across validators/delegators.
- All values are env-configurable; fractions must sum to ≤ 1.0.
- Burn totals, ecosystem pool, and block emission reported in `/api/status` (`monetary.*`) and `/metrics` (`bulen_fee_burned_total`, `bulen_ecosystem_pool`, `bulen_rewards_minted_total`, `bulen_block_reward`).

## Slashing and penalties
- Equivocation (double-sign on same height): default `BULEN_SLASH_PENALTY=0.25` (25% stake) plus reputation drop.
- Penalties tracked in state and exported via `/metrics` (`bulen_slash_events_total`).

## Roadmap (proposed)
1. **Devnet** – rapid changes, faucet on by default, no finality guarantees.
2. **Public testnet** – `BULEN_SECURITY_PRESET=strict`, faucet disabled, signatures required, fixed P2P tokens, monitoring and dashboards; stabilise fee-burn/reward params.
3. **Audit** – review consensus/P2P/signing/tx validation, fuzzing, load tests.
4. **Mainnet** – freeze launch parameters (emission, fee burn, block reward); publish change policy and payout cadence.

## Production parameters quick start
```bash
export BULEN_SECURITY_PRESET=strict \
  BULEN_P2P_TOKEN="strong-shared-secret" \
  BULEN_STATUS_TOKEN="status-secret" \
  BULEN_METRICS_TOKEN="metrics-secret" \
  BULEN_ENABLE_PROTOCOL_REWARDS=true \
  BULEN_BLOCK_REWARD=10 \
  BULEN_FEE_BURN_FRACTION=0.3 \
  BULEN_FEE_ECOSYSTEM_FRACTION=0.1 \
  BULEN_BLOCK_PRODUCER_FRACTION=0.4 \
  BULEN_REQUIRE_SIGNATURES=true \
  BULEN_ENABLE_FAUCET=false
```
