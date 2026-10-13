param(
    [string]$Server = 'localhost',
    [string]$Database = 'DentalPracticeDb',
    [switch]$TestRestore,
    [switch]$FullIntegrityCheck
)
$ErrorActionPreference = 'Stop'
if ($Database -notmatch '^[A-Za-z0-9_]+$') { throw 'Use a simple SQL database name containing letters, digits and underscores.' }

function Invoke-DentalSql([string]$Query) {
    $result = & sqlcmd -S $Server -E -C -b -h -1 -W -t 120 -Q $Query
    if ($LASTEXITCODE -ne 0) { throw ('SQL backup/restore operation failed: ' + ($result -join "`n")) }
    return $result
}

$backupDirectory = (Invoke-DentalSql "SET NOCOUNT ON; SELECT CONVERT(nvarchar(4000), SERVERPROPERTY('InstanceDefaultBackupPath'));" | Where-Object { $_.Trim() } | Select-Object -First 1).Trim()
if (!$backupDirectory -or $backupDirectory -eq 'NULL') { throw 'SQL Server did not return its default backup directory.' }
$backupFile = Join-Path $backupDirectory ($Database + '_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '_' + [Guid]::NewGuid().ToString('N') + '.bak')
$sqlFile = $backupFile.Replace("'", "''")
Invoke-DentalSql "BACKUP DATABASE [$Database] TO DISK=N'$sqlFile' WITH COPY_ONLY, CHECKSUM; RESTORE VERIFYONLY FROM DISK=N'$sqlFile' WITH CHECKSUM;" | Write-Output
Write-Output "Backup verified: $backupFile"

if ($TestRestore) {
    $restoreSqlFile = $sqlFile.Replace("'", "''")
    $restoreDatabase = 'DentalRestoreVerification_' + [Guid]::NewGuid().ToString('N')
    # Only a newly allocated verification database is ever removed by this script.
    if ($restoreDatabase -notmatch '^DentalRestoreVerification_[a-f0-9]{32}$') { throw 'Invalid verification database name.' }
    $query = @"
DECLARE @dataPath nvarchar(4000) = CONVERT(nvarchar(4000), SERVERPROPERTY('InstanceDefaultDataPath'));
DECLARE @logPath nvarchar(4000) = CONVERT(nvarchar(4000), SERVERPROPERTY('InstanceDefaultLogPath'));
DECLARE @moves nvarchar(max) = N'';
SELECT @moves = @moves + N', MOVE N''' + REPLACE(name, '''', '''''') + N''' TO N''' +
    REPLACE(CASE WHEN type = 1 THEN @logPath ELSE @dataPath END + N'$restoreDatabase' + N'_' + CONVERT(nvarchar(20), file_id) + CASE WHEN type = 1 THEN N'.ldf' ELSE N'.mdf' END, '''', '''''') + N''''
FROM [$Database].sys.database_files;
EXEC(N'RESTORE DATABASE [$restoreDatabase] FROM DISK=N''$restoreSqlFile'' WITH CHECKSUM' + @moves);
DECLARE @table nvarchar(517), @rows bigint, @readSql nvarchar(max);
DECLARE tablesToRead CURSOR LOCAL FAST_FORWARD FOR SELECT QUOTENAME(s.name) + N'.' + QUOTENAME(t.name) FROM [$restoreDatabase].sys.tables t JOIN [$restoreDatabase].sys.schemas s ON t.schema_id = s.schema_id;
OPEN tablesToRead;
FETCH NEXT FROM tablesToRead INTO @table;
WHILE @@FETCH_STATUS = 0
BEGIN
    SET @readSql = N'SELECT @count = COUNT_BIG(*) FROM [$restoreDatabase].' + @table;
    EXEC sp_executesql @readSql, N'@count bigint OUTPUT', @count = @rows OUTPUT;
    FETCH NEXT FROM tablesToRead INTO @table;
END;
CLOSE tablesToRead;
DEALLOCATE tablesToRead;
"@
    if ($FullIntegrityCheck) { $query += "`nDBCC CHECKDB (N'$restoreDatabase') WITH NO_INFOMSGS, MAXDOP = 1;" }
    try {
        Invoke-DentalSql $query | Write-Output
        Write-Output 'Restore and table-read checks passed.'
        if ($FullIntegrityCheck) { Write-Output 'Full DBCC CHECKDB passed.' }
    }
    finally {
        Invoke-DentalSql "IF DB_ID(N'$restoreDatabase') IS NOT NULL BEGIN ALTER DATABASE [$restoreDatabase] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$restoreDatabase]; END;" | Write-Output
    }
}
