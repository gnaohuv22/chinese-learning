Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Administrator\.gemini\antigravity\brain\26dfeb4c-4d7e-4be2-8b66-54921ea6e6c0\og_preview_new_1778423558627.png"
$destPath = "e:\chinese-learning\public\og-preview.jpg"

$img = [System.Drawing.Image]::FromFile($srcPath)

# Resize to 1200x630 if needed
$targetW = 1200
$targetH = 630
$bmp = New-Object System.Drawing.Bitmap($targetW, $targetH)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, $targetW, $targetH)
$g.Dispose()
$img.Dispose()

# Save as JPEG quality 82
$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters(1)
$qualityParam = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality, [long]82
)
$params.Param[0] = $qualityParam

$bmp.Save($destPath, $encoder, $params)
$bmp.Dispose()

$size = (Get-Item $destPath).Length
Write-Host "Saved: $destPath"
Write-Host "Size: $([math]::Round($size/1KB, 1)) KB"
