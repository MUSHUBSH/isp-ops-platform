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

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outDir = Join-Path $root "backups"
$outFile = Join-Path $outDir "ispops-$stamp.sql"

if (-not (Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

Write-Host "[ISP Ops] Generando backup local: $outFile" -ForegroundColor Cyan
docker compose exec -T postgres pg_dump -U ispops -d ispops --clean --if-exists > $outFile

if ($LASTEXITCODE -ne 0) {
  Write-Host "[ISP Ops] No se pudo crear el backup. Verifica que PostgreSQL este corriendo." -ForegroundColor Red
  exit 1
}

Write-Host "[ISP Ops] Backup creado." -ForegroundColor Green
