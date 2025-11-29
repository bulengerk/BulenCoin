# Local churn soak and HTTP load (Nov 29 2025)

- Cluster: 4 validators, chainId `bulencoin-soak`, `committeeSize=3`, `blockIntervalMs=800`, `allowSingleValidatorCert=true`, `allowEmptyBlocks=true`, tokens set for status/metrics/P2P.
- Command: `NODES=4 DURATION_SEC=50 CHURN_INTERVAL_SEC=10 RESTART_DELAY_SEC=3 BASE_HTTP_PORT=7610 COMMITTEE_SIZE=3 scripts/soak/soak_churn.sh`
- Result: four churn iterations executed; final summary (`scripts/soak/reports/soak_churn_summary_20251129T175240.json`) had val0 (height=0) and val1 (height=4) reachable, val2/val3 were restarting during the summary (ECONNREFUSED). Height advanced despite churn; finality stayed at 0 under constant restarts (expected with short window).
- Notes: extend duration and add steady transaction load to observe finalized checkpoints; consider staggering summary after restarts so all nodes respond.

HTTP load benchmark:

- Target: single dev node (`bulencoin-bench`) on ports 7710/7711, `allowUnsignedBlocks=true`, `blockIntervalMs=700`, faucet on.
- Command: `node scripts/load/tx_benchmark.js --base http://127.0.0.1:7710/api --duration 30 --rate 12 --concurrency 6 --memoPrefix churn --report scripts/soak/reports/tx_benchmark_20251129.json`
- Result: 172/359 tx accepted, 187 failed with HTTP 429 (rate limiter); latency p50 1.97 ms, p90 3.56 ms, max 20.85 ms. Most failures were rate-limit responses, not transport errors.
- Next steps: raise `BULEN_RATE_LIMIT_MAX_REQUESTS`/window for perf runs or drive load via P2P; add signed transactions and multi-node targets for more realistic throughput numbers.
