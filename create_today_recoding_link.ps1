# CreateTodayRecordingLink.ps1
# 功能：创建当天文件夹，并把 Inbox_Recording\Today 指向当天文件夹
# 逻辑：优先 SymbolicLink（需要管理员或开发者模式），失败则自动改用 Junction（通常不需要管理员）

$root = "F:\Civ6_Recordings\Inbox_Recording"
$linkName = "Today"
$today = Get-Date -Format "yyyy-MM-dd"

$todayDir = Join-Path $root $today
$linkPath = Join-Path $root $linkName

function New-DirectoryIfMissing {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Remove-ExistingLink {
    param([Parameter(Mandatory)][string]$Path)
    if (Test-Path -LiteralPath $Path) {
        $item = Get-Item -LiteralPath $Path -Force
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
            Remove-Item -LiteralPath $Path -Force
        } else {
            throw "路径已存在但不是链接：$Path 。请先手动改名或删除，避免误删真实文件夹。"
        }
    }
}

# 1) 确保目录存在
New-DirectoryIfMissing -Path $root
New-DirectoryIfMissing -Path $todayDir

# 2) 删除旧链接（如果存在）
Remove-ExistingLink -Path $linkPath

# 3) 创建链接：SymbolicLink 失败则 Junction
$method = $null
try {
    New-Item -ItemType SymbolicLink -Path $linkPath -Target $todayDir -ErrorAction Stop | Out-Null
    $method = "SymbolicLink"
} catch {
    # 回退：Junction（目录联接），通常无需管理员权限
    New-Item -ItemType Junction -Path $linkPath -Target $todayDir -ErrorAction Stop | Out-Null
    $method = "Junction"
}

# 4) 最终校验：确保链接真的存在
if (-not (Test-Path -LiteralPath $linkPath)) {
    throw "创建链接失败：$linkPath 未生成。"
}

Write-Host "✅ 今日目录已就绪：$todayDir"
Write-Host "✅ 已创建/更新链接：$linkPath -> $todayDir （方式：$method）"
Write-Host "👉 OBS 输出路径固定为：$linkPath\"
