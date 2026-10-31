<#
.SYNOPSIS
    Dump the local Windows Postgres database to a custom-format file.
    Run this on the Windows dev machine before migrating to the server.

.PREREQUISITES
    pg_dump on PATH — install via:
        winget install PostgreSQL.PostgreSQL
    or download from https://www.postgresql.org/download/windows/

.USAGE
    .\dump-from-dev.ps1
    .\dump-from-dev.ps1 -Port 5433 -DbName my_db

    Then scp the produced .dump file to the target server:
        scp atomik-YYYYMMDD-HHmmss.dump user@server:/path/to/atomik-activity/deploy/backups/
#>

param(
    [string]$Host     = "localhost",
    [int]   $Port     = 5432,
    [string]$Username = "postgres",
    [string]$DbName   = "location_history"
)

$ErrorActionPreference = "Stop"

# Verify pg_dump is available
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
    Write-Error "pg_dump not found on PATH. Install Postgres client tools."
    exit 1
}

$stamp   = Get-Date -Format "yyyyMMdd-HHmmss"
$outFile = "atomik-$stamp.dump"

Write-Host "Dumping $DbName from $Host:$Port ..."
Write-Host "(You may be prompted for the Postgres password.)"

& pg_dump `
    --host=$Host `
    --port=$Port `
    --username=$Username `
    --dbname=$DbName `
    --format=custom `
    --no-owner `
    --no-privileges `
    --file=$outFile

$sizeKB = [math]::Round((Get-Item $outFile).Length / 1KB, 1)
Write-Host ""
Write-Host "Done: $outFile ($sizeKB KB)"
Write-Host ""
Write-Host "Next step — copy to your server:"
Write-Host "  scp $outFile user@<server-ip>:/path/to/atomik-activity/deploy/backups/"
Write-Host ""
Write-Host "Then on the server run:"
Write-Host "  cd /path/to/atomik-activity/deploy"
Write-Host "  ./scripts/restore-into-stack.sh backups/$outFile"
