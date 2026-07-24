# Daily backup script for CIS Kenya project
$source = 'C:\Users\subay\Documents\cis_kenaya\*'
$backupDir = 'C:\Users\subay\Documents\cis_kenaya_backups'
# Ensure backup directory exists
if (-not (Test-Path -Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir -Force | Out-Null }
# Create timestamped archive
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$dest = Join-Path $backupDir "cis_kenaya_backup_$timestamp.zip"
try {
    Compress-Archive -Path $source -DestinationPath $dest -Force
    # Remove backups older than 30 days to save space
    Get-ChildItem -Path $backupDir -File | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item -Force -ErrorAction SilentlyContinue
    Write-Output "BACKUP_CREATED:$dest"
} catch {
    Write-Output "BACKUP_ERROR:$($_.Exception.Message)"
}
