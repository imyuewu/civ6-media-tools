<#
.SYNOPSIS
  Batch convert AVI to MP4 (H.264/AAC) with directory mirroring. (PS 5.1 compatible)

.USAGE
  & "...\convert_avi_2_mp4.ps1" "F:\...\Raw" "F:\...\Mp4"
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateNotNullOrEmpty()]
  [string]$InputDir,

  [Parameter(Mandatory = $true, Position = 1)]
  [ValidateNotNullOrEmpty()]
  [string]$OutputDir,

  [Parameter(Mandatory = $false)]
  [bool]$Recurse = $true,

  [Parameter(Mandatory = $false)]
  [bool]$Overwrite = $false,

  [Parameter(Mandatory = $false)]
  [ValidateRange(0, 51)]
  [int]$Crf = 18,

  [Parameter(Mandatory = $false)]
  [ValidateSet("ultrafast","superfast","veryfast","faster","fast","medium","slow","slower","veryslow")]
  [string]$Preset = "slow",

  [Parameter(Mandatory = $false)]
  [ValidatePattern('^\d+(k|M)?$')]
  [string]$AudioBitrate = "160k",

  [Parameter(Mandatory = $false)]
  [string]$FfmpegPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-FFmpeg {
  param([string]$UserPath)

  if ($UserPath) {
    $p = (Resolve-Path -LiteralPath $UserPath -ErrorAction Stop).Path
    if (-not (Test-Path -LiteralPath $p)) { throw "ffmpeg not found at: $p" }
    return $p
  }

  # Prefer PATH
  $cmd = Get-Command ffmpeg -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source) { return $cmd.Source }

  # Fallback: assume this script is under ...\MediaTools\Scripts\
  $scriptDir = Split-Path -Parent $PSCommandPath
  $fallbackRaw = Join-Path $scriptDir "..\ffmpeg\bin\ffmpeg.exe"
  $fallbackResolved = $null
  try {
    $fallbackResolved = (Resolve-Path -LiteralPath $fallbackRaw -ErrorAction Stop).Path
  } catch {
    $fallbackResolved = $null
  }

  if ($fallbackResolved -and (Test-Path -LiteralPath $fallbackResolved)) {
    return $fallbackResolved
  }

  throw "ffmpeg not found. Add ffmpeg to PATH or provide -FfmpegPath."
}

function Normalize-Dir {
  param([string]$Path)
  $p = (Resolve-Path -LiteralPath $Path -ErrorAction Stop).Path
  return $p.TrimEnd('\')
}

function Get-RelativePathSafe {
  param(
    [string]$BaseDir,
    [string]$FullPath
  )
  try {
    $rel = [System.IO.Path]::GetRelativePath($BaseDir, $FullPath)
    if ($rel.StartsWith("..")) { return "" }
    return $rel
  } catch {
    return ""
  }
}

# --- Resolve/normalize paths ---
$ffmpeg = Resolve-FFmpeg -UserPath $FfmpegPath
$inRoot = Normalize-Dir $InputDir

if (-not (Test-Path -LiteralPath $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}
$outRoot = Normalize-Dir $OutputDir

# --- Logging ---
$logDir = Join-Path $outRoot "_logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logFile = Join-Path $logDir ("convert_avi_2_mp4_" + $timestamp + ".log")

"=== convert_avi_2_mp4.ps1 ===" | Out-File -FilePath $logFile -Encoding UTF8
"InputDir : $inRoot"           | Out-File -FilePath $logFile -Append -Encoding UTF8
"OutputDir: $outRoot"          | Out-File -FilePath $logFile -Append -Encoding UTF8
"ffmpeg   : $ffmpeg"           | Out-File -FilePath $logFile -Append -Encoding UTF8
"Video    : libx264 preset=$Preset crf=$Crf pix_fmt=yuv420p" | Out-File -FilePath $logFile -Append -Encoding UTF8
"Audio    : aac $AudioBitrate" | Out-File -FilePath $logFile -Append -Encoding UTF8
"Recurse  : $Recurse"          | Out-File -FilePath $logFile -Append -Encoding UTF8
"Overwrite: $Overwrite"        | Out-File -FilePath $logFile -Append -Encoding UTF8
"" | Out-File -FilePath $logFile -Append -Encoding UTF8

Write-Host "=========================================="
Write-Host "Input : $inRoot"
Write-Host "Output: $outRoot"
Write-Host "ffmpeg: $ffmpeg"
Write-Host "Video : libx264 preset=$Preset crf=$Crf"
Write-Host "Audio : aac $AudioBitrate"
Write-Host "Recurse : $Recurse"
Write-Host "Overwrite: $Overwrite"
Write-Host "Log   : $logFile"
Write-Host "==========================================`n"

# --- Enumerate AVI files ---
$files = if ($Recurse) {
  Get-ChildItem -LiteralPath $inRoot -Filter *.avi -File -Recurse
} else {
  Get-ChildItem -LiteralPath $inRoot -Filter *.avi -File
}

$total = 0; $ok = 0; $skipped = 0; $fail = 0

foreach ($f in $files) {
  $total++

  $src = $f.FullName
  $srcDir = $f.DirectoryName

  $relDir = Get-RelativePathSafe -BaseDir $inRoot -FullPath $srcDir
  $targetDir = if ([string]::IsNullOrWhiteSpace($relDir)) { $outRoot } else { Join-Path $outRoot $relDir }

  if (-not (Test-Path -LiteralPath $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
  }

  $dst = Join-Path $targetDir ($f.BaseName + ".mp4")

  if ((-not $Overwrite) -and (Test-Path -LiteralPath $dst)) {
    $skipped++
    $msg = "[SKIP] $src -> $dst (exists)"
    Write-Host $msg
    $msg | Out-File -FilePath $logFile -Append -Encoding UTF8
    continue
  }

  $msg = "[DO]   $src -> $dst"
  Write-Host $msg
  $msg | Out-File -FilePath $logFile -Append -Encoding UTF8

  $yFlag = if ($Overwrite) { "-y" } else { "-n" }

  $args = @(
    $yFlag, "-hide_banner", "-loglevel", "error",
    "-i", $src,
    "-c:v", "libx264", "-preset", $Preset, "-crf", "$Crf", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", $AudioBitrate,
    $dst
  )

  try {
    $p = Start-Process -FilePath $ffmpeg -ArgumentList $args -NoNewWindow -Wait -PassThru
    if ($p.ExitCode -ne 0) { throw "ffmpeg exit code: $($p.ExitCode)" }

    $ok++
    $msg = "[OK]   $($f.Name)"
    Write-Host $msg
    $msg | Out-File -FilePath $logFile -Append -Encoding UTF8
  }
  catch {
    $fail++
    $err = $_.Exception.Message
    $msg = "[FAIL] $($f.Name) :: $err"
    Write-Host $msg
    $msg | Out-File -FilePath $logFile -Append -Encoding UTF8

    $diag = Join-Path $logDir ("ffmpeg_err_" + $timestamp + "_" + $total + ".txt")
    try {
      & $ffmpeg @args 2> $diag | Out-Null
      "  stderr saved: $diag" | Out-File -FilePath $logFile -Append -Encoding UTF8
    } catch { }
  }

  "" | Out-File -FilePath $logFile -Append -Encoding UTF8
}

Write-Host "`n-------- Summary --------"
Write-Host "Total   : $total"
Write-Host "OK      : $ok"
Write-Host "Skipped : $skipped"
Write-Host "Failed  : $fail"
Write-Host "-------------------------"
"-------- Summary --------" | Out-File -FilePath $logFile -Append -Encoding UTF8
"Total   : $total"         | Out-File -FilePath $logFile -Append -Encoding UTF8
"OK      : $ok"            | Out-File -FilePath $logFile -Append -Encoding UTF8
"Skipped : $skipped"       | Out-File -FilePath $logFile -Append -Encoding UTF8
"Failed  : $fail"          | Out-File -FilePath $logFile -Append -Encoding UTF8
