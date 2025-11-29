# Security & supply chain snapshot (Nov 29 2025)

Generated artifacts:

- SBOM (npm tree) for core services:
  - `docs/sbom_bulennode.json`
  - `docs/sbom_status.json`
  - `docs/sbom_explorer.json`
- Deterministic genesis/snapshot helper: `scripts/genesis/generate_deterministic_snapshot.js` (see `docs/genesis_and_release_signing.md` for release signing).

Audit/scans status:

- `npm audit --omit dev` (root) failed: no package-lock present (`ENOLOCK`). To run, generate locks per package (`npm i --package-lock-only`) or use `npm audit --package-lock-only` inside each service.
- SAST/DAST not run yet; recommended tools: `semgrep` (SAST) and `zap-baseline` against local stack with tokens enabled.
- License check not run; suggested: `npx license-checker --json` per package once lockfiles are present.

Next actions (suggested):

1) Create lockfiles per service (`bulennode/`, `explorer/`, `status/`) and rerun `npm audit --omit dev --json` to capture advisories; store reports under `docs/`.
2) Run `semgrep` with OWASP/JavaScript rulesets; export findings to `docs/semgrep_report.json`.
3) Run ZAP baseline scan against local full stack (with `x-bulen-status-token` etc.) and save the report.
4) Produce signed release checksums (`SHA256SUMS`, `SHA256SUMS.asc`) for build artifacts; document expected `snapshotHash` and `BULEN_GENESIS_VALIDATORS` in release notes.
