Add-Type -AssemblyName System.Drawing

function Generate-Icon {
    param(
        [int]$size,
        [string]$outputPath,
        [bool]$isMaskable = $false,
        [bool]$isApple = $false
    )

    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # Deep firm navy background #1B365D
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 27, 54, 93))

    if ($isMaskable -or $isApple) {
        $g.FillRectangle($bgBrush, 0, 0, $size, $size)
    } else {
        $radius = [int]($size * 0.22)
        $d = $radius * 2
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddArc(0, 0, $d, $d, 180, 90)
        $path.AddArc($size - $d, 0, $d, $d, 270, 90)
        $path.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
        $path.AddArc(0, $size - $d, $d, $d, 90, 90)
        $path.CloseFigure()
        $g.FillPath($bgBrush, $path)
        $path.Dispose()
    }

    # Scale typography for safe zone
    $scale = if ($isMaskable) { 0.65 } else { 0.85 }
    $fontSize = [float]($size * 0.38 * $scale)
    $fontStyle = [System.Drawing.FontStyle]::Bold
    $font = New-Object System.Drawing.Font("Arial", $fontSize, $fontStyle, [System.Drawing.GraphicsUnit]::Pixel)

    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $textYOffset = [float](-$size * 0.05 * $scale)
    $rect = New-Object System.Drawing.RectangleF(0.0, $textYOffset, [float]$size, [float]$size)
    $g.DrawString("SA", $font, $textBrush, $rect, $sf)

    # Accent underline
    $barWidth = [float]($size * 0.48 * $scale)
    $barHeight = [float][Math]::Max(2.0, ($size * 0.042 * $scale))
    $barX = [float](($size - $barWidth) / 2.0)
    $barY = if ($isMaskable) { [float]($size * 0.66) } else { [float]($size * 0.69) }
    $barBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 255, 255, 255))

    $barPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $bd = $barHeight
    $barPath.AddArc($barX, $barY, $bd, $bd, 180, 90)
    $barPath.AddArc($barX + $barWidth - $bd, $barY, $bd, $bd, 270, 90)
    $barPath.AddArc($barX + $barWidth - $bd, $barY + $barHeight - $bd, $bd, $bd, 0, 90)
    $barPath.AddArc($barX, $barY + $barHeight - $bd, $bd, $bd, 90, 90)
    $barPath.CloseFigure()
    $g.FillPath($barBrush, $barPath)

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $barPath.Dispose()
    $barBrush.Dispose()
    $sf.Dispose()
    $textBrush.Dispose()
    $font.Dispose()
    $bgBrush.Dispose()
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Generated icon: $outputPath ($size x $size)"
}

Generate-Icon -size 64 -outputPath "public/pwa-64x64.png"
Generate-Icon -size 192 -outputPath "public/pwa-192x192.png"
Generate-Icon -size 512 -outputPath "public/pwa-512x512.png"
Generate-Icon -size 512 -outputPath "public/maskable-icon-512x512.png" -isMaskable $true
Generate-Icon -size 180 -outputPath "public/apple-touch-icon.png" -isApple $true
