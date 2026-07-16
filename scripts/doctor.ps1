$ErrorActionPreference = "Continue"

function Write-Check {
  param(
    [string]$Name,
    [bool]$Ok,
    [string]$Detail = ""
  )

  $icon = if ($Ok) { "[OK]" } else { "[!!]" }
  $color = if ($Ok) { "Green" } else { "Yellow" }
  $message = if ($Detail) { "$icon $Name - $Detail" } else { "$icon $Name" }
  Write-Host $message -ForegroundColor $color
}

function Test-CommandAvailable {
  param([string]$CommandName)
  return [bool](Get-Command $CommandName -ErrorAction SilentlyContinue)
}

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "[ISP Ops] Diagnostico local" -ForegroundColor Cyan
Write-Host "[ISP Ops] Root: $root" -ForegroundColor DarkGray
Write-Host ""

$nodeOk = Test-CommandAvailable "node"
Write-Check "Node.js" $nodeOk $(if ($nodeOk) { (node --version) } else { "no encontrado en PATH" })

$pnpmOk = Test-CommandAvailable "pnpm"
Write-Check "pnpm" $pnpmOk $(if ($pnpmOk) { (pnpm --version) } else { "no encontrado en PATH" })

$dockerOk = Test-CommandAvailable "docker"
Write-Check "Docker CLI" $dockerOk $(if ($dockerOk) { (docker --version) } else { "no encontrado en PATH" })

$envPath = Join-Path $root ".env"
Write-Check ".env local" (Test-Path $envPath) $(if (Test-Path $envPath) { "presente" } else { "puedes copiar .env.example a .env" })

$composePath = Join-Path $root "docker-compose.yml"
Write-Check "docker-compose.yml" (Test-Path $composePath) $(if (Test-Path $composePath) { "presente" } else { "faltante" })

$dockerEngineOk = $false
if ($dockerOk) {
  docker info 1>$null 2>$null
  $dockerEngineOk = $LASTEXITCODE -eq 0
}
Write-Check "Docker Engine" $dockerEngineOk $(if ($dockerEngineOk) { "corriendo" } else { "abre Docker Desktop y espera a que este listo" })

if ($dockerEngineOk) {
  Write-Host ""
  Write-Host "[ISP Ops] PostgreSQL Docker" -ForegroundColor Cyan
  docker compose ps postgres

  docker compose exec -T postgres pg_isready -U ispops -d ispops 1>$null 2>$null
  $postgresReady = $LASTEXITCODE -eq 0
  Write-Check "PostgreSQL" $postgresReady $(if ($postgresReady) { "aceptando conexiones" } else { "ejecuta pnpm db:up o pnpm dev:local" })

  if ($postgresReady) {
    docker compose exec -T postgres psql -U ispops -d ispops -c "SELECT 'sites' AS tabla, count(*) FROM sites UNION ALL SELECT 'devices', count(*) FROM devices UNION ALL SELECT 'circuits', count(*) FROM circuits UNION ALL SELECT 'audit_events', count(*) FROM audit_events;"
  }
}

Write-Host ""
Write-Host "[ISP Ops] Servicios HTTP" -ForegroundColor Cyan

try {
  $apiHealth = Invoke-RestMethod -Uri "http://localhost:4000/health" -TimeoutSec 3
  Write-Check "API http://localhost:4000/health" $true "mode=$($apiHealth.mode), db=$($apiHealth.database.connected)"
} catch {
  Write-Check "API http://localhost:4000/health" $false "no responde; ejecuta pnpm dev:local"
}

try {
  $webResponse = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 3 -UseBasicParsing
  Write-Check "Web http://localhost:5173" ($webResponse.StatusCode -ge 200 -and $webResponse.StatusCode -lt 500) "status=$($webResponse.StatusCode)"
} catch {
  Write-Check "Web http://localhost:5173" $false "no responde; ejecuta pnpm dev:local"
}

Write-Host ""
Write-Host "[ISP Ops] Comandos utiles" -ForegroundColor Cyan
Write-Host "pnpm dev:local   # levanta PostgreSQL + API + Web"
Write-Host "pnpm db:health   # verifica DB y conteos"
Write-Host "pnpm db:backup   # crea backup SQL local"
Write-Host "pnpm typecheck   # valida TypeScript"
