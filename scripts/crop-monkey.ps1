Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "..\public\images\hero-reference.png"
$destPath = Join-Path $PSScriptRoot "..\public\images\monkey.png"

$src = [System.Drawing.Bitmap]::FromFile($srcPath)
# Crop the monkey character precisely with full ears and torso
$cropX = 175
$cropY = 40
$cropWidth = 290
$cropHeight = 485

$rect = [System.Drawing.Rectangle]::FromLTRB($cropX, $cropY, ($cropX + $cropWidth), ($cropY + $cropHeight))
$dest = New-Object System.Drawing.Bitmap($cropWidth, $cropHeight)
$g = [System.Drawing.Graphics]::FromImage($dest)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$targetRect = [System.Drawing.Rectangle]::FromLTRB(0, 0, $cropWidth, $cropHeight)
$g.DrawImage($src, $targetRect, $cropX, $cropY, $cropWidth, $cropHeight, [System.Drawing.GraphicsUnit]::Pixel)

$dest.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$dest.Dispose()
$src.Dispose()

Write-Host "Cropped monkey saved to $destPath"
