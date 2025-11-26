# BulenCoin Downloads & Installation

This repo ships source + Docker plus CLI one-click installers for Windows/macOS/Linux.
Signed platform-specific packages (.exe/.pkg/.deb/.rpm) and mobile builds (APK/TestFlight) are
still planned; until then use the scripts below.

## Quick options

- **Docker Compose (recommended for quick start)**  
  ```bash
  cd bulennode
  docker compose -f docker-compose.local.yml up --build
  # status: http://localhost:4100/api/status (add x-bulen-status-token if set)
  ```

- **Node.js (source)**  
  ```bash
  cd bulennode
  npm install
  NODE_ENV=development BULEN_NODE_PROFILE=desktop-full npm start
  ```

## One-click CLI installers

- **Linux (Debian/Ubuntu family)**  
  - `./scripts/install_server_node.sh` – `server-full` profile, installs Node via `apt` if needed.  
  - `./scripts/install_desktop_node.sh` – `desktop-full` profile.  
  - `./scripts/install_gateway_node.sh` – `gateway` profile for API/observer nodes.  
  - `./scripts/install_raspberry_node.sh` – `raspberry` profile on Raspberry Pi / ARM SBC.

- **macOS** (Homebrew or per-user nvm; profile optional, defaults to `desktop-full`)  
  ```bash
  chmod +x scripts/install_macos_node.sh
  ./scripts/install_macos_node.sh desktop-full   # or server-full / gateway / raspberry
  ```

- **Windows** (winget or Chocolatey; requires PowerShell)  
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts/install_windows_node.ps1 -Profile desktop-full
  ```

Each script installs Node.js (if missing), runs `npm install` in `bulennode/`, and prints
recommended environment variables (`BULEN_NODE_PROFILE`, `BULEN_REQUIRE_SIGNATURES`, faucet/P2P tokens).
A Linux-only smoke test for these installers is available via:

```bash
./scripts/test_installers_in_docker.sh
```

## Production minimums (testnet/prod)

- OS: Debian 12 or Ubuntu 22.04 LTS; Node.js 18 LTS (`node -v` >= 18, `npm -v` >= 9).
- Profiles `server-full` / `gateway`: minimum 2 vCPU, 4 GB RAM, 40 GB SSD/NVMe; recommended 4 vCPU, 8 GB RAM, 80 GB.
- `desktop-full` (non-public/dev): minimum 2 vCPU, 4 GB RAM, 20 GB SSD; keep faucet off when exposed.
- `raspberry`: Raspberry Pi 4/4GB (or better) with 32 GB UHS-I microSD (prefer SSD over USB) and stable connectivity.
- Security: set `BULEN_REQUIRE_SIGNATURES=true`, `BULEN_ENABLE_FAUCET=false` on public hosts, configure `BULEN_P2P_TOKEN` plus status/metrics tokens, run behind TLS/reverse proxy where possible.

## OS-specific notes (manual for now)

- **Windows**: you can use the one-click script above. Manual path: install Node.js 18+; run
  `npm install && npm start` in `bulennode/`. To run as a service, use NSSM or PowerShell scheduled
  task. Signed `.exe` installer is planned.

- **macOS**: you can use the one-click script above. Manual path: Node.js 18+ via Homebrew;
  `npm install && npm start` in `bulennode/`. LaunchAgents plist recommended for background service.
  Notarized `.pkg` installer is planned.

- **Linux**: Node.js 18+; `npm install && npm start` in `bulennode/`. For service mode, create a
  `systemd` unit pointing to `node src/index.js` with environment variables set. `.deb/.rpm`
  packages are planned.

## Mobile (planned)

- APK/TestFlight builds are in progress. For now, run `mobile-light` profile on a laptop/server and
  connect from a companion UI via gateway endpoints.

## Security reminders

- Set `BULEN_STATUS_TOKEN` / `BULEN_METRICS_TOKEN` / `BULEN_P2P_TOKEN` for anything exposed.
- Prefer TLS for P2P/API; see `docs/deployment_guide.md` for hardening.
- Keep wallets encrypted with a passphrase; confirm backups via `/api/wallets/backup-confirm`.

## Verifying builds (future installers)

Signed installers will ship with SHA256 checksums and, where applicable, code signing/notarization
metadata. Until then, verify sources via Git commit/Tag signatures if provided.
