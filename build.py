"""Zip the Pocket static theme for Firefox (about:debugging or AMO). Python 3 stdlib only, no build step.

    python build.py

Writes three packages to dist/, each with manifest.json at the root of the zip:
  pocket-<version>.zip        P9 Cream when Firefox is light, P11 Night when it's dark (theme + dark_theme)
  pocket-cream-<version>.zip  P9 Cream only
  pocket-night-<version>.zip  P11 Night only
The single-palette ones get their own add-on IDs, so AMO treats them as separate themes.
"""

import copy
import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
THEME = ROOT / "theme"
DIST = ROOT / "dist"
STAMP = (2026, 11, 1, 0, 0, 0)  # fixed timestamps, so the same files always make the same zip


def variants(manifest):
    """The combined theme and its two single-palette cuts."""
    yield "pocket", manifest
    gecko = manifest["browser_specific_settings"]["gecko"]
    for key, name, palette in (("cream", "Pocket Cream", manifest["theme"]), ("night", "Pocket Night", manifest["dark_theme"])):
        m = copy.deepcopy(manifest)
        m.pop("dark_theme")
        m["theme"] = copy.deepcopy(palette)
        m["name"] = name
        m["description"] = f"Collegiapp's Pocket look in {name.split()[1]} only."
        m["browser_specific_settings"]["gecko"]["id"] = gecko["id"].replace("pocket-theme@", f"pocket-{key}-theme@")
        yield f"pocket-{key}", m


def assets(manifest):
    """Every file the manifest points at, relative to theme/."""
    found = set(manifest.get("icons", {}).values())
    for block in ("theme", "dark_theme"):
        images = manifest.get(block, {}).get("images", {})
        for value in images.values():
            found.update(value if isinstance(value, list) else [value])
    return sorted(p for p in found if isinstance(p, str))


def main():
    manifest = json.loads((THEME / "manifest.json").read_text(encoding="utf-8"))
    DIST.mkdir(exist_ok=True)
    for stem, m in variants(manifest):
        files = assets(m)
        missing = [f for f in files if not (THEME / f).is_file()]
        if missing:
            sys.exit(f"{stem}: missing {', '.join(missing)}")
        out = DIST / f"{stem}-{m['version']}.zip"
        with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr(zipfile.ZipInfo("manifest.json", STAMP), json.dumps(m, indent=2, ensure_ascii=False) + "\n", zipfile.ZIP_DEFLATED)
            for f in files:
                z.writestr(zipfile.ZipInfo(f, STAMP), (THEME / f).read_bytes(), zipfile.ZIP_DEFLATED)
        print(f"{out.relative_to(ROOT)}  ({len(files) + 1} files)")


if __name__ == "__main__":
    main()
