# 加载 ImportExcel 模块
Import-Module ImportExcel

# ========== 配置：修改为你自己的路径 ==========
$VgmstreamCli = "D:\MediaTools\vgmstream\vgmstream-cli.exe"  # 修改为自己的 vgmstream 路径
$InputDir = "F:\Civ6_Assets\Audio\Expansion2\test_from"   # 修改为你的输入目录
$OutputDir = "F:\Civ6_Assets\Audio\Expansion2\test_out_new"   # 修改为你的输出目录
# ======================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# 确保目录存在
function Ensure-Directory([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

# 清理文件名（防止非法字符）
function Sanitize-FileName([string]$name) {
  $invalid = [IO.Path]::GetInvalidFileNameChars()
  foreach ($ch in $invalid) { $name = $name.Replace($ch, '_') }
  return $name
}

# 获取 Xml 节点的文本内容
function Get-XmlInnerText([System.Xml.XmlNode]$node, [string]$xpath) {
  if ($null -eq $node) { return $null }
  $n = $node.SelectSingleNode($xpath)
  if ($null -eq $n) { return $null }
  return $n.InnerText
}

# 获取相对目录路径
function Get-RelativeDir([string]$baseDir, [string]$fullPath) {
  $base = (Resolve-Path -LiteralPath $baseDir).Path.TrimEnd('\')
  $full = (Resolve-Path -LiteralPath $fullPath).Path
  if ($full.Length -le $base.Length) { return "" }
  if ($full.Substring(0, $base.Length).ToLowerInvariant() -ne $base.ToLowerInvariant()) { return "" }
  $rel = $full.Substring($base.Length).TrimStart('\')
  return (Split-Path -Parent $rel)
}

# 解析 SoundBank 文件并执行转换
function Process-SoundBank($xmlFile, $inputDir, $outputDir, [ref]$missingWemList) {
  [xml]$doc = Get-Content -LiteralPath $xmlFile
  $soundBanks = $doc.SelectNodes("//SoundBanks/SoundBank")

  foreach ($bank in $soundBanks) {
    $bankId = $bank.GetAttribute("Id")
    $bankShortName = Get-XmlInnerText $bank "./ShortName"

    # 创建 Bank 文件夹
    $bankFolder = Join-Path $outputDir $bankShortName
    Ensure-Directory $bankFolder

    # 处理 <ReferencedStreamedFiles> 下的 File 节点
    $files = $bank.SelectNodes("./ReferencedStreamedFiles/File")
    foreach ($f in $files) {
      $fileId = $f.GetAttribute("Id")
      $shortName = Get-XmlInnerText $f "./ShortName"
      $relPath = Get-XmlInnerText $f "./Path"

      if (-not $fileId) { continue }
      $shortName = Sanitize-FileName $shortName

      $wemPath = Resolve-WemPath -baseDir $inputDir -fileId $fileId -xmlRelativePath $relPath
      if (-not $wemPath) {
        $missingWemList.Add([pscustomobject]@{ WemId = $fileId; ShortName = $shortName })
        continue
      }

      # 获取相对目录并创建文件夹
      $relDir = Get-RelativeDir -baseDir $inputDir -fullPath $wemPath
      $outSubDir = if ($relDir) { Join-Path $bankFolder $relDir } else { $bankFolder }
      Ensure-Directory $outSubDir

      $outWav = Join-Path $outSubDir "$shortName.wav"

      # 转换 .wem 为 .wav
      if (-not (Test-Path -LiteralPath $outWav)) {
        & $VgmstreamCli -o $outWav $wemPath | Out-Null
      }
    }

    # 记录 IncludedMemoryFiles
    $memoryFiles = $bank.SelectNodes("./IncludedMemoryFiles/File")
    if ($memoryFiles) {
      $memoryFileData = @()
      foreach ($mf in $memoryFiles) {
        $fileId = $mf.GetAttribute("Id")
        $shortName = Get-XmlInnerText $mf "./ShortName"
        $memoryFileData += [pscustomobject]@{ FileId = $fileId; ShortName = $shortName }
      }

      if ($memoryFileData.Count -gt 0) {
        $memoryFilePath = Join-Path $bankFolder "included_memory_files.xlsx"
        $memoryFileData | Export-Excel -Path $memoryFilePath -AutoSize -WorksheetName "MemoryFiles"
      }
    }
  }
}

# 记录 Event 和 SoundBank 映射
function Record-EventMapping($xmlFile, $eventMap) {
  [xml]$doc = Get-Content -LiteralPath $xmlFile
  $soundBanks = $doc.SelectNodes("//SoundBanks/SoundBank")

  foreach ($bank in $soundBanks) {
    $events = $bank.SelectNodes("./IncludedEvents/Event")
    foreach ($ev in $events) {
      $evId = $ev.GetAttribute("Id")
      $evName = $ev.GetAttribute("Name")
      $bankShortName = Get-XmlInnerText $bank "./ShortName"

      if ($eventMap.ContainsKey($evId)) {
        $eventMap[$evId].SoundBanks += $bankShortName
      } else {
        $eventMap[$evId] = [pscustomobject]@{ EventId = $evId; EventName = $evName; SoundBanks = @($bankShortName) }
      }
    }
  }
}

# 主程序
$missingWemList = New-Object System.Collections.Generic.List[Object]
$eventMap = @{}

# 递归处理所有 XML 文件
$xmlFiles = Get-ChildItem -Path $InputDir -Filter "*.xml" -File -Recurse
foreach ($xf in $xmlFiles) {
  Process-SoundBank $xf.FullName $InputDir $OutputDir ([ref]$missingWemList)
  Record-EventMapping $xf.FullName $eventMap
}

# 导出缺失的 .wem 文件
if ($missingWemList.Count -gt 0) {
  $missingWemList | Export-Excel -Path (Join-Path $OutputDir "missing_wem.xlsx") -AutoSize -WorksheetName "MissingWem"
}

# 导出 Event 和 SoundBank 映射
$eventMappingList = @()
foreach ($ev in $eventMap.Values) {
  $eventMappingList += [pscustomobject]@{ EventId = $ev.EventId; EventName = $ev.EventName; SoundBanks = ($ev.SoundBanks -join ", ") }
}
$eventMappingList | Export-Excel -Path (Join-Path $OutputDir "events.xlsx") -AutoSize -WorksheetName "EventMappings"

Write-Host "Done!"
Write-Host "Missing .wem file info saved to missing_wem.xlsx"
Write-Host "Event mapping saved to events.xlsx"
