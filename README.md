# Pocket for Firefox

Collegiapp's Pocket look for Firefox: **P9 Cream** when Firefox is light, **P11 Night** when it's dark. It comes in two layers. You can use the first on its own.

| layer | what it does | files |
|---|---|---|
| **Static theme** | Pocket colours on every themeable part: the dot-grid device body behind the tabs, the graphite selected tab, module-coloured toolbars, recessed fields with the orange focus ring, panels, menus, sidebar and the new-tab background | `theme/` → `dist/*.zip` |
| **userChrome / userContent** | What a theme can't do: Space Grotesk text, B8 keys for the toolbar buttons, program-key tabs, the LCD inlay on the URL bar, F3 label bands on panel and sidebar headers, key-cap legends in menus, pixel-icon window keys, a Pocket new-tab page and a Pocket PDF viewer | `chrome/` |

Every value comes from the kit in `uikit/` (`uikit/docs/UIKit/README.md`), which is a snapshot of Collegiapp's kit taken on 2026-11-01. The few derived values are the kit's own formulas worked out to hex, because a theme can't use `color-mix()`: the 16 % accent wash (`popup_highlight`, `sidebar_highlight`), the 32 % selection (`toolbar_field_highlight`), the 12 % dot grid, and Night's orange rim on the pressed key (`tab_line`). Nothing is drawn over text, and body text stays at 4.5:1 or better in both palettes. The LCD text is 7.5:1 on Cream and 6.6:1 on Night.

The CSS was written against **Firefox 159** with its Nova design on, which is the default. It hooks into Firefox's own design tokens wherever they exist, so small Firefox updates mostly carry over. It was made on Windows; on macOS everything applies except the window keys, which stay as the native traffic lights.

## Quick start on a new machine

Quit Firefox first. Then clone and run the installer. It finds the profile Firefox starts with, copies `chrome/` into it (backing up any `userChrome.css` / `userContent.css` already there) and turns on custom stylesheets. `-Fonts` / `--fonts` also installs Space Grotesk and Space Mono for your user, no admin needed.

**Windows** (PowerShell):

```powershell
git clone https://github.com/imanimal/pocket-firefox.git
cd pocket-firefox
powershell -ExecutionPolicy Bypass -File .\install.ps1 -Fonts
```

**macOS / Linux**:

```bash
git clone https://github.com/imanimal/pocket-firefox.git
cd pocket-firefox
./install.sh --fonts
```

Start Firefox again, then add the static theme (section 1): take the zip from this repo's [Releases](https://github.com/imanimal/pocket-firefox/releases) or build it with `python build.py`. To pick up changes later, `git pull` and run the installer again. If you have more than one profile, pass `-ProfileDir <dir>` / `--profile <dir>` with the folder from `about:support` → *Profile Folder*.

## 1. The static theme

### Try it now (until Firefox restarts)

1. Go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and pick `theme\manifest.json`.

It follows the system: Cream in light mode, Night in dark mode (Windows: Settings → Personalization → Colors → *Choose your mode*; macOS: System Settings → Appearance). To switch back, pick another theme in `about:addons` → Themes.

### Keep it (free signing through AMO, unlisted)

Release Firefox only installs signed add-ons. Mozilla signs unlisted themes for free, and they never appear on the public site.

1. Build the zips:

   ```bash
   python build.py
   ```

   (`python3 build.py` on macOS.) The same zips are attached to each GitHub release.

   This writes `dist\pocket-1.0.0.zip` (both palettes) plus `dist\pocket-cream-1.0.0.zip` and `dist\pocket-night-1.0.0.zip`. Use one of the single-palette zips if you want Pocket's look to stay Cream or Night whatever the system is set to.
2. Sign in at https://addons.mozilla.org/developers/ and choose **Submit a New Add-on**. When it asks how to distribute, pick **On your own**. Upload the zip.
3. When it's signed (usually within minutes), download the `.xpi`. Then in `about:addons`, click the gear → **Install Add-on From File…** and pick it.

Each zip has its own add-on ID (`pocket-theme@collegiapp`, `pocket-cream-theme@collegiapp`, `pocket-night-theme@collegiapp`). For an update, raise `version` in `theme/manifest.json`, rebuild, and upload the new zip as a new version of the same add-on.

## 2. userChrome.css and userContent.css

The installers in *Quick start* do both steps below for you. To do them by hand:

### Turn on custom stylesheets (once)

1. Go to `about:config` and accept the warning.
2. Search for `toolkit.legacyUserProfileCustomizations.stylesheets` and set it to **true**.

### Copy `chrome\` into your profile

Your profile folder is listed in `about:support` → *Profile Folder* → **Open Folder**. It's `%APPDATA%\Mozilla\Firefox\Profiles\<something>.default-release` on Windows and `~/Library/Application Support/Firefox/Profiles/<something>.default-release` on macOS.

Copy this project's `chrome` folder into it, so that `userChrome.css` ends up at `<profile>\chrome\userChrome.css`. Or, on Windows, run this in PowerShell, which finds the profile Firefox starts with:

```powershell
$ini = Get-Content "$env:APPDATA\Mozilla\Firefox\profiles.ini"
$prof = ($ini | Select-String '^Default=Profiles/' | Select-Object -First 1).Line.Split('=')[1]
$dest = Join-Path "$env:APPDATA\Mozilla\Firefox" "$prof\chrome"
New-Item -ItemType Directory -Force $dest | Out-Null
Copy-Item -Force "$PWD\chrome\*.css" $dest
$dest
```

Run it from this folder. It overwrites any `userChrome.css` or `userContent.css` already in that profile, so back up yours first if you have them. Then **restart Firefox** (close every window), because the stylesheets load only at startup.

### Fonts

The chrome layer uses **Space Grotesk** for text and **Space Mono** for key legends and counts, the kit's T6 families. Both are free, OFL-licensed Google Fonts:

- https://fonts.google.com/specimen/Space+Grotesk
- https://fonts.google.com/specimen/Space+Mono

The installers' `-Fonts` / `--fonts` option fetches them from Google Fonts' repository. By hand: on each page, click **Get font** → **Download all**, unzip, select the `.ttf` files, then right-click → **Install** on Windows (no admin needed) or double-click → **Install** in Font Book on macOS. Restart Firefox afterwards. Without them, text falls back to Segoe UI Variable (San Francisco on macOS) and legends to Cascadia Mono (SF Mono or Menlo), and everything still works. Doto, the LCD numeral face, isn't used here, because Firefox's chrome has no countdowns to show.

## Where to look

With both layers on, here's what should be Pocket:

- **Tab strip.** The cream (or night) device body with the 16 px dot grid. Every tab is a program key: a surface key on a 2 px lip. The selected tab is the pressed key: graphite with light text and a black rim on Cream, an orange rim on Night. Switching tabs makes the key travel down and spring back, and its favicon flickers on like an LED.
- **Toolbar buttons.** Raised B8 keys with a 1 px ring, a 3 px lip and a soft shadow. They sink when pressed, spring back past the top when released, and stay down while their menu is open. A toggle that's on (for example the sidebar button) becomes the dark key with an orange icon. The toolbar is no taller than before.
- **URL bar.** At rest it's the LCD: a reflective green panel on Cream or a backlit teal one on Night, with a dot-matrix texture, dark text and a graphite bezel. Click into it and it becomes a plain recessed field with an orange ring, so you type and read results on a solid surface. The results list uses the accent wash for the selected row.
- **Menus and panels.** Space Grotesk text, rounded modules with a 2 px lip, and shortcuts shown as small Space Mono key caps. Sub-panels (Bookmarks, History, Extensions …) have a graphite label band with an uppercase title.
- **Sidebar** (`Ctrl+B`). The same graphite band across its header, with an orange icon.
- **Window keys** (top right). Minimize, maximize/restore and close are small keys with Pocket's 9×9 pixel icons. Close turns red under the pointer. Hit areas and Windows 11 snap layouts are unchanged.
- **New tab** (`Ctrl+T`). The dot-grid desk with a recessed search field and an orange focus ring. If you turn shortcuts or stories back on, shortcuts become keys, section titles become graphite bands and stories become module cards. A wallpaper chosen in Personalize replaces the dot grid.
- **PDF viewer** (open any PDF). The pages sit on the dot-grid desk, each lifted on a module lip, and are never recoloured. The toolbar buttons are B8 keys, and a toggle that's on (sidebar, an editing tool) is the dark key with an orange icon. The page number is an LCD inlay that turns into a recessed field when you click it. The sidebar header has a graphite label band, and the current thumbnail gets an orange ring with an orange page chip. The find bar, the tools menu (`>>`) and dialogs are modules, menu rows use the accent wash, and find matches and selections are orange. The text layer keeps the document's own font metrics, so selecting text still lines up. High-contrast mode is left to Firefox.
- **Reduced motion.** With Windows' *Animation effects* off (Settings → Accessibility → Visual effects), keys still change state but nothing moves.

If something looks wrong, delete the `chrome` folder from the profile and restart Firefox. That fully undoes the second layer, and the theme stays as it is.

## Files

```
theme/manifest.json      static theme: theme (P9 Cream) + dark_theme (P11 Night)
theme/images/            the 16 px dot-grid tile for each palette
theme/icons/pocket.svg   add-on icon: the logo LCD with the 9×9 "now" icon
chrome/userChrome.css    browser chrome layer
chrome/userContent.css   new tab and home page layer, and the PDF viewer
build.py                 zips the theme into dist/ (Python 3 stdlib)
install.ps1, install.sh  copy chrome/ into your Firefox profile (Windows; macOS and Linux)
uikit/                   the Pocket kit snapshot (see uikit/SYNC.md)
```

When a palette value changes in Collegiapp, refresh `uikit/` (see `uikit/SYNC.md`), then update `theme/manifest.json` and the `light-dark()` token blocks: the one at the top of each CSS file, plus the PDF viewer's own block at the end of `userContent.css`.
