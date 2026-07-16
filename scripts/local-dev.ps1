$ErrorActionPreference = "Stop"

function Test-DockerReady {
  try {
    $null = docker info 2>$null
    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  }
}

function Assert-DockerReady {
  if (-not (Test-DockerReady)) {
    Write-Host "[ISP Ops] Docker Desktop esta instalado, pero el motor no esta corriendo." -ForegroundColor Yellow
    Write-Host "[ISP Ops] Abre Docker Desktop y espera que diga 'Docker is running'. Luego vuelve a ejecutar este comando." -ForegroundColor Yellow
    exit 1
  }
}

function Assert-CommandAvailable {
  param([string]$CommandName)

  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    Write-Host "[ISP Ops] No encontre '$CommandName' en PATH." -ForegroundColor Yellow
    Write-Host "[ISP Ops] Instala Node.js/pnpm o abre una terminal donde pnpm este disponible." -ForegroundColor Yellow
    exit 1
  }
}

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
Assert-DockerReady
Assert-CommandAvailable "pnpm"

$env:DATABASE_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { "postgres://ispops:ispops_dev@localhost:5432/ispops" }
$env:PORT = if ($env:PORT) { $env:PORT } else { "4000" }
$env:VITE_API_BASE_URL = if ($env:VITE_API_BASE_URL) { $env:VITE_API_BASE_URL } else { "http://localhost:4000" }
$env:VITE_API_KEY = if ($env:VITE_API_KEY) { $env:VITE_API_KEY } else { "dev-admin-key" }

Write-Host "[ISP Ops] Levantando PostgreSQL local..." -ForegroundColor Cyan
docker compose up -d postgres

Write-Host "[ISP Ops] Esperando PostgreSQL..." -ForegroundColor Cyan
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  docker compose exec -T postgres pg_isready -U ispops -d ispops | Out-Null
  if ($LASTEXITCODE -eq 0) {
    $ready = $true
    break
  }
  Start-Sleep -Seconds 1
}

if (-not $ready) {
  Write-Host "[ISP Ops] PostgreSQL no respondio despues de 30 segundos." -ForegroundColor Red
  Write-Host "[ISP Ops] Revisa con: docker compose logs postgres" -ForegroundColor Yellow
  exit 1
}

Write-Host "[ISP Ops] DATABASE_URL=$env:DATABASE_URL" -ForegroundColor DarkGray
Write-Host "[ISP Ops] Web: http://localhost:5173" -ForegroundColor Green
Write-Host "[ISP Ops] API: http://localhost:4000/health" -ForegroundColor Green

pnpm dev
