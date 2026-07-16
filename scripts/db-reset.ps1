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

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
Assert-DockerReady

Write-Host "[ISP Ops] Esto elimina la base local Docker y la recrea con schema/seed." -ForegroundColor Yellow
Write-Host "[ISP Ops] Solo afecta el volumen Docker local postgres_data de este proyecto." -ForegroundColor Yellow

docker compose down -v
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

Write-Host "[ISP Ops] DB local reiniciada con schema y seed." -ForegroundColor Green
