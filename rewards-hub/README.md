# BulenCoin Rewards Hub (prototype)

Collects uptime/stake reports from BulenNode instances and exposes a leaderboard and badges.

## Configure & run

```bash
cd rewards-hub
npm install
REWARDS_TOKEN=supersecret \
REWARDS_MIN_STAKE=100 \
REWARDS_REPORT_TTL_MS=$((7*24*3600*1000)) \
node server.js
```

Env vars:

- `REWARDS_PORT` (default 4400)
- `REWARDS_TOKEN` – shared secret for posting reports
- `REWARDS_MIN_STAKE` – minimal stake to accept a report
- `REWARDS_REPORT_TTL_MS` – how long reports are considered fresh
- `REWARDS_HMAC_SECRET` – optional HMAC secret; when set, `/reports` requires header
  `x-bulen-signature` with `sha256` HMAC over the raw JSON body.
- `REWARDS_RATE_LIMIT_MAX` / `REWARDS_RATE_LIMIT_WINDOW_MS` – simple in-memory rate limit
  per IP for `/reports` (defaults: 120 req / 60s).

Security defaults:

- `/reports` always requires both `REWARDS_TOKEN` and `REWARDS_HMAC_SECRET` (HMAC signature).
- Requests without valid signature/token or above rate limit are rejected.

Endpoints:

- `POST /reports` – auth via `x-rewards-token`, body `{ nodeId, stake, uptimePercent, deviceClass, reputation, deviceBoost }`, computes score and stores badges.
- `GET /leaderboard` – returns all reports sorted by score.
- `GET /badges/:nodeId` – badges earned by node.

Notes:

- This is a prototype; in production add signature verification, persistence, and rate limits.
