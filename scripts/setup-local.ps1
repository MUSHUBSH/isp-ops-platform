$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "[ISP Ops] $Message" -ForegroundColor Cyan
}

function Write-Warn {
  param([string]$Message)
  Write-Host "[ISP Ops] $Message" -ForegroundColor Yellow
}

function Test-CommandAvailable {
  param([string]$CommandName)
  return [bool](Get-Command $CommandName -ErrorAction SilentlyContinue)
}

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Step "Preparando entorno local"

$missing = @()
foreach ($command in @("node", "pnpm", "docker")) {
  if (-not (Test-CommandAvailable $command)) {
    $missing += $command
  }
}

if ($missing.Count -gt 0) {
  Write-Warn "Faltan comandos en PATH: $($missing -join ', ')"
  Write-Warn "Instala Node.js, pnpm y Docker Desktop antes de continuar."
  exit 1
}

$envPath = Join-Path $root ".env"
$examplePath = Join-Path $root ".env.example"

if (-not (Test-Path $envPath)) {
  if (-not (Test-Path $examplePath)) {
    Write-Warn "No existe .env.example para crear .env."
    exit 1
  }

  Copy-Item -Path $examplePath -Destination $envPath
  Write-Step "Creado .env desde .env.example"
} else {
  Write-Step ".env ya existe; no se sobrescribio"
}

Write-Step "Versiones detectadas"
node --version
pnpm --version
docker --version

Write-Host ""
Write-Step "Siguientes comandos"
Write-Host "pnpm install"
Write-Host "pnpm dev:local"
Write-Host "pnpm doctor"
