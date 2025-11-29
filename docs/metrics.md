# Metrics (BulenNode)

Prometheus-format metrics are exposed at `/metrics` (optionally protected by `BULEN_METRICS_TOKEN`). Labels include `chain_id`, `node_id`, `role`, `profile`, `device_class`.

Key series:

- `bulen_node_info` – node info (with protocol_version label).
- `bulen_blocks_height`, `bulen_blocks_finalized_height`, `bulen_blocks_total` – chain height stats.
- `bulen_chain_weight` – current best chain weight (stake-weighted fork choice).
- `bulen_mempool_size` – current mempool size.
- `bulen_accounts_total`, `bulen_total_stake` – state size and total stake.
- `bulen_uptime_seconds`, `bulen_blocks_produced` – uptime and produced blocks counters.
- Reward estimates/projection: `bulen_reward_estimate_hourly`, `bulen_reward_estimate_total`, `bulen_reward_projection_weekly`, `bulen_loyalty_boost`, `bulen_device_boost`.
- Monetary totals: `bulen_fee_burned_total`, `bulen_ecosystem_pool`, `bulen_rewards_minted_total`, `bulen_block_reward`, `bulen_protocol_rewards_enabled`, `bulen_block_producer_fraction`, `bulen_fee_burn_fraction`, `bulen_fee_ecosystem_fraction`.
- Payments: `bulen_payments_total`, `bulen_payments_pending`.
- Security counters: `bulen_security_invalid_signatures_total`, `bulen_security_p2p_rejected_total`.
- Config knobs: `bulen_config_rate_limit_window_ms`, `bulen_config_rate_limit_max_requests`, `bulen_protocol_major`, `bulen_reward_weight`.

Usage:

```bash
curl -H "x-bulen-metrics-token: $BULEN_METRICS_TOKEN" http://localhost:4100/metrics
```

For Grafana, add a Prometheus data source scraping `/metrics` and plot the series above; the labels allow filtering per chain/node/profile.

Alerting rules: see `docs/prometheus_alerts.yml` for starter Alertmanager/Prometheus rules covering stalled height/finality, low peers and elevated 5xx/429.

Sample dashboard: see `docs/grafana-dashboard.json` for a starter layout (height/finality, mempool size, total stake, security counters).
