<#
Install the Pocket userChrome layer into the Firefox profile Firefox starts with (Windows).

  .\install.ps1                 copy chrome\*.css into the profile and turn on custom stylesheets
  .\install.ps1 -Fonts          also download Space Grotesk and Space Mono and install them for your user
  .\install.ps1 -ProfileDir <dir>  use this profile folder instead of the default one

Existing userChrome.css / userContent.css are backed up as *.bak-<timestamp> first.
Close Firefox before running it; the stylesheets load only at startup.
If scripts are blocked, run:  powershell -ExecutionPolicy Bypass -File .\install.ps1
#>
param([switch]$Fonts, [string]$ProfileDir)
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot

# The profile Firefox starts with: the Default= of the [Install…] section, else the [Profile…] marked Default=1.
function Find-Profile {
  $base = Join-Path $env:APPDATA 'Mozilla\Firefox'
  $ini = Join-Path $base 'profiles.ini'
  if (-not (Test-Path $ini)) { return $null }
  $section = ''; $install = $null; $path = $null; $fallback = $null
  foreach ($line in Get-Content $ini) {
    if ($line -match '^\[(.+)\]') { $section = $Matches[1]; continue }
    if ($line -notmatch '^([^=]+)=(.*)$') { continue }
    $k = $Matches[1]; $v = $Matches[2]
    if ($section -like 'Install*' -and $k -eq 'Default' -and -not $install) { $install = $v }
    elseif ($section -like 'Profile*' -and $k -eq 'Path') { $path = $v }
    elseif ($section -like 'Profile*' -and $k -eq 'Default' -and $v -eq '1') { $fallback = $path }
  }
  $rel = if ($install) { $install } else { $fallback }
  if (-not $rel) { return $null }
  if ([IO.Path]::IsPathRooted($rel)) { return $rel }
  return Join-Path $base ($rel -replace '/', '\')
}

if (-not $ProfileDir) { $ProfileDir = Find-Profile }
if (-not $ProfileDir -or -not (Test-Path $ProfileDir)) {
  throw "Couldn't find a Firefox profile. Open Firefox once, or pass -ProfileDir <dir> (about:support -> Profile Folder)."
}
if (Get-Process firefox -ErrorAction SilentlyContinue) {
  Write-Host 'Note: Firefox is running. Close every window before you check the result.'
}

$dest = Join-Path $ProfileDir 'chrome'
New-Item -ItemType Directory -Force $dest | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
foreach ($f in 'userChrome.css', 'userContent.css') {
  $src = Join-Path $here "chrome\$f"; $dst = Join-Path $dest $f
  if ((Test-Path $dst) -and (Get-FileHash $dst).Hash -ne (Get-FileHash $src).Hash) {
    Copy-Item $dst "$dst.bak-$stamp"
    Write-Host "backed up $f -> $f.bak-$stamp"
  }
  Copy-Item -Force $src $dst
}
Write-Host "copied chrome\ -> $dest"

# toolkit.legacyUserProfileCustomizations.stylesheets = true, via user.js (read at every startup)
$userJs = Join-Path $ProfileDir 'user.js'
if (-not ((Test-Path $userJs) -and (Select-String -Quiet -SimpleMatch 'toolkit.legacyUserProfileCustomizations.stylesheets' $userJs))) {
  Add-Content -Encoding ascii $userJs 'user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);'
  Write-Host 'turned on custom stylesheets in user.js'
}

if ($Fonts) {
  # Per-user install, no admin: copy into %LOCALAPPDATA%\Microsoft\Windows\Fonts and register under HKCU.
  $fontDir = Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\Fonts'
  $reg = 'HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Fonts'
  New-Item -ItemType Directory -Force $fontDir | Out-Null
  if (-not (Test-Path $reg)) { New-Item -Force $reg | Out-Null }
  $raw = 'https://raw.githubusercontent.com/google/fonts/main/ofl'
  $list = @(
    @('spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf', 'SpaceGrotesk[wght].ttf', 'Space Grotesk (TrueType)'),
    @('spacemono/SpaceMono-Regular.ttf', 'SpaceMono-Regular.ttf', 'Space Mono Regular (TrueType)'),
    @('spacemono/SpaceMono-Bold.ttf', 'SpaceMono-Bold.ttf', 'Space Mono Bold (TrueType)'),
    @('spacemono/SpaceMono-Italic.ttf', 'SpaceMono-Italic.ttf', 'Space Mono Italic (TrueType)'),
    @('spacemono/SpaceMono-BoldItalic.ttf', 'SpaceMono-BoldItalic.ttf', 'Space Mono Bold Italic (TrueType)')
  )
  foreach ($font in $list) {
    $out = Join-Path $fontDir $font[1]
    Invoke-WebRequest -UseBasicParsing "$raw/$($font[0])" -OutFile $out
    Set-ItemProperty -Path $reg -Name $font[2] -Value $out
    Write-Host "installed font $($font[1])"
  }
}

Write-Host 'Done. Restart Firefox (close every window) to see it.'
