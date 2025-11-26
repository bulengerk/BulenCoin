[CmdletBinding()]
param(
  [string]$Profile = "desktop-full"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# One-click installer for BulenCoin nodes on Windows.
# - Installs Node.js LTS via winget (preferred) or Chocolatey.
# - Installs npm dependencies for bulennode.
# - Prints recommended environment for the chosen profile.

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")

Write-Host "[BulenCoin] Installing $Profile node in $repoRoot"

function Ensure-Node {
  $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
  if ($nodeCmd) {
    Write-Host "[BulenCoin] Node.js detected: $(node -v)"
    return
  }

  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "[BulenCoin] Installing Node.js LTS via winget..."
    winget install --id OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements
  }
  elseif (Get-Command choco -ErrorAction SilentlyContinue) {
    Write-Host "[BulenCoin] Installing Node.js LTS via Chocolatey..."
    choco install -y nodejs-lts
  }
  else {
    throw "[BulenCoin] Node.js not found and winget/choco are unavailable. Install Node 18+ and rerun this script."
  }

  # Ensure typical install locations are visible in this session.
  $programFiles = [Environment]::GetEnvironmentVariable("ProgramFiles")
  $programFilesX86 = [Environment]::GetEnvironmentVariable("ProgramFiles(x86)")
  $localNode = Join-Path ([Environment]::GetEnvironmentVariable("LOCALAPPDATA")) "Programs\nodejs"
  $env:PATH += ";$programFiles\nodejs;$programFilesX86\nodejs;$localNode;$env:APPDATA\nvm"
}

Ensure-Node

try {
  $nodeVersion = node -v
  $npmVersion = npm -v
}
catch {
  throw "[BulenCoin] Node.js install appears to have failed: $_"
}

Write-Host "[BulenCoin] Using Node.js $nodeVersion"
Write-Host "[BulenCoin] Using npm $npmVersion"

$bulenNodePath = Join-Path $repoRoot "bulennode"
Set-Location $bulenNodePath

Write-Host "[BulenCoin] Installing npm dependencies for bulennode..."
npm install

$enableFaucet = "true"
if ($Profile -eq "server-full" -or $Profile -eq "gateway") {
  $enableFaucet = "false"
}

Write-Host ""
Write-Host "[BulenCoin] $Profile node installation finished (Windows)."
Write-Host ""
Write-Host "Recommended environment (run once per host):"
Write-Host "  setx BULEN_NODE_PROFILE $Profile"
Write-Host "  setx BULEN_REQUIRE_SIGNATURES true"
Write-Host "  setx BULEN_ENABLE_FAUCET $enableFaucet"
Write-Host "  setx BULEN_P2P_TOKEN \"replace-with-strong-secret-token\""
Write-Host "  # Optional hardening:"
Write-Host "  # setx BULEN_STATUS_TOKEN \"replace-with-status-secret\""
Write-Host "  # setx BULEN_METRICS_TOKEN \"replace-with-metrics-secret\""
Write-Host ""
Write-Host "Then run (new terminal after setx):"
Write-Host "  cd $bulenNodePath"
Write-Host "  npm start"
