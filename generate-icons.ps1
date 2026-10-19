Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "logo.png"
if (-not (Test-Path $srcPath)) {
    Write-Error "logo.png not found at $srcPath"
    exit 1
}

$src = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Icon([int]$targetWidth, [int]$targetHeight, [string]$outPath, [double]$paddingPercent = 0.0) {
    $bmp = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $padW = $targetWidth * $paddingPercent
    $padH = $targetHeight * $paddingPercent
    $availW = $targetWidth - (2.0 * $padW)
    $availH = $targetHeight - (2.0 * $padH)

    $ratio = [Math]::Min($availW / $src.Width, $availH / $src.Height)
    $destW = [int][Math]::Round($src.Width * $ratio)
    $destH = [int][Math]::Round($src.Height * $ratio)
    $destX = [int][Math]::Round(($targetWidth - $destW) / 2.0)
    $destY = [int][Math]::Round(($targetHeight - $destH) / 2.0)

    $g.DrawImage($src, $destX, $destY, $destW, $destH)
    $g.Dispose()
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Created: $outPath ($targetWidth x $targetHeight)"
}

Resize-Icon 16 16 (Join-Path $PSScriptRoot "favicon-16x16.png")
Resize-Icon 32 32 (Join-Path $PSScriptRoot "favicon-32x32.png")
Resize-Icon 180 180 (Join-Path $PSScriptRoot "apple-touch-icon.png")
Resize-Icon 192 192 (Join-Path $PSScriptRoot "icon-192.png")
Resize-Icon 512 512 (Join-Path $PSScriptRoot "icon-512.png")
Resize-Icon 192 192 (Join-Path $PSScriptRoot "icon-maskable-192.png") 0.1
Resize-Icon 512 512 (Join-Path $PSScriptRoot "icon-maskable-512.png") 0.1

$src.Dispose()
Write-Output "All icons successfully generated!"
