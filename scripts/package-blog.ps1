$ErrorActionPreference = 'Stop'
$siteRoot = Split-Path $PSScriptRoot -Parent
Push-Location $siteRoot
try {
    node scripts/generate-blog.js
    if ($LASTEXITCODE -ne 0) { throw 'Blog build failed; upload ZIP was not updated.' }
    node --test scripts/test-blog.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Blog verification failed; upload ZIP was not updated.' }
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $outputDir = Join-Path $siteRoot 'dist'
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    $zipPath = Join-Path $outputDir 'blog-upload.zip'
    $stream = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::Create)
    $archive = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        $files = @('index.html', 'sitemap.xml', '.htaccess', 'blog/index.html')
        $files += Get-ChildItem -LiteralPath (Join-Path $siteRoot 'blog') -Directory | Where-Object {
            Test-Path -LiteralPath (Join-Path $_.FullName '.generated-blog-post')
        } | ForEach-Object { 'blog/' + $_.Name + '/index.html' }
        foreach ($relativePath in $files) {
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, (Join-Path $siteRoot $relativePath), $relativePath) | Out-Null
        }
    } finally {
        $archive.Dispose()
        $stream.Dispose()
    }
    Write-Host "Upload bundle ready: $zipPath"
} finally {
    Pop-Location
}
