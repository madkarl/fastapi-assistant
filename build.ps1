# 0. Clear assets directory

if (-not (Test-Path "assets")) {
    New-Item -ItemType Directory -Path "assets" | Out-Null
}

if (Test-Path "assets") {
    Remove-Item -Path "assets\*" -Recurse -Force
}

# 1. Pack fastapi_template
$templatePath = ".\template_project"
$tempDir = Join-Path $env:TEMP "fastapi_template_pack"

if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Copy-Item -Path (Join-Path $templatePath "core") -Destination $tempDir -Recurse
Copy-Item -Path (Join-Path $templatePath "command") -Destination $tempDir -Recurse
Copy-Item -Path (Join-Path $templatePath "authentication") -Destination $tempDir -Recurse

Get-ChildItem -Path $tempDir -Directory -Recurse | Where-Object { $_.Name -eq "__pycache__" } | Remove-Item -Recurse -Force

$pyFiles = Get-ChildItem -Path $templatePath -Filter "*.py" -File
foreach ($pyFile in $pyFiles) {
    Copy-Item -Path $pyFile.FullName -Destination $tempDir
}

Compress-Archive -Path (Join-Path $tempDir "*") -DestinationPath "assets\project.zip" -Force
Remove-Item -Path $tempDir -Recurse -Force

# Pack module
$moduleSrcDir = Join-Path $templatePath "template" | Join-Path -ChildPath "module"
$moduleTempDir = Join-Path $env:TEMP "module_pack"

New-Item -ItemType Directory -Path $moduleTempDir | Out-Null

$pyFiles = Get-ChildItem -Path $moduleSrcDir -Filter "*.py" -File
foreach ($pyFile in $pyFiles) {
    Copy-Item -Path $pyFile.FullName -Destination $moduleTempDir
}

Compress-Archive -Path (Join-Path $moduleTempDir "*") -DestinationPath "assets\module.zip" -Force
Remove-Item -Path $moduleTempDir -Recurse -Force

# Copy template files
Copy-Item -Path "$templatePath\template\*.template" -Destination "assets" -Force

# Clean and rebuild
if (Test-Path "out") {
    Remove-Item -Path "out" -Recurse -Force
}

Get-ChildItem -Path "." -Filter "*.vsix" | Remove-Item -Force

npx vsce package
