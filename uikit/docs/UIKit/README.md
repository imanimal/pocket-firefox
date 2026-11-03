# Pocket UI kit

The parts Collegiapp is built from, the rules for using them, and where each one lives in the code. Pocket is the only design (`CAPP1 L6 P9 B8 F3 T6 G2 M2 D3 C2 s4 g0 f0 n0 a0 v0 mN bN S1`), in two palettes: **P9 Cream** (light) and **P11 Night** (dark).

- **This file** is the reference: tokens, type, icons, components, layouts, motion, writing, and a checklist for new parts.
- **[`index.html`](index.html)** is the live sheet. It loads the real `ui/css/pocket.css` and draws the real pixel icons from `ui/js/app.js`, so it always shows what ships. Open the file in a browser (no server needed), or serve the repository root (`python -m http.server 4798 --bind 127.0.0.1`, the `uikit` entry in `.claude/launch.json`) and go to http://127.0.0.1:4798/docs/UIKit/. It has a Cream/Night switch and a key-legend switch, and the responsive specimens have a drag handle at their bottom-right corner so you can watch them fold.

The code is the source of truth. If this kit and `pocket.css` disagree, `pocket.css` is right and this file needs updating.

## 1. Principles

| rule | what it means in practice |
|---|---|
| **Readability first** | Body text is Space Grotesk in sentence case on a solid surface. Nothing is drawn over it: no glow, scanlines, gradients or textures. |
| **Retro is contained** | The handheld character lives in four places only: LCD inlays (`.display`), B8 keys, F3 label bands and 9×9 pixel icons. |
| **One obvious next step** | Each region has at most one orange (`.primary`) key. Everything else is a plain key, a dark key or a ghost. |
| **Say why** | Rankings and states explain themselves: reasons as chips, due states as words ("in 3h", "2h overdue"), never colour alone. |
| **Undo, don't confirm** | Destructive actions run at once and toast with Undo. The only deliberate friction is the Lockdown exit phrase and answering a takeover. |
| **Few clicks** | Every central action is a key on screen and a keyboard key (Q, F, X, S, N, 1–0, Ctrl+K, Esc). |
| **Follow the room** | Layouts follow the screen container and components follow their region (container queries), not the window. |

## 2. Colour

Palettes are defined once, in `PALETTES` in `ui/js/lab.js`, which writes every value as a custom property on `:root` and sets `data-scheme="light|dark"`. `ui/css/pocket.css` derives the short names components use (`--surface`, `--text`, `--accent` …) from the palette's `p-*` values.

**Use the Pocket names below in components.** The older theme-format tokens (`--fg`, `--dim`, `--hi`, `--acc`, `--sel-*`, `--hot`, `--hover-bg`, `--shadow`, `--t-*`, `--glow-rgb`) stay in the palettes for theme packs (`docs/THEME_FORMAT.md`) and the CRT layer; new Pocket parts don't read them.

### Surfaces and text

| token | used for | P9 Cream | P11 Night |
|---|---|---|---|
| `--bg` | the device body behind modules (with the 16 px dot grid) | `#e6e2d8` | `#1a1917` |
| `--bg2` | recessed things: inputs, filter box, location banner, quick-add field | `#fbf9f4` | `#2a2926` |
| `--surface` | module and card fill | `#f6f3ec` | `#262522` |
| `--surface-2` | key faces, wells, idle pills, week columns | `#ebe7dd` | `#302e2a` |
| `--line` | hairlines, key rings and lips, dividers | `#d3ccbd` | `#3f3c36` |
| `--text` | titles and anything you must read first | `#1b1915` | `#f4efe5` |
| `--text-2` | body text, key labels on plain keys | `#4a453c` | `#d0c9ba` |
| `--text-3` | meta, placeholders, idle icons | `#6a645a` | `#a39c8d` |
| `--chrome-bg` / `--chrome-fg` | label bands, dark keys, LCD bezels, the pressed program key | `#2a2722` / `#f6f3ec` | `#0f0e0d` / `#ece6da` |
| `--desk-c` | the page outside the screen; the window's `theme-color` | `#e6e2d8` | `#141311` |

### Accent and states

| token | used for | P9 | P11 |
|---|---|---|---|
| `--accent` | the one primary key, the Do first band, selection, focus rings, icons on bands | `#ff5b1f` | `#ff6a2b` |
| `--on-accent` | text on accent | `#1b1915` | `#1b1915` |
| `--accent-soft` | 16 % accent wash: selected row, active chip, live strip, today's week column | derived | derived |
| `--warn` | due soon, priority marks | `#9a5b00` | `#f0b54a` |
| `--warn-ink` | "due soon" text on its own wash (`.duepill.soon`, the quick-add "auto" hint): `--warn` 75 % mixed with `--text` | derived | derived |
| `--bad` | overdue, destructive, alert band, takeover | `#c8341b` | `#ff7a5c` |
| `--on-bad` | text and glyphs on a `--bad` fill (alert band, the pressed close key) | `#fff` | `#1b1915` |
| `--ok` | done (swipe hint) | `#2e7d32` | `#62c470` |
| `--acc2` | events on the timeline, course tokens in the quick-add highlight | `#2f6fde` | `#7aa5ff` |

Orange means "this is the thing to do". Don't use it for decoration, links or a second action in the same region.

### LCD

| token | used for | P9 (reflective) | P11 (backlit) |
|---|---|---|---|
| `--disp-bg` / `--disp-fg` | every LCD inlay, the logo, today's week chip | `#b1bd93` / `#1f2a17` | `#45b3a1` / `#04211c` |
| `--disp-hot` | LCD backlight when something is due soon (`.display.hot`) | `#e9b45a` | `#e2b04f` |
| `--disp-bad` | LCD backlight when overdue or late (`.display.bad`, `.lb-leave.late`) | `#ee8f6e` | `#ef8b6c` |
| `--p-island` | island ring, countdown and presence accent | `#ff7a3d` | `#ff7a3d` |

### Course colours

A course's `color` (1–6) picks `--k1`…`--k6`. Components read it as `--kc`, which `kc(course)` in app.js sets inline (`style="--kc: var(--k2)"`): the dot in `.cchip` and `.chip.course`, the bar in agenda rows, the left edge of week items, course cards and location banners.

| | k1 | k2 | k3 | k4 | k5 | k6 |
|---|---|---|---|---|---|---|
| P9 | `#2f6fde` | `#ff5b1f` | `#2e8b57` | `#b03aa8` | `#c27a00` | `#5b5548` |
| P11 | `#7aa5ff` | `#ff7a3d` | `#4fbf86` | `#d77bd0` | `#e3a640` | `#a39c8d` |

Course colour is always a dot, bar or edge next to the course code, never the text colour of a title.

### Contrast

Body text must keep at least 4.5:1. Measured pairs (WCAG 2.x):

| pair | P9 | P11 |
|---|---|---|
| `--text` on `--surface` | 15.8 | 13.4 |
| `--text-2` on `--surface` | 8.6 | 9.3 |
| `--text-3` on `--surface` / `--surface-2` / `--bg` | 5.3 / 4.7 / 4.5 | 5.6 / 5.0 / 6.4 |
| `--on-accent` on `--accent` | 5.7 | 6.1 |
| `--chrome-fg` on `--chrome-bg` | 13.4 | 15.5 |
| `--disp-fg` on `--disp-bg` | 7.5 | 6.6 |
| LCD text on `hot` / `bad` backlight | 8.9 / 7.6 | 8.5 / 7.5 |
| `--warn` / `--bad` / `--ok` on `--surface` | 4.9 / 4.8 / 4.6 | 8.3 / 6.0 / 7.0 |
| `.duepill.hot` / `.over`: `--bg2` on `--warn` / `--bad` | 5.2 / 5.0 | 7.9 / 5.7 |
| `.duepill.soon`: `--warn-ink` on its 14 % wash, on a card / a selected row | 5.6 / 4.8 | 6.9 / 5.5 |
| `--on-bad` on `--bad` (alert band) | 5.3 | 6.9 |

Two traps these rules avoid. `--bg` is too dark to sit on Cream's `--warn` and `--bad` fills (about 4.1:1), so solid pills use `--bg2`. White on Night's coral `--bad` is 2.6:1, so anything drawn on a `--bad` fill uses `--on-bad`. Pocket Start's `.pill` repeats the due pill rules in px.

### Elevation

| name | recipe | used on |
|---|---|---|
| card | `--card-shadow`: 1 px `--line` ring, 2 px lip, soft 10/24 px shadow | modules, Pocket Start cards |
| key | 1 px dark ring, 3 px lip below, 5/10 px shadow; pressed: `translateY(3px)` and no lip | `.btn` (B8) |
| program key | 1 px ring and 2 px lip; pressed 2 px | `.nv`, `.wk` |
| recessed | inset 1 px `--line` ring plus a 2 px inner top shadow | search, filter box, fields, LCDs (deeper), window-key slot |
| drop | `--drop`: 24/60 px shadow plus a ring | dialogs, toasts, floating inspector |
| scrim | `--scrim` with `backdrop-filter: blur(3px)` | behind dialogs |

Night uses darker lips (`#0b0a09`) and heavier shadows; `pocket.css` switches them under `:root[data-scheme="dark"]`.

## 3. Type

Three families, each with one job. `lab.js` sets them (T6) with OS fallbacks; `ui/fonts/fonts.css` holds local copies when vendored, and Google Fonts serves them otherwise.

| family | token | job |
|---|---|---|
| **Space Grotesk** 400–700 | `--font-ui` (`--font-body`) | everything you read: titles, body, key labels, chips |
| **Space Mono** 400/700 | `--font-mono` | key legends (`kbd`), counts in bands, LCD labels, room codes, filter chips, timeline scale, the focus log |
| **Doto** 600–900 | `--font-num` | LCD numerals only: countdowns, the clock, the logo "C", the island countdown, XP floats |

Doto runs large, so its sizes are multiplied by `--num-scale` (0.74): write `font-size: calc(2.7em * var(--num-scale))`. Add `.num` (tabular figures) to any number that ticks.

### Size

Everything is in `em` of `--fs`, so text size, density and screen size scale together.

- `--fs0 = --fs-base × --font-scale (0.95) × --zoom`. Density sets `--fs-base`: D1 14 px, D2 16 px, **D3 18 px** (final). `--zoom` is the user's text size (90–150 %, Ctrl/⌘ + and −).
- `--fs` is fluid: `clamp(--fs0, --fs0 × .8 + .3vw, --fs0 × 1.18)`, so large monitors grow up to 18 %. Windows 780 px tall or less shrink it to 0.9×.
- Fixed px is allowed only for hairlines, shadows, key lips and icon pixel rounding.

### Ramp

| role | class | size · weight | notes |
|---|---|---|---|
| Do first title | `.hero-t` | 1.6 em · 700 | −0.015 em tracking, `text-wrap: balance`; 1.4 em in a narrow module, 1.3 em on phones |
| Focus task | `.fo-task` | 1.5 em · 700 | |
| Inspector title | `.f-title` | 1.35 em · 700 | editable in place |
| Up next title | `.nx-t` | 1.2 em · 700 | |
| View name | `.crumb .v` | 1.15 em · 700 | |
| Body | `.content` | 1 em · 400 | line-height 1.45, colour `--text-2` |
| Row title | `.m-t` | 0.98 em · 500 | one line with ellipsis; wraps on phones |
| Key label | `.btn` | 0.92 em · 600 | |
| Meta | `.meta-row`, `.m-meta` | 0.86 / 0.82 em | parts joined by `·` |
| Group header | `.grp` | 0.8 em · 600 | count in mono, rule to the right |
| Band label | `.ph .pt` | 0.78 em · 700 | CSS uppercase, 0.11 em tracking |
| LCD label | `.d-lbl` | 0.74 em · 700 mono | CSS uppercase, 0.08 em tracking |
| LCD number | `.d-num` | 2.7 em × 0.74 · 800 Doto | `.display.big`: 6.4 em × 0.74 |

Write strings in sentence case in the source. Uppercase comes only from CSS, and only in band labels, LCD labels, room codes, Alt key tips, the radial hub and the deck engraving. The focus log is the one place written in capitals on purpose: it is the device's terminal voice.

## 4. Spacing and shape

| density | `--fs-base` | `--pad` | `--gap` | `--rowpad` |
|---|---|---|---|---|
| D1 Compact | 14 px | .45 em | .5 em | .04 em |
| D2 Cozy | 16 px | .6 em | .7 em | .18 em |
| **D3 Roomy** (final) | 18 px | .8 em | .9 em | .32 em |

- Regions sit `--gap` apart (columns `--gap × 1.15`). Module bodies pad `.85em 1em 1em`. Rows pad `--rowpad + .24em` top and bottom.
- Very wide screens keep a 116 em measure, centred; the dot grid still fills the window.

| radius | value | used on |
|---|---|---|
| `--radius` | 14 px | modules, the deck |
| `--btn-r` | 10 px | keys |
| 9–10 px | | program keys, search, rows, filter box, live strip, location banner, course cards, toasts |
| 8 px | | inputs, segmented controls, focus log |
| 5–7 px | | LCDs, course chips, agenda rows, week items, counts |
| 99 px | | chips, due pills, reason chips, the focus pill, the timeline |

## 5. Icons

Every icon is a 9×9 bitmap in `PIX` in `ui/js/app.js`: nine rows joined by `|`, where `#` is a lit pixel and `.` is off. `ic(name, cls)` turns it into an SVG of crisp rectangles that fills with `currentColor`. The sheet draws all of them.

- **Size in whole 9 px steps.** `.i` is 1.1 em rounded to the nearest 9 px (18, 27, 36 px), so every icon pixel covers whole screen pixels. `.i.big` is 2.4 em (empty states). Location, agenda and fact icons are 1.25 em; window keys and checkmarks 0.9 em.
- **Colour comes from context.** `--accent` on label bands and on the pressed program key, `--text-3` on idle program keys and facts, inherited everywhere else.
- **Icons sit next to a word.** Icon-only buttons (window keys, close, checkboxes) carry `title` and `aria-label`; the SVG itself is `aria-hidden`.
- **View icons are keyed by view id:** `now today inbox work exams week classes events links all`. The rest: `done search plus focus play check clock next pin go ext lab help filter ticket flag flame building walk bell close video trash wmin wmax wrest`.

To add one, draw it on a 9×9 grid with 1 px strokes and no diagonals thinner than a pixel, add it to `PIX`, and use `ic("name")`. Pocket Start (`start.js`) and the Windhawk assets (`build_assets.py`) draw from their own copies; add it there too if they need it.

## 6. Components

Every component is a class in `pocket.css`. Keys need `.bset-b8` and modules need `.fset-f3` on an ancestor; the app puts both on `#screen`. Markup below is trimmed to the classes that matter; app.js renders the real thing.

### Keys (B8)

```html
<button class="btn primary lg">{play}Start focus · 25 min<kbd>F</kbd></button>
<button class="btn">{check}Done<kbd>X</kbd></button>
<button class="btn dark">{focus}Focus 25<kbd>F</kbd></button>
<button class="btn ghost">Details</button>
```

| variant | use |
|---|---|
| `.btn` | any action: a raised plastic key that travels 3 px when pressed and springs back past the top when let go (`--press`, `.ack`); its keyboard key presses it too (`.down`) |
| `.primary` | the one main action of a region (orange) |
| `.dark` | a second strong action, set apart from the primary (Focus on the deck); its icon turns orange |
| `.ghost` | quiet actions (Details, Clear, Close) and keys inside a band |
| `.lg` / `.sm` | the hero action / keys in bands and dense rows |
| `[disabled]` | 45 % opacity, no press |

- Label is a verb, optionally with its object: "Add", "Snooze", "Start focus · 25 min", "Install and restart".
- The `kbd` legend shows only under guidance G1 (`#screen[data-guide="g1"]`). With G2, the final setting, holding Alt overlays a `.tip` on every element with `data-hint`.
- Focus ring: 2 px `--accent`, offset 2 px. Touch screens get a 44 px minimum height.

### Program keys

The view row (`.mnav` > `.nkeys` + `.nfoot`). Every view is a saved filter, so a program key is a filter, not a page.

```html
<button class="nv on" role="tab" aria-selected="true">{now}<span class="lb">Do first</span><span class="ct">5</span><kbd>1</kbd></button>
```

- `.on` is the pressed key: graphite with an orange icon and count; at night it gets an orange rim.
- `.ct` is a live count, used only on Do first, Today, Inbox and Exams.
- `.mod` appends "· filtered" when you've changed the view's query.
- The row scrolls sideways under a fade mask; on phones it sticks below the top bar.

### Window keys

`.winkeys` > `.wk` × 3 (`wmin`, `wmax`/`wrest`, `close`) in a recessed slot, at the end of the top bar on Windows and Linux. Close turns `--bad` when pressed. macOS keeps its traffic lights instead.

### Search, focus pill and top bar

- `.search`: a recessed field-shaped button that opens the palette: icon, placeholder text, `Ctrl K` legend. Below 50 em it collapses to its icon.
- `.fpill`: the running focus timer in the top bar, an accent-washed pill.
- `.mtop`: brandmark (`.logo` LCD "C" + name), `.crumb` (date and quarter context), search, Focus, Add, LCD clock, window keys. The clock hides below 64 em, key labels below 34 em.

### Modules (F3)

A card with a printed label band. Every region is one.

```html
<div class="panel">
  <div class="ph"><span class="pt">{clock}Up next</span><span class="sp"></span><span class="cnt">Mon, Nov 2</span></div>
  <div class="pb">…</div>
</div>
```

- The band is graphite (`--chrome-bg`), with the pixel icon in orange and the count in mono on the right. Region modules end in a small engraved grille.
- **Do first is the only orange band** (`#now .ph`). Alerts get a red band (`.alertbox`).
- Keys inside a band are `.btn.ghost.sm` and take the band's colour.
- A module never scrolls sideways; `.pb` scrolls vertically and becomes plain flow on phones.

### LCD inlay

The device's display: a reflective panel with a dot-matrix texture, inset in a graphite bezel.

```html
<div class="display hot">
  <span class="d-lbl">Due in</span>
  <span class="d-num num">2:14:08</span>
  <span class="d-sub">Today 11:59 PM · ~4h of work</span>
  <span class="d-bar"><i style="width:72%"></i></span>
</div>
```

| variant | use |
|---|---|
| `.display` | countdowns and times (the hero, Up next, alerts, updates) |
| `.hot` | amber backlight: urgent (the hero above 70 % urgency) |
| `.bad` | red backlight: overdue, takeover |
| `.big` | the focus timer and the takeover countdown |
| `.clock` | the one-line clock in the top bar |

Only numbers and their short labels go on an LCD. Countdowns read `MM:SS` or `H:MM:SS` under a day, `3D 4H` beyond, and `NOW` at zero (`cdText` in app.js). Never put body text on one; `.d-sub` holds at most one short line.

### Location banner

A departures placard for anything with a place: course-colour stub, building icon behind a dashed tear line, building name, room code in mono, walk time, and an LCD **Leave by** chip that turns red as `.late` ("Leave now").

```html
<div class="locban" style="--kc: var(--k1)">{building}
  <span class="lb-main"><span class="lb-name">Phelps Hall</span><span class="lb-room">PHELP 1160</span></span>
  <span class="lb-trip">{walk}<span>9 min walk from home</span></span>
  <span class="lb-leave"><span class="lb-k">Leave by</span><b class="num">9:18 AM</b></span>
</div>
```

Below 24 em the chip drops under the trip line. Zoom-only places use the `video` icon.

### List rows

```html
<div class="row mrow sel" style="--kc: var(--k1)">
  <button class="chk">{check}</button>
  <span class="m-main"><span class="m-t">PA3: heaps and hash tables</span>
    <span class="m-meta"><span><span class="cdot"></span>CMPSC 130A</span><span>Assignment</span><span>~4h</span><span>Canvas</span></span></span>
  <span class="m-pri p2">!!</span>
  <span class="m-due"><span class="duepill hot">in 2h</span><span class="m-abs">Today 11:59 PM</span></span>
</div>
```

| state | look |
|---|---|
| `.sel` | accent wash and a 3 px accent edge |
| `.done` | filled orange check, struck-through title |
| `.cls` (classes, events) | a clock or ticket icon instead of the check, lighter title |
| `.doing` | an orange "In progress" tag before the title |
| `.new` | an accent flash after quick add |
| `.completing` | slides out right when checked |
| `[data-swipe]` | lifted, tinted `--ok` (done) or `--warn` (snooze) with a hint beside it |

Rows group under `.grp` headers (Overdue, Today, Tomorrow …) when sorted by due date. Below 24 em the due pill moves under the title.

### Due pill

`.duepill` + state: none ("Mon"), `.soon` (within 24 h, `--warn-ink` on a 14 % wash), `.hot` (within 3 h, solid `--warn`), `.over` ("2h overdue", solid `--bad`), `.live` (a class happening now, accent). Solid fills take `--bg2` text. The words carry the meaning; colour only reinforces it.

### Chips

| class | use |
|---|---|
| `.chip` / `.chip.on` | toggles: quick filters, calendar series, sources, snooze reasons |
| `.chip.course` | quick filter for a course, with its colour dot |
| `.fbox .chip` | an active filter term in mono, removable (`×`) |
| `.cchip` | a course code with its dot; `.cchip.none` reads "Personal" |
| `.why-chip` | a Do first reason ("Due in 3h", "Worth 15% of grade"); one line, extra chips hide |
| `.pc` | a quick-add parse chip ("Course **CMPSC 130A**"), `.course` adds the colour edge, `<i>` marks an inferred value |
| `.seg` > `.chip` | a segmented control (estimate, priority, status, alert, focus length) |
| `.prio` | priority with a flag icon in `--warn`, `.p3` in `--bad` |

### Fields

- Inputs, selects and textareas inside `.screen` get the field style: `--bg2` fill, 1 px `--line`, 8 px radius, a 2 px accent outline on focus. On touch screens they are at least 16 px so iOS never zooms.
- `.fbox`: the filter box, a recessed strip holding term chips and an input; focus draws a 2 px accent ring.
- `.qa-wrap`: the command line (quick add, palette, feed links): an orange `+` or `>` prompt in mono, a large input, a key at the end. Below it `.qa-parse` holds parse chips and `.qa-hl` the token highlight (`.tk-course`, `.tk-date`, `.tk-estimate`, `.tk-priority`, `.tk-tag` …).
- `.fgrid`: label/field pairs in the inspector (6.4 em labels).

### Up next parts

- `.live`: the "Now:" strip with a pinging dot (`.ldot`, a four-frame radar ping; static at M0).
- `.nx-head`: title, facts and a small LCD side by side; stacked below 26 em.
- `.timeline`: today from 7 AM to midnight, class blocks in accent, events in `--acc2`, a `.nowln` needle; `.tl-scale` labels in mono.
- `.agenda` > `.ag`: time, course bar, title and place.

### Lenses

- **Week** (`.week` > `.wcol` > `.wi`): seven columns, today washed in accent with an LCD day chip; columns scroll sideways below 60 em and stack below 30 em. Items show time and course in mono, with a course-colour left edge; classes are outlined, exams bold red.
- **Classes** (`.cgrid` > `.ccard`): course cards with a thick course-colour edge, link keys and Items / Exclude. `.excluded` cards fade with a dashed edge.
- **Links** (`.lgrid` > `.lgroup`): the same card holding link keys with the `ext` icon.

### Inspector

The details panel (`.insp`): an editable title, `.fgrid` fields, segmented controls, the location banner, link keys, notes, `.srcinfo` (where it came from), and `.acts` pinned to the bottom. Wide screens: it covers the Do first / Up next column. Mid widths and non-list lenses: a 28 em drawer at the right. Phones: a bottom sheet.

### Overlays

| part | class | notes |
|---|---|---|
| Dialog | `.dialog.panel` (`.sm` 30 em) | a module with a band: title, hint in the count slot, a ghost close key. Phones drop it from the top so the keyboard never covers the input. |
| Palette and pick lists | `.pal-res` > `.pal-sec`, `.pal-it` (`.on`) | used by search, snooze and help |
| Toast | `.toast` | message, then Undo or one action; at most four, bottom right (above the deck on phones) |
| Radial menu | `.radial` > `.ring`, `.hub`, `.rb` | right-click or long-press; item actions on a row |
| Key tips | `.tips` > `.tip` | graphite mono labels with an orange ring, shown while Alt is held |
| Empty state | `.m-empty` | big faded icon, a bold line, one sentence, then actions |

### Focus and takeover

Full-screen overlays (`.ov.full`) on the dot grid: `.fo-top` status line, `.fo-task`, a `.display.big` timer, a 24-segment `.meter`, the `.fo-log` terminal on an LCD, and keys. A takeover adds "Get up." in `--bad` at 4 em, a red LCD and the location banner, and stays until answered. The alert dialog is `.dialog.alertbox` with the red band.

### Key deck

`.deck`: the device's bottom row. Add (primary), Focus 25 (dark), Done, Snooze, Next, Search, then the engraved "Collegiapp CA-1" and a speaker grille. Windows at least 900 px tall turn the keys into legend keys (symbol over label, like a calculator). Below 52 em the keys share the width; on phones the deck sticks to the bottom like a tab bar and drops Next.

### Island

The always-on-top live activity (`ui/island.html`, 380×64): a graphite pill with an orange progress ring, the label and a Doto countdown. The desk preview draws the same thing with `.island`. It is always dark, whatever the palette.

## 7. Layout

`#screen` is a named container (`container: screen / inline-size`), so layouts follow the room the app has: an open Appearance drawer, split view and iPad Slide Over all count. Width breakpoints are `@container screen`; heights use `@media`.

Regions: `#top` (top bar), `#nav` (program keys), `#now` (Do first), `#sched` (Up next), `#list`, `#insp` (floating), `#bottom` (deck).

| screen width | layout |
|---|---|
| **≥ 1100 px** | Two columns (1 : 1.3): Do first over Up next on the left, the list on the right. |
| **761–1099 px** | Do first spans the top; Up next and the list share the row below (1 : 1.35). |
| **≤ 760 px** | One scrolling column like an iPhone: the key row sticks under the top bar, the deck sticks to the bottom, the inspector is a sheet. Up next keeps only what's next, where, and when to leave. |
| non-list lens | `data-wide="1"`: the list takes the whole width; Do first and Up next hide. |

| window height | change |
|---|---|
| ≥ 900 px (and ≥ 761 px wide) | legend keys on the deck |
| ≤ 780 px | type ×0.9, tighter rows and modules, no coach line |
| ≤ 640 px | no reasons line, timeline scale, agenda or quarter context |

Component container breakpoints (in `em` of the region): top bar 64 / 50 / 34; Do first 52 (LCD above the title) and 36 (ghost keys hide); Up next head 26; location banner 24; list rows 30 and 24; week 60 and 30; deck 66 and 52.

Desktop frames: on Windows and Linux the top bar is the title bar (`html[data-frame="own"]`, drag after 4 px, double-click maximizes) and stays pinned in the one-column layout. On macOS (`data-frame="mac"`) the top bar starts 66 px in, after the traffic lights.

## 8. Motion

The final design ships with **M2: full motion** (it was M0 until 2026-11-01). Pocket moves like the hardware it draws, and every input answers where it was made: keys travel and spring back, LCDs switch in steps, pixel icons wipe and shake a pixel at a time, modules and rows settle like parts clicking into place.

| level | `--m` |
|---|---|
| M0 Off | 0 |
| M1 Subtle | 0.7 |
| **M2 Full** (final) | 1 |
| M3 Lively | 1.15 |

**Rules**

- Write durations as `calc(var(--m) * 220ms + 1ms)`. The extra millisecond keeps `animationend` firing at M0. Easing tokens: `--ease` (settle), `--ease-back` (spring, stamp), `--ease-in` (leave).
- **LCDs never tween.** Anything on a `.display`, `.lb-leave`, `.logo` or the focus log animates with `steps()`: a power-on flicker (`lcdOn`), a backlight flash, a bar filling a segment at a time, a blink.
- **Pixel icons move in whole pixels**: a 9-step wipe (`pxWipe`), a 2 px shake (`nope`, `bell`). Never rotate or scale them smoothly.
- **Anything that loops is stepped** (the live dot, a blinking zero, the takeover alarm, the log cursor). C2's warp filter repaints the whole screen on every frame of a smooth loop. `html[data-motion="0"]` runs every animation once, so loops stop at M0.
- `prefers-reduced-motion: reduce` turns all of it off (`CA.motion.m()` is 0, and the CSS clamps to 1 ms).
- app.js and motion.js only add classes; every animation lives in pocket.css's motion section.

**How it's wired** (`ui/js/motion.js`, `CA.motion`). Every render replaces markup, so continuity comes from keys:

- Parts carry `data-k` (rows by item id, `g:` day groups, `hero:` / `next:` / `live:` cards, `w:` week items, `c:` class cards, quick-add chips). `keep()` before a render and `settle()` after it: parts that moved glide from where they were (FLIP, 280 ms), parts that left play their exit on their old element put back in place (a ghost, `.gone.x-<kind>`), parts that arrived play `.come-drop` / `.come-up` / `.come-r` and their LCDs boot.
- The action says what happened (`S.fx` in app.js): `exit: { id: "done" | "swipe" | "snooze" | "del" | "out" }`, `flip`, `skip`. A render for a tick or a resize moves nothing.
- `ack(el, cls)`: a one-shot class that comes off when its animation ends. `press()`: a keyboard key pushes its on-screen twins (`data-hint`) down for a beat. `leave()`: an overlay, the details, the radial menu or the Appearance drawer closing plays its exit on a clone. `texts()` / `counts()`: `data-n` numbers roll up or down, `data-fx="print"` labels print. `burst()`: pixel confetti. `count()`: an LCD number counting up. `swap()`: a View Transition of the whole screen.

**Vocabulary**

| class | on | what it does |
|---|---|---|
| `.ack` | keys, program keys, chips, window keys, rows | released: the key springs back past the top (`keyUp`, `--press` 1 → −.35 → 0); a program key's LED flickers on; a selected row's bar grows |
| `.down` | keys | held down by its keyboard key for 90 ms |
| `.boot` | `.display` | segments flicker on over a backlight flash; its bar fills in 12 steps |
| `.blink` | countdowns | at `NOW`, once a second; a passed "leave by" blinks too |
| `.bump` (`data-dir`) | counts, priority | rolls up or down the way the number moved, 3 frames |
| `.print` | band labels | prints left to right, 8 frames |
| `.nope` | keys, LCDs, quick-add box | refused: a 2 px shake and a low buzz (`CA.sound.nope`); an LCD flashes red, the quick-add box rings red |
| `.stamp` / `.strike` | a row's check / title | done in place: the check stamps and its tick wipes in, the title is struck through |
| `.saved` | details fields | a green ring fading out |
| `.swap` | details body | the details now show another item |
| `.pop` / `.flash` | quick-add chips | the grammar recognized something new / a value changed |
| `.x-done` `.x-swipe` `.x-snooze` `.x-del` `.x-skip` `.x-out` | ghosts | done slides right with a stamp and strike; swiped carries on from the finger; snoozed slides left; deleted shreds to a line in 6 frames; skipped (Do first) slides left as the next comes in from the right |

**Inventory**

- Boot: the modules settle in one after another (80 ms apart), then their LCDs and the logo flicker on, with the boot chirp. Theme packs keep the CRT power-on (`.powering-on`).
- Keys: 60 ms down, 240 ms spring back. Focus rings close in from 6 px.
- Lists: rows deal in at 18 ms apart (capped at 12) when the list changes; done, snooze, delete and undo keep the list in place and only the rows that moved glide. Undo drops the item back in with a flash. Swipes tick at the threshold (with an 8 ms vibration) and spring back if let go early.
- Done: pixels burst from the key that was pressed, the XP float rises in steps; clearing the last Do first item plays a four-note fanfare and a bigger burst.
- Do first and Up next: a new card rises in as the old one leaves (done lifts away, snoozed sinks, skipped slides left).
- Overlays: the scrim fades in and out, dialogs rise (drop from the top on phones), a closing dialog fades down; a dialog replacing another fades under it. The snooze options deal in. The details rise over Do first, slide in as a drawer where they cover the list, and rise as a sheet on phones; each leaves the way it came.
- Focus: its parts come up one after another, the LCD boots, the meter fills segment by segment, the log has a blinking block cursor, the last minute turns the LCD amber with a beep; the summary counts the minutes and XP up and bursts. Takeover's "Get up." slams in and keeps flashing; an alert's band flashes and its bell rings.
- Toasts: a new toast pushes the others up; an undo toast drains a bar for the time it has left and holds while hovered; nudges and update notices ring their bell.
- Light ↔ Night: the whole device redraws top to bottom in 14 steps, like an LCD refresh. Changing lens (list, week, classes, links) crossfades the screen in 200 ms.
- Touch: a long press draws a ring that fills toward the radial menu (timed to the real 520 ms, so it doesn't scale).
- Island: the pill pops in, a new label rolls up, the LCD flickers on when it turns amber and blinks at `NOW`. Pocket Start: each open, the board rises and its parts deal in top to bottom while the tiles flicker on.
- Effect layers (`.fx`, the C2 warp, `.display::after`), ghosts and bursts keep `pointer-events: none`.

## 9. Interaction

- **Hover** styles live only inside `@media (hover: hover)`, so touch screens never stick in a hover state.
- **Touch** (`@media (pointer: coarse)`): keys, program keys, search and the focus pill are at least 44 px; chips 36 px; segments 34 px; rows 3.3 em; checkboxes 1.75 em. Key legends and the coach line hide. Swipe a row right past 90 px for done, left for snooze; long-press (520 ms) opens the radial menu.
- **Keyboard**: every key on screen has a keyboard key, and `data-hint` names it for the Alt overlay. `:focus-visible` always shows the 2 px accent ring.
- **Selection**: chrome (keys, chips, bands, LCDs, the deck) isn't selectable; titles, notes and fields are.
- **Guidance**: G1 legends on every key; **G2** (final) hold Alt for tips; G3 none; G4 a rotating coach line under the deck and a pulse on the primary key.

## 10. Writing

- Sentence case everywhere: "Start focus · 25 min", "Connect calendars", "Nothing to do first."
- Join parts with ` · ` (a middle dot with spaces).
- Times: `9:30 AM`. Days: "Today", "Tomorrow", "Mon", then "Mon, Nov 3". Relative: "in 3h", "2h overdue", "ends in 12:04".
- Keys are verbs. Toasts say what happened, then offer Undo: "Done · PA3: heaps and hash tables".
- Empty states say what's missing in one bold line, explain in one sentence, and offer the next action.
- Say why something is first, late or hidden ("4 open items hidden from 2 excluded Canvas courses · manage").

## 11. Beyond the main window

The same device appears in other surfaces. Each one repeats the palette, because it can't load `lab.js`:

| surface | files | how it gets the palette |
|---|---|---|
| Island | `ui/island.html` | `localStorage["capp.tokens"]`, written by lab.js; P9 defaults inline |
| Pocket Start | `ui/start.html`, `ui/js/start.js`, `ui/css/start.css` | `localStorage["capp.palettes"]` (both palettes), picked by Windows' light/dark mode; sized in px like the canvas |
| Appearance drawer | `ui/css/lab.css` | the live tokens |
| Windows shell | `integrations/windhawk-pocket/*.yaml`, `build_assets.py` | Night values written into the YAML; Cream values in its README |
| Windows theme, Terminal, VS Code | `integrations/windows-pocket/` | values in `build.py` and the JSON files |
| Zebar bar | `integrations/zebar/pocket/bar.css` | its own copy |
| Spotify (Spicetify) | `integrations/spicetify-pocket/Pocket/color.ini`, `user.css` | both palettes in `color.ini`; `user.css` reads them as `--pk-*` with Night fallbacks |

**When a palette value changes**, change `PALETTES` in `ui/js/lab.js` first, then the copies: `ui/css/core.css` `:root` (P9 first paint), the `var(--p-*, …)` fallbacks in `pocket.css` and `start.css`, `island.html`'s defaults, the P11 block in [`index.html`](index.html), this file's tables, and the integrations above.

## 12. Adding or changing a part

1. Build it from existing parts first: a module, keys, chips, an LCD, a row. A new part needs a new kind of information, not a new look.
2. Use the Pocket tokens (`--surface`, `--text-2`, `--accent` …), never hex. Check it in Cream and Night.
3. Size in `em`. Adapt with `@container (…em)` on its region; touch the screen layouts only in the `@container screen` blocks.
4. Put hover in `@media (hover: hover)` and touch sizes in `@media (pointer: coarse)`.
5. Scale every animation by `--m`. Step anything on an LCD and anything that loops. If a render replaces it, give it a `data-k` so it glides, enters and leaves instead of blinking (section 8).
6. Write strings in sentence case; give icon-only buttons `title` and `aria-label`; give actions a `data-hint` key.
7. At most one `.primary` per region. Orange means "do this".
8. Keep body text at 4.5:1 or better in both palettes: on a `--bad` fill use `--on-bad`, on a solid `--warn` or `--bad` pill use `--bg2`, and for warn-coloured text on a warn wash use `--warn-ink`.
9. Add it to `index.html` and to section 6 here. If it takes a new variant ID (style code), use the next free number and never renumber (`CLAUDE.md`).
10. Rebuild (`cargo build -p collegiapp`) and check it in the running app at ≥ 1100, ~900 and ≤ 760 px wide.

Don't: add effects over text, a second accent colour, all-caps source strings, new fonts, or a look from `archive/looks-2026-10/` unless asked.
