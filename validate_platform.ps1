# Mob13r Platform Validation Script (Updated for AffiliatePlatform Folder)

Write-Host "Validating Mob13r Affiliate Platform..."
$basePath = "$env:USERPROFILE\Desktop\AffiliatePlatformSetup\AffiliatePlatform"

# Define expected folders
$folders = @(
    "$basePath\backend",
    "$basePath\frontend",
    "$basePath\database"
)

# Define expected backend files
$backendFiles = @(
    "server.js",
    "models.js",
    "utils.js",
    "package.json"
)

# Define expected frontend files
$frontendFiles = @(
    "package.json",
    "src\index.js",
    "src\App.js",
    "src\components\Admin.js",
    "src\components\Login.js"
)

# Define expected database files
$databaseFiles = @(
    "schema.sql",
    "sample_data.sql"
)

$missing = @()

# Check folders
foreach ($folder in $folders) {
    if (Test-Path $folder) {
        Write-Host "OK Folder found: $folder"
    } else {
        Write-Host "Missing folder: $folder"
        $missing += $folder
    }
}

# Check backend files
$backendPath = "$basePath\backend"
if (Test-Path $backendPath) {
    foreach ($file in $backendFiles) {
        $path = Join-Path $backendPath $file
        if (Test-Path $path) {
            Write-Host "OK backend\$file"
        } else {
            Write-Host "Missing: backend\$file"
            $missing += "backend\$file"
        }
    }
}

# Check frontend files
$frontendPath = "$basePath\frontend"
if (Test-Path $frontendPath) {
    foreach ($file in $frontendFiles) {
        $path = Join-Path $frontendPath $file
        if (Test-Path $path) {
            Write-Host "OK frontend\$file"
        } else {
            Write-Host "Missing: frontend\$file"
            $missing += "frontend\$file"
        }
    }
}

# Check database files
$databasePath = "$basePath\database"
if (Test-Path $databasePath) {
    foreach ($file in $databaseFiles) {
        $path = Join-Path $databasePath $file
        if (Test-Path $path) {
            Write-Host "OK database\$file"
        } else {
            Write-Host "Missing: database\$file"
            $missing += "database\$file"
        }
    }
}

Write-Host ""
Write-Host "----------------------------------------"
if ($missing.Count -eq 0) {
    Write-Host "All required files and folders are present!"
} else {
    Write-Host "Missing $($missing.Count) items:"
    $missing | ForEach-Object { Write-Host " - $_" }
}
Write-Host "----------------------------------------"
