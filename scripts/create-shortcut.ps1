# Creates a Desktop shortcut that launches the D2R Offline Item Tracker.
# Uses the Diablo II: Resurrected game icon when D2R.exe can be found.
$ErrorActionPreference = 'Stop'

# scripts/ -> project root
$projectDir = Split-Path -Parent $PSScriptRoot
$target = Join-Path $projectDir 'start-web.cmd'
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'D2R Item Tracker.lnk'

# Look for D2R.exe to reuse the game's icon (optional).
$iconCandidates = @(
  'C:\Program Files (x86)\Diablo II Resurrected\D2R.exe',
  'C:\Program Files\Diablo II Resurrected\D2R.exe',
  (Join-Path $env:ProgramFiles 'Diablo II Resurrected\D2R.exe'),
  (Join-Path ${env:ProgramFiles(x86)} 'Diablo II Resurrected\D2R.exe')
)
$icon = $iconCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

$shell = New-Object -ComObject WScript.Shell
$sc = $shell.CreateShortcut($shortcutPath)
$sc.TargetPath = $target
$sc.WorkingDirectory = $projectDir
$sc.Description = 'D2R Offline Item Tracker'
if ($icon) { $sc.IconLocation = "$icon,0" }
$sc.Save()

Write-Host "Shortcut created: $shortcutPath"
if ($icon) { Write-Host "Icon: $icon" } else { Write-Host "D2R.exe not found - default icon used." }
