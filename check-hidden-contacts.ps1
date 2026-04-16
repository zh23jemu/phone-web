$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$projectRoot = 'C:\Coding\phone-web'
$configPath = Join-Path $projectRoot 'phone\utils\hidden-contacts.js'

if (-not (Test-Path $configPath)) {
    throw "未找到隐藏联系人配置文件: $configPath"
}

$content = [System.IO.File]::ReadAllText($configPath)

function Get-JsArrayItems {
    param(
        [string]$Text,
        [string]$ArrayName
    )

    $pattern = "export const $ArrayName = \[(.*?)\];"
    $match = [System.Text.RegularExpressions.Regex]::Match(
        $Text,
        $pattern,
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )

    if (-not $match.Success) {
        throw "未找到数组: $ArrayName"
    }

    return [System.Text.RegularExpressions.Regex]::Matches($match.Groups[1].Value, "'([^']*)'") |
        ForEach-Object { $_.Groups[1].Value } |
        Where-Object { $_ -ne '' }
}

$hiddenNames = Get-JsArrayItems -Text $content -ArrayName 'HIDDEN_CONTACT_NAMES'
$hiddenPhones = Get-JsArrayItems -Text $content -ArrayName 'HIDDEN_CONTACT_PHONES'

$sql = @"
SELECT phone, name
FROM la_contacts
ORDER BY phone;
"@

$dbRows = $sql | docker exec -i phone-web-mysql mysql -uphone -pphone2025 -D phone -N

$dbContacts = @()
foreach ($row in $dbRows) {
    if ($row -match 'Using a password on the command line interface can be insecure') {
        continue
    }

    $parts = $row -split "`t"
    if ($parts.Count -ge 2) {
        $dbContacts += [PSCustomObject]@{
            Phone = $parts[0].Trim()
            Name  = $parts[1].Trim()
        }
    }
}

$missingPhones = @($dbContacts | Where-Object { $_.Phone -and ($hiddenPhones -notcontains $_.Phone) })
$missingNames = @($dbContacts | Where-Object { $_.Name -and ($hiddenNames -notcontains $_.Name) })

Write-Host "隐藏号码配置数: $($hiddenPhones.Count)"
Write-Host "隐藏名称配置数: $($hiddenNames.Count)"
Write-Host "数据库联系人数: $($dbContacts.Count)"
Write-Host ""

if ($missingPhones.Count -eq 0 -and $missingNames.Count -eq 0) {
    Write-Host "校验结果: 隐藏名单已与数据库联系人对齐" -ForegroundColor Green
    exit 0
}

Write-Host "校验结果: 存在未对齐项" -ForegroundColor Yellow

if ($missingPhones.Count -gt 0) {
    Write-Host ""
    Write-Host "缺少的隐藏号码:" -ForegroundColor Yellow
    $missingPhones | Sort-Object Phone -Unique | ForEach-Object {
        Write-Host "  $($_.Phone) -> $($_.Name)"
    }
}

if ($missingNames.Count -gt 0) {
    Write-Host ""
    Write-Host "缺少的隐藏名称:" -ForegroundColor Yellow
    $missingNames | Sort-Object Name -Unique | ForEach-Object {
        Write-Host "  $($_.Name) -> $($_.Phone)"
    }
}
