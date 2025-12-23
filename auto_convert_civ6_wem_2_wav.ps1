param(
  [Parameter(Mandatory=$true)]
  [ValidateNotNullOrEmpty()]
  [string]$InputDir,

  [Parameter(Mandatory=$true)]
  [ValidateNotNullOrEmpty()]
  [string]$OutputDir
)

# ========== 配置：改成你自己的 vgmstream 路径 ==========
$VgmstreamCli = "D:\MediaTools\vgmstream\vgmstream-cli.exe"
# ======================================================

# ✅ XP2Banks.ini = Expansion2 音频加载索引
# FMV 开场/结局 → [FMV]
# 游戏内 → [InGame]
# 常驻 → [Global]

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Directory([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Sanitize-FileName([string]$name) {
  if ($null -eq $name) { return $null }
  $invalid = [IO.Path]::GetInvalidFileNameChars()
  foreach ($ch in $invalid) { $name = $name.Replace($ch, '_') }
  return $name
}

function Get-XmlInnerText([System.Xml.XmlNode]$node, [string]$xpath) {
  if ($null -eq $node) { return $null }
  $n = $node.SelectSingleNode($xpath)
  if ($null -eq $n) { return $null }
  return $n.InnerText
}

function Resolve-WemPath([string]$baseDir, [string]$fileId, [string]$xmlRelativePath) {
  # 1) 优先使用 XML 的 Path（相对 baseDir）
  if ($xmlRelativePath -and $xmlRelativePath.Trim().Length -gt 0) {
    $p1 = Join-Path $baseDir $xmlRelativePath
    if (Test-Path -LiteralPath $p1) { return $p1 }
  }

  # 2) 回退：扁平化 "<Id>.wem"
  $p2 = Join-Path $baseDir ("{0}.wem" -f $fileId)
  if (Test-Path -LiteralPath $p2) { return $p2 }

  # 3) 再回退：递归找同名 ID（慢，但尽量不漏）
  $found = Get-ChildItem -Path $baseDir -Filter ("{0}.wem" -f $fileId) -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($found) { return $found.FullName }

  return $null
}

function Get-RelativeDir([string]$baseDir, [string]$fullPath) {
  # 返回 fullPath 相对 baseDir 的“目录部分”（不含文件名）
  $base = (Resolve-Path -LiteralPath $baseDir).Path.TrimEnd('\')
  $full = (Resolve-Path -LiteralPath $fullPath).Path

  if ($full.Length -le $base.Length) { return "" }
  if ($full.Substring(0, $base.Length).ToLowerInvariant() -ne $base.ToLowerInvariant()) { return "" }

  $rel = $full.Substring($base.Length).TrimStart('\')
  $relDir = Split-Path -Parent $rel
  if ($relDir -eq $null) { return "" }
  return $relDir
}

# ---------- 基础检查 ----------
$InputDir = (Resolve-Path -LiteralPath $InputDir).Path
Ensure-Directory $OutputDir
$OutputDir = (Resolve-Path -LiteralPath $OutputDir).Path

if (-not (Test-Path -LiteralPath $VgmstreamCli)) {
  throw "vgmstream-cli.exe not found: $VgmstreamCli"
}

# ---------- 收集 XML ----------
$xmlFiles = Get-ChildItem -Path $InputDir -Filter "*.xml" -File -Recurse -ErrorAction SilentlyContinue
if (-not $xmlFiles -or $xmlFiles.Count -eq 0) {
  throw "No .xml files found under InputDir: $InputDir"
}

# 去重：同一个 wem id + shortname 可能在多个 xml 出现
$exportedKey = @{}
$missingCount = 0
$exportCount = 0
$skipExistsCount = 0

foreach ($xf in $xmlFiles) {
  try {
    [xml]$doc = Get-Content -LiteralPath $xf.FullName
  } catch {
    Write-Warning ("Skip invalid XML: {0}" -f $xf.FullName)
    continue
  }

  $soundBanks = $doc.SelectNodes("//SoundBanks/SoundBank")
  if (-not $soundBanks) { continue }

  foreach ($bank in $soundBanks) {
    $files = $bank.SelectNodes("./ReferencedStreamedFiles/File")
    if (-not $files) { continue }

    foreach ($f in $files) {
      $fileId    = $f.GetAttribute("Id")
      if (-not $fileId) { continue }

      $shortName = Get-XmlInnerText $f "./ShortName"
      if (-not $shortName -or $shortName.Trim().Length -eq 0) { $shortName = ("{0}.wav" -f $fileId) }
      $shortName = Sanitize-FileName $shortName

      $relPath   = Get-XmlInnerText $f "./Path"
      $wemPath   = Resolve-WemPath -baseDir $InputDir -fileId $fileId -xmlRelativePath $relPath

      if (-not $wemPath) {
        $missingCount++
        continue
      }

      # === 输出目录：镜像 wem 所在目录结构 ===
      $relDir = Get-RelativeDir -baseDir $InputDir -fullPath $wemPath
      $outSubDir = if ($relDir -and $relDir.Trim().Length -gt 0) { Join-Path $OutputDir $relDir } else { $OutputDir }
      Ensure-Directory $outSubDir

      $outWav = Join-Path $outSubDir $shortName

      # 文件名冲突处理：如果同目录已存在同名 wav，则追加 _WemId
      if (Test-Path -LiteralPath $outWav) {
        $baseName = [IO.Path]::GetFileNameWithoutExtension($shortName)
        $ext = [IO.Path]::GetExtension($shortName)
        $alt = Join-Path $outSubDir ("{0}_{1}{2}" -f $baseName, $fileId, $ext)
        $outWav = $alt
      }

      $key = ("{0}|{1}" -f $fileId, $outWav.ToLowerInvariant())
      if ($exportedKey.ContainsKey($key)) { continue }

      if (-not (Test-Path -LiteralPath $outWav)) {
        & $VgmstreamCli -o $outWav $wemPath | Out-Null
        $exportCount++
      } else {
        $skipExistsCount++
      }

      $exportedKey[$key] = $true
    }
  }
}

Write-Host "Done."
Write-Host ("InputDir          : {0}" -f $InputDir)
Write-Host ("OutputDir         : {0}" -f $OutputDir)
Write-Host ("Exported wav count: {0}" -f $exportCount)
Write-Host ("Skipped exists    : {0}" -f $skipExistsCount)
Write-Host ("Missing wem count : {0}" -f $missingCount)
