#!/usr/bin/env bash
# Install the Pocket userChrome layer into the Firefox profile Firefox starts with (macOS and Linux).
#
#   ./install.sh            copy chrome/*.css into the profile and turn on custom stylesheets
#   ./install.sh --fonts    also download Space Grotesk and Space Mono into your user fonts folder
#   ./install.sh --profile <dir>   use this profile folder instead of the default one
#
# Existing userChrome.css / userContent.css are backed up as *.bak-<timestamp> first.
# Quit Firefox before running it; the stylesheets load only at startup.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
FONTS=0
PROFILE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --fonts) FONTS=1 ;;
    --profile) PROFILE="$2"; shift ;;
    -h|--help) sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

# The profile Firefox starts with: the Default= of the [Install…] section, else the [Profile…] marked Default=1.
find_profile() {
  local base ini
  for base in "$HOME/Library/Application Support/Firefox" "$HOME/.mozilla/firefox" \
              "$HOME/snap/firefox/common/.mozilla/firefox" "$HOME/.var/app/org.mozilla.firefox/.mozilla/firefox"; do
    ini="$base/profiles.ini"
    [ -f "$ini" ] || continue
    local rel
    rel="$(awk -F= '
      /^\[/ { sec = $0; next }
      sec ~ /^\[Install/ && $1 == "Default" { print $2; found = 1; exit }
      sec ~ /^\[Profile/ && $1 == "Path" { path = $2 }
      sec ~ /^\[Profile/ && $1 == "Default" && $2 == "1" { fallback = path }
      END { if (!found && fallback != "") print fallback }
    ' "$ini" | tr -d '\r')"
    [ -n "$rel" ] || continue
    case "$rel" in /*) echo "$rel" ;; *) echo "$base/$rel" ;; esac
    return 0
  done
  return 1
}

if [ -z "$PROFILE" ]; then
  PROFILE="$(find_profile)" || { echo "Couldn't find a Firefox profile. Open Firefox once, or pass --profile <dir> (about:support → Profile Folder)." >&2; exit 1; }
fi
[ -d "$PROFILE" ] || { echo "Profile folder not found: $PROFILE" >&2; exit 1; }

if pgrep -xi firefox >/dev/null 2>&1; then
  echo "Note: Firefox is running. Quit it completely before you check the result."
fi

DEST="$PROFILE/chrome"
mkdir -p "$DEST"
STAMP="$(date +%Y%m%d-%H%M%S)"
for f in userChrome.css userContent.css; do
  if [ -f "$DEST/$f" ] && ! cmp -s "$DEST/$f" "$HERE/chrome/$f"; then
    cp "$DEST/$f" "$DEST/$f.bak-$STAMP"
    echo "backed up $f → $f.bak-$STAMP"
  fi
  cp "$HERE/chrome/$f" "$DEST/$f"
done
echo "copied chrome/ → $DEST"

# toolkit.legacyUserProfileCustomizations.stylesheets = true, via user.js (read at every startup)
PREF='user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);'
if ! grep -qs 'toolkit.legacyUserProfileCustomizations.stylesheets' "$PROFILE/user.js"; then
  echo "$PREF" >> "$PROFILE/user.js"
  echo "turned on custom stylesheets in user.js"
fi

if [ "$FONTS" = 1 ]; then
  case "$(uname -s)" in
    Darwin) FONTDIR="$HOME/Library/Fonts" ;;
    *) FONTDIR="${XDG_DATA_HOME:-$HOME/.local/share}/fonts" ;;
  esac
  mkdir -p "$FONTDIR"
  RAW="https://raw.githubusercontent.com/google/fonts/main/ofl"
  for path in "spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf" spacemono/SpaceMono-Regular.ttf spacemono/SpaceMono-Bold.ttf \
              spacemono/SpaceMono-Italic.ttf spacemono/SpaceMono-BoldItalic.ttf; do
    name="$(basename "$path" | sed 's/%5B/[/; s/%5D/]/')"
    curl -fsSL "$RAW/$path" -o "$FONTDIR/$name"
    echo "installed font $name"
  done
  command -v fc-cache >/dev/null 2>&1 && fc-cache -f "$FONTDIR" >/dev/null || true
fi

echo "Done. Restart Firefox (quit every window) to see it."
