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

Write-Host "[ISP Ops] Contenedor PostgreSQL" -ForegroundColor Cyan
docker compose ps postgres

Write-Host "`n[ISP Ops] pg_isready" -ForegroundColor Cyan
docker compose exec -T postgres pg_isready -U ispops -d ispops

Write-Host "`n[ISP Ops] Conteos principales" -ForegroundColor Cyan
docker compose exec -T postgres psql -U ispops -d ispops -c "SELECT 'sites' AS table, count(*) FROM sites UNION ALL SELECT 'devices', count(*) FROM devices UNION ALL SELECT 'interfaces', count(*) FROM interfaces UNION ALL SELECT 'circuits', count(*) FROM circuits UNION ALL SELECT 'audit_events', count(*) FROM audit_events;"
