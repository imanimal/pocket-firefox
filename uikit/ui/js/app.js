/* Collegiapp — app shell for the Pocket design. One state object, one item list, many lenses.
   Every nav key is a saved filter over the same items (see VIEWS). Archived looks: archive/looks-2026-10. */
(function () {
  const CA = window.CA, E = CA.E;
  const { MIN, HR, DAY } = E;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const narrow = () => window.matchMedia("(max-width: 760px)").matches;
  const TAURI = window.__TAURI__ || null; // set inside the Tauri app (withGlobalTauri); null in a plain page
  const MAC = /Mac|iPhone|iPad/.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "");
  const MOD = MAC ? "⌘" : "Ctrl", ALT = MAC ? "⌥ Option" : "Alt";
  // The window frame is ours. Windows and Linux have no native title bar (tauri.conf.json): the top bar is the
  // title bar, with Pocket window keys. macOS keeps its traffic lights over a transparent title bar
  // (tauri.macos.conf.json). Phones and tablets (an iPad reports itself as a Mac with touch) have no frame.
  const MOBILE = /iPhone|iPad|Android/i.test(navigator.userAgent) || (MAC && navigator.maxTouchPoints > 1);
  const WIN = TAURI && TAURI.window && !MOBILE ? TAURI.window.getCurrentWindow() : null;
  const FRAME = WIN ? (MAC ? "mac" : "own") : "";

  const VIEWS = [
    { id: "now", k: "1", label: "Do first", q: "is:open is:actionable", sort: "score", lens: "list" },
    { id: "today", k: "2", label: "Today", q: "is:open due<=today", sort: "due", lens: "list" },
    { id: "inbox", k: "3", label: "Inbox", q: "status:inbox", sort: "updated", lens: "list" },
    { id: "work", k: "4", label: "Assignments", short: "Work", q: "is:open kind:assignment,lab,quiz,project,reading", sort: "due", lens: "list" },
    { id: "exams", k: "5", label: "Exams", q: "kind:exam", sort: "due", lens: "list" },
    { id: "week", k: "6", label: "Week", q: "is:open", sort: "due", lens: "week" },
    { id: "classes", k: "7", label: "Classes", q: "", sort: "due", lens: "courses" },
    { id: "events", k: "8", label: "Events", q: "is:open kind:event,ticket,office_hours", sort: "due", lens: "list" },
    { id: "links", k: "9", label: "Links", q: "", sort: "due", lens: "links" },
    { id: "all", k: "0", label: "Everything", short: "All", q: "is:open", sort: "due", lens: "list" },
    { id: "done", k: "", label: "Done", q: "is:done", sort: "updated", lens: "list" },
  ];
  const viewById = (id) => VIEWS.find((v) => v.id === id) || VIEWS[0];

  const KIND = { assignment: ["HW", "Assignment"], exam: ["EXAM", "Exam"], quiz: ["QUIZ", "Quiz"], lab: ["LAB", "Lab"], reading: ["READ", "Reading"],
    project: ["PROJ", "Project"], class: ["CLASS", "Class"], office_hours: ["OH", "Office hours"], event: ["EVENT", "Event"], ticket: ["TICKET", "Ticket"],
    errand: ["ERRAND", "Errand"], application: ["APPLY", "Application"], task: ["TASK", "Task"] };
  const kShort = (k) => (KIND[k] || KIND.task)[0];
  const kLabel = (k) => (KIND[k] || KIND.task)[1];
  const TIPS = [
    "Press <b>Q</b> anywhere to add. Try “pa3 130a fri ~4h !!”.",
    "<b>Esc</b> clears every filter. Nav buttons are only saved filters.",
    "Right-click, or long-press on a touch screen, for the radial menu.",
    `Hold <b>${ALT}</b> to see every shortcut on screen.`,
    "<b>F</b> starts a 25-minute focus on the Do first item.",
    `<b>${MOD}+K</b> finds any command, item, class or link.`,
    "Excluded Canvas courses stay hidden everywhere. Manage them in Classes (<b>7</b>).",
    "<b>S</b> snoozes. “After next class” is one click.",
  ];
  const GLOBAL_LINKS = [["GOLD", "https://my.sa.ucsb.edu/gold/"], ["Canvas", "https://www.canvas.ucsb.edu/"], ["Gradescope", "https://www.gradescope.com/"],
    ["Shoreline", "https://shoreline.ucsb.edu/"], ["UCSB Mail", "https://mail.google.com/"], ["Handshake", "https://ucsb.joinhandshake.com/"],
    ["Study rooms", "https://libcal.library.ucsb.edu/booking/groupstudy"], ["Dining menus", "https://apps.dining.ucsb.edu/menu"], ["MTD bus", "https://bustracker.sbmtd.gov/"],
    ["CLAS tutoring", "https://clas.ucsb.edu/"], ["Student Health", "https://studenthealth.sa.ucsb.edu/"], ["Registrar calendar", "https://registrar.sa.ucsb.edu/"]];
  const SOURCES = [["canvas", "Canvas", "API token + calendar feed", "3m"], ["gcal", "Google Calendar", "OAuth (or secret iCal URL)", "1m"], ["shoreline", "Shoreline", "CampusGroups iCal subscription", "12m"],
    ["gradescope", "Gradescope", "Firefox extension (page capture)", "live"], ["ucsbapi", "UCSB API", "Dining · quarter calendar · events", "1h"], ["piazza", "Piazza / Ed", "Firefox extension", "off"]];
  const PHRASE = "i choose distraction";

  // Inside the app the data lives in the Rust store (store.js loads and saves it); the web demo runs on sample data.
  const LIVE = CA.store.live;
  const S = (CA.state = Object.assign(LIVE ? CA.store.empty() : CA.sampleData(), {
    now: Date.now(), q: VIEWS[0].q, view: "now", lens: "list", sort: "score",
    sel: null, insp: false, skip: 0, focus: null, overlay: null, islandOpen: false, update: null,
    stats: LIVE ? loadStats() : { streak: 4, focusMin: 85, xp: 1240 }, alerted: {}, settings: null, feeds: null, blocklist: [],
    undo: null, animRows: true, coachI: 0, ticks: 0, listIds: [], flashId: null, refocus: null, palI: 0, palList: [], noClickUntil: 0,
  }));
  const ui = () => CA.ui;
  const ctx = () => ({ now: S.now, courses: S.courses });
  const find = (id) => S.items.find((x) => x.id === id);
  // Change an item and save it (store.js batches the save). Returns an undo that puts the old values back,
  // looked up by id because a reload from the store may have replaced the object since.
  function edit(it, patch) {
    const prev = {}; for (const k in patch) prev[k] = it[k];
    Object.assign(it, patch, { updated: Date.now() }); CA.store.save(it);
    return () => { let cur = find(it.id); if (!cur) { cur = it; S.items.push(it); } Object.assign(cur, prev, { updated: Date.now() }); CA.store.save(cur); };
  }
  // Focus stats are per device for now (localStorage); XP and streaks are not part of the synced item list.
  function dayKey(t) { const d = new Date(t); return d.getFullYear() * 1e4 + (d.getMonth() + 1) * 100 + d.getDate(); }
  function loadStats() {
    let st = null; try { st = JSON.parse(localStorage.getItem("ca.stats") || "null"); } catch (e) { st = null; }
    st = Object.assign({ xp: 0, streak: 0, focusMin: 0, day: 0, last: 0 }, st);
    const today = dayKey(Date.now()), yest = dayKey(Date.now() - DAY);
    if (st.day !== today) { st.focusMin = 0; st.day = today; }
    if (st.last !== today && st.last !== yest) st.streak = 0;
    return st;
  }
  function saveStats() { if (!LIVE) return; try { localStorage.setItem("ca.stats", JSON.stringify(S.stats)); } catch (e) { /* storage off: stats reset next launch */ } }
  function addFocusStats(min) {
    const st = S.stats, today = dayKey(Date.now());
    if (LIVE && st.last !== today) { st.streak = (st.last === dayKey(Date.now() - DAY) ? st.streak : 0) + 1; st.last = today; }
    st.focusMin += min; st.xp += min * 2; saveStats();
  }
  const cById = (id) => S.courses.find((c) => c.id === id);
  const courseOf = (it) => (it && it.course ? cById(it.course) : null);
  const kc = (c) => (c ? `--kc: var(--k${c.color});` : "");
  const cmpDue = (a, b) => (a.due == null) - (b.due == null) || (a.due || 0) - (b.due || 0);
  const busy = () => { const a = document.activeElement; return !!a && !!a.closest && !!a.closest("#screen, #island") && (/INPUT|TEXTAREA|SELECT/.test(a.tagName) || a.isContentEditable); };
  const MO = CA.motion, motion = () => MO.m();
  const shown = (el) => !!el.offsetParent && el.getBoundingClientRect().width > 0;
  // the on-screen keys for a keyboard key (data-hint), and the press a keyboard key gives them once its action has rendered
  const hinted = (h) => $$(`[data-hint="${h}"]`, $("#screen")).filter(shown);
  const mirror = (h) => setTimeout(() => MO.after(() => MO.press(() => hinted(h))), 0);
  // Refused (nothing to act on, or not allowed here): the parts shake a pixel at a time and the speaker buzzes.
  function refuse(els) { [].concat(els || []).forEach((el) => MO.ack(el, "nope")); CA.sound.nope(); return false; }
  const ranked = () => E.rank(S.items.filter((it) => E.matchItem(it, [], ctx())), S.now);
  const topItem = () => { const r = ranked(); return r.length ? r[S.skip % r.length].it : null; };
  const target = () => (S.sel && find(S.sel)) || topItem();
  function cdText(ms) { if (ms <= 0) return "NOW"; return ms >= DAY ? E.fmtDur(ms).toUpperCase() : E.fmtClock(ms); }
  function clockStr() { const d = new Date(S.now); return E.fmtTime24(S.now) + ":" + String(d.getSeconds()).padStart(2, "0"); }
  function weekInfo() {
    const q = CA.quarter, wk = Math.floor((E.startOfDay(S.now) - q.week1.getTime()) / (7 * DAY)) + 1;
    return { wk: Math.max(0, Math.min(11, wk)), toFinals: Math.ceil((q.finals.getTime() - E.startOfDay(S.now)) / DAY) };
  }
  function scheduleItems() {
    return S.items.filter((it) => (E.SCHEDULED(it.kind) || it.kind === "exam") && E.matchItem(it, [], ctx()) && it.status !== "done" && (it.end || it.due) > S.now).sort(cmpDue);
  }
  function ctxCourse() {
    const c = S.items.find((it) => it.kind === "class" && it.due <= S.now + 15 * MIN && it.end >= S.now - 45 * MIN && cById(it.course) && cById(it.course).included);
    if (!c) return null;
    return { id: c.course, why: c.end < S.now ? "class just ended" : c.due > S.now ? "class starting" : "in class now" };
  }
  function nextAlertable() { return scheduleItems().find((it) => it.kind === "class" && it.due > S.now) || scheduleItems().find((it) => it.due > S.now); }
  function hostOf(u) { try { const x = new URL(u); return x.host + (x.pathname.length > 1 ? x.pathname : ""); } catch (e) { return u; } }

  /* ─────────── Pocket vocabulary: sentence case, pixel icons, one obvious primary action per region ─────────── */
  // Pixel icons: 9×9 bitmaps ("#" = lit pixel) drawn as crisp SVG rects. CSS sizes them in 9 px steps,
  // so every pixel lands on whole screen pixels at 18, 27 and 36 px.
  const PIX = {
    now: ".....###.|....###..|...###...|..######.|.....##..|....##...|...##....|..##.....|.##......",
    today: "....#....|.#.....#.|...###...|..#####..|#.#####.#|..#####..|...###...|.#.....#.|....#....",
    inbox: "....#....|....#....|..#.#.#..|...###...|#...#...#|#.......#|###...###|#.......#|#########",
    work: ".#####...|.#...##..|.#...###.|.#.....#.|.#.###.#.|.#.....#.|.#.###.#.|.#.....#.|.#######.",
    exams: "....#....|...#.#...|...#.#...|..#.#.#..|..#.#.#..|.#..#..#.|.#.....#.|#...#...#|#########",
    week: "..#...#..|#########|#########|#.......#|#.#.#.#.#|#.......#|#.#.#...#|#.......#|#########",
    classes: "....#....|..##.##..|##.....##|..##.##.#|..#.#.#.#|..#...#.#|..#...#..|..#####..|.........",
    events: "....#....|....#....|...###...|#########|.#######.|..#####..|..##.##..|.##...##.|.#.....#.",
    links: "...###...|.##.#.##.|.#..#..#.|#########|#...#...#|#########|.#..#..#.|.##.#.##.|...###...",
    all: ".........|##.######|.........|##.######|.........|##.######|.........|##.######|.........",
    done: "#########|#.......#|#......##|#.....#.#|##...#..#|#.#.#...#|#..#....#|#.......#|#########",
    search: "..###....|.#...#...|#.....#..|#.....#..|#.....#..|.#...#...|..####...|......##.|.......##",
    plus: ".........|....#....|....#....|....#....|.#######.|....#....|....#....|....#....|.........",
    focus: "..#####..|.#.....#.|#..###..#|#.#...#.#|#.#.#.#.#|#.#...#.#|#..###..#|.#.....#.|..#####..",
    play: "..#......|..##.....|..###....|..####...|..#####..|..####...|..###....|..##.....|..#......",
    check: ".........|........#|.......##|......##.|#....##..|##..##...|.####....|..##.....|.........",
    clock: "..#####..|.#..#..#.|#...#...#|#...#...#|#...###.#|#.......#|#.......#|.#.....#.|..#####..",
    next: ".#.....#.|.##....#.|.###...#.|.####..#.|.#####.#.|.####..#.|.###...#.|.##....#.|.#.....#.",
    pin: "..#####..|.#.....#.|#..###..#|#..#.#..#|#..###..#|.#.....#.|..#...#..|...#.#...|....#....",
    go: ".........|.....#...|......#..|.......#.|#########|.......#.|......#..|.....#...|.........",
    ext: "....#####|.......##|......#.#|.....#..#|....#...#|...#.....|..#......|.#.......|#........",
    lab: ".#..#..#.|###.#..#.|.#..#..#.|.#..#.###|.#..#..#.|.#.###.#.|.#..#..#.|.#..#..#.|.#..#..#.",
    help: ".........|#########|#.......#|#.#.#.#.#|#.......#|#.#####.#|#.......#|#########|.........",
    filter: "#########|#.......#|.#.....#.|..#...#..|...#.#...|...#.#...|...#.#...|...#.#...|...###...",
    ticket: ".........|#########|#...#...#|.#.....#.|.#..#..#.|#.......#|#...#...#|#########|.........",
    flag: "########.|#######..|######...|#######..|########.|#........|#........|#........|#........",
    flame: "....#....|...##....|..###.#..|..#####..|.###.###.|.##...##.|.##...##.|..##.##..|...###...",
    building: "....#....|..#####..|#########|.#.#.#.#.|.#.#.#.#.|.#.#.#.#.|.#.#.#.#.|#########|#########",
    walk: "....##...|....##...|...###...|..#.###..|....#....|...#.#...|...#..#..|..#...#..|..#....#.",
    bell: "....#....|...###...|..#####..|..#####..|..#####..|.#######.|#########|.........|....#....",
    close: ".........|.#.....#.|..#...#..|...#.#...|....#....|...#.#...|..#...#..|.#.....#.|.........",
    video: ".........|.........|#####..#.|#...#.##.|#...####.|#...#.##.|#####..#.|.........|.........",
    trash: "...###...|#########|.#.....#.|.#.#.#.#.|.#.#.#.#.|.#.#.#.#.|.#.#.#.#.|.#.....#.|..#####..",
    wmin: ".........|.........|.........|.........|.........|.........|.#######.|.#######.|.........",
    wmax: ".........|.#######.|.#######.|.#.....#.|.#.....#.|.#.....#.|.#.....#.|.#######.|.........",
    wrest: "...######|...######|...#....#|#######.#|#######.#|#.....###|#.....#..|#######..|.........",
  };
  const ICONS = {};
  for (const n in PIX) ICONS[n] = PIX[n].split("|").map((row, y) => row.replace(/#+/g, (run, x) => `M${x} ${y}h${run.length}v1h-${run.length}z`).replace(/\./g, "")).join("");
  const ic = (n, c) => `<svg class="i${c ? " " + c : ""}" viewBox="0 0 9 9" aria-hidden="true"><path d="${ICONS[n] || ""}"/></svg>`;
  const LOGO = `<span class="brandmark"><span class="logo" aria-hidden="true">C</span><span>Collegiapp</span></span>`;
  const DNM = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], DNL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MNM = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const PRI = ["", "Priority", "High priority", "Urgent"];
  const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
  const srcName = (s) => (SOURCES.find((x) => x[0] === s) || [s, cap(s)])[1];
  function mTime(t) { const d = new Date(t); const h = d.getHours(); return (h % 12 || 12) + ":" + String(d.getMinutes()).padStart(2, "0") + (h >= 12 ? " PM" : " AM"); }
  function mDay(t) {
    const diff = Math.round((E.startOfDay(t) - E.startOfDay(S.now)) / DAY), d = new Date(t);
    if (diff === 0) return "Today"; if (diff === 1) return "Tomorrow"; if (diff === -1) return "Yesterday";
    return diff > 0 && diff < 7 ? DNM[d.getDay()] : `${DNM[d.getDay()]}, ${MNM[d.getMonth()]} ${d.getDate()}`;
  }
  function mDue(t) { return mDay(t) + " " + mTime(t); }
  const fDue = (t) => mDue(t);
  function sinceText(ms) { return ms >= DAY ? E.fmtDur(ms).toUpperCase() : E.fmtClock(ms); }
  function dueState(it) {
    if (it.due == null) return { t: "No date", c: "" };
    const d = it.due - S.now;
    if (E.SCHEDULED(it.kind) && d <= 0 && it.end > S.now) return { t: "Now", c: "live" };
    if (d < 0) return { t: E.fmtDur(d) + " overdue", c: "over" };
    if (d < 24 * HR) return { t: "in " + E.fmtDur(d), c: d < 3 * HR ? "hot" : "soon" };
    return { t: mDay(it.due), c: "" };
  }
  const cchip = (c) => (c ? `<span class="cchip" style="${kc(c)}">${esc(c.code)}</span>` : `<span class="cchip none">Personal</span>`);
  function viewTitle() {
    const v = viewById(S.view), m = S.q.match(/^is:open course:(\S+)$/);
    const c = m && S.courses.find((x) => x.tag.toLowerCase() === m[1]);
    return c ? c.code : v.label + (S.q !== v.q ? " · filtered" : "");
  }
  function setDisp(el, s) { if (el.textContent !== s) el.textContent = s; }

  /* ─────────── places: location banners, walking time, leave-by ─────────── */
  // "PHELP 1160" or "CSIL · or Zoom" resolves against CA.places (data.js): building code, room and a rough position.
  const placeKeys = () => Object.keys(CA.places || {}).sort((a, b) => b.length - a.length);
  function place(loc) {
    if (!loc) return null;
    const s = String(loc), key = placeKeys().find((k) => s.toUpperCase().startsWith(k.toUpperCase()));
    const p = key ? CA.places[key] : null, rest = key ? s.slice(key.length).trim() : "";
    return { code: p && !p.named ? key : "", name: p ? p.name : s.split("·")[0].trim(), note: p && p.note, room: /^[A-Z]?\d/i.test(rest) ? rest.split("·")[0].trim() : "", xy: p && p.xy, zoom: /zoom/i.test(s) };
  }
  const placeShort = (p) => (p.code ? p.code + (p.room ? " " + p.room : "") : p.name);
  // walking minutes: city-block metres at ~75 m/min, never under 1
  function walkMin(a, b) { const d = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]); return Math.max(1, Math.round((d * 0.85) / 75)); }
  // You leave from the last scheduled thing that ends within 90 min before this one starts; otherwise from home.
  function tripTo(it) {
    const to = place(it && it.location); if (!to || !to.xy || it.due == null) return null;
    const prev = S.items.filter((x) => x.id !== it.id && E.SCHEDULED(x.kind) && x.location && x.end && x.end <= it.due && x.end >= it.due - 90 * MIN && E.matchItem(x, [], ctx())).sort((a, b) => b.end - a.end)[0];
    const fp = prev && place(prev.location), from = fp && fp.xy ? fp : CA.home, same = from !== CA.home && from.name === to.name;
    const min = walkMin(from.xy, to.xy);
    return { min, same, from: from === CA.home ? CA.home.short : from.name, leave: it.due - (min + 3) * MIN };
  }
  function locBanner(it, trip) {
    const p = place(it.location); if (!p) return "";
    const late = trip && trip.leave <= S.now && it.due > S.now, room = [p.code && placeShort(p), p.note, p.zoom && "or Zoom"].filter(Boolean).join(" · ");
    const go = trip ? `<span class="lb-trip">${ic("walk")}<span>${trip.same ? "Same building" : `${trip.min} min walk from ${esc(trip.from)}`}</span></span>
      <span class="lb-leave${late ? " late" : ""}"><span class="lb-k">${late ? "Leave" : "Leave by"}</span><b class="num">${late ? "now" : esc(mTime(trip.leave))}</b></span>` : "";
    return `<div class="locban" style="${kc(courseOf(it))}">${ic(p.xy || !p.zoom ? "building" : "video", "lb-ic")}<span class="lb-main"><span class="lb-name">${esc(p.name)}</span>${room ? `<span class="lb-room">${esc(room)}</span>` : ""}</span>${go}</div>`;
  }

  function mTop(el) {
    const { wk, toFinals } = weekInfo(), d = new Date(S.now);
    const f = S.focus ? `<button class="fpill" data-act="focusTop" title="Back to the focus screen">${ic("focus")}Focus · <span class="num" data-cd data-f="clock" data-t="${S.focus.end}">${cdText(S.focus.end - S.now)}</span></button>` : "";
    el.innerHTML = `<div class="mtop">${LOGO}
      <div class="crumb"><span class="v"><span class="dl">${DNL[d.getDay()]}</span><span class="ds">${DNM[d.getDay()]}</span>, ${MNM[d.getMonth()]} ${d.getDate()}</span><span class="ctx">${esc(CA.quarter.name)} · Week ${wk} of 10 · Finals in ${toFinals} days</span></div>
      <button class="search" data-act="palette" data-hint="k" title="Search and commands (${MOD}+K)">${ic("search")}<span class="ph-t">Search items, classes, links, commands</span><kbd>${MOD} K</kbd></button>
      ${f}<button class="btn" data-act="focusTop" data-hint="f" title="Focus on Do first (F)">${ic("focus")}<span class="bl">Focus</span><kbd>F</kbd></button>
      <button class="btn primary" data-act="quick" data-hint="q">${ic("plus")}Add<kbd>Q</kbd></button>
      <div class="display clock" title="Local time"><span class="d-num num" data-clock>${clockStr()}</span></div>${FRAME === "own" ? winKeys() : ""}</div>`;
  }
  function winKeys() {
    return `<span class="winkeys" role="group" aria-label="Window"><button class="wk" data-act="winMin" title="Minimize">${ic("wmin")}</button>`
      + `<button class="wk" data-act="winMax" title="${S.winMax ? "Restore" : "Maximize"}">${ic(S.winMax ? "wrest" : "wmax")}</button>`
      + `<button class="wk wk-x" data-act="winClose" title="Close (Collegiapp keeps running in the tray)">${ic("close")}</button></span>`;
  }
  // The top bar's empty space moves the window (after a few pixels, so a double-click still lands) and
  // double-click maximizes. Dragging uses the system move loop, so Snap and Aero Shake still work. The whole band
  // the top bar sits in counts, from the window's top edge (the content's padding included) to the bar's bottom.
  function bindFrame() {
    if (!WIN) return;
    const root = document.documentElement, content = $("#content"); root.dataset.frame = FRAME;
    const grip = (e) => e.button === 0 && !e.target.closest("button, a, input, textarea, select, [data-act]")
      && (e.target === content || !!e.target.closest("#top")) && e.clientY <= $("#top").getBoundingClientRect().bottom;
    let down = null;
    content.addEventListener("mousedown", (e) => {
      if (!grip(e)) return;
      if (e.detail === 2) { down = null; WIN.toggleMaximize().catch(() => {}); return; }
      down = [e.screenX, e.screenY];
    });
    window.addEventListener("mousemove", (e) => {
      if (!down) return;
      if (!(e.buttons & 1)) { down = null; return; }
      if (Math.abs(e.screenX - down[0]) + Math.abs(e.screenY - down[1]) < 4) return;
      down = null; WIN.startDragging().catch(() => {});
    });
    window.addEventListener("mouseup", () => { down = null; });
    const sync = () => WIN.isMaximized().then((m) => {
      if (m === !!S.winMax) return;
      S.winMax = m; root.dataset.max = m ? "1" : ""; mTop($("#top"));
    }).catch(() => {});
    WIN.onResized(sync).catch(() => {}); sync();
    // the one-column layout keeps the top bar pinned (it's the title bar); the key row sticks under it
    if (window.ResizeObserver) new ResizeObserver(() => root.style.setProperty("--top-h", $("#top").offsetHeight + "px")).observe($("#top"));
  }
  function mNav(el) {
    const v0 = viewById(S.view), custom = S.q !== v0.q;
    const count = (v) => S.items.filter((it) => E.matchItem(it, E.parseFilter(v.q), ctx())).length;
    let out = `<div class="mnav h"><div class="nkeys" role="tablist" aria-label="Views">`;
    VIEWS.forEach((v) => {
      if (v.id === "done") return;
      const n = ["now", "today", "inbox", "exams"].includes(v.id) ? count(v) : "", on = S.view === v.id;
      out += `<button class="nv${on ? " on" : ""}${on && custom ? " mod" : ""}" role="tab" aria-selected="${on}" data-act="go" data-v="${v.id}" data-hint="${v.k}" title="${esc(v.label)} · key ${v.k}">${ic(v.id)}<span class="lb">${esc(v.short || v.label)}</span>${n !== "" ? `<span class="ct" data-n="ct:${v.id}">${n}</span>` : ""}<kbd>${v.k}</kbd></button>`;
    });
    el.innerHTML = out + `</div><div class="nfoot"><button class="nv" data-act="lab" title="Appearance (${MOD}+.)" aria-label="Appearance">${ic("lab")}<span class="lb">Appearance</span><kbd>${MOD} .</kbd></button><button class="nv" data-act="help" title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">${ic("help")}<span class="lb">Shortcuts</span><kbd>?</kbd></button></div></div>`;
  }
  function mNow(el, r) {
    const head = (cnt, more) => `<div class="panel hero" data-win="now"><div class="ph"><span class="pt">${ic("now")}Do first</span><span class="sp"></span><span class="cnt" data-n="now:n">${cnt}</span>${more ? `<button class="btn ghost sm" data-act="skip" data-hint="n" title="Show the next candidate">Next${ic("next")}<kbd>N</kbd></button>` : ""}</div><div class="pb">`;
    if (!r.length) { el.innerHTML = head("All clear") + `<div class="hero-empty" data-k="hero:none"><h2 class="hero-t">Nothing to do first.</h2><p>Everything open is scheduled or snoozed.</p><button class="btn primary" data-act="quick">${ic("plus")}Add something<kbd>Q</kbd></button></div></div></div>`; return; }
    const idx = S.skip % r.length, { it, sc } = r[idx], c = courseOf(it), overdue = it.due != null && it.due < S.now;
    const urg = Math.round(Math.min(1, sc.urgency) * 100), pulse = ui().guide === "g4" ? " pulse" : "";
    const disp = it.due == null ? `<div class="display"><span class="d-lbl">Due</span><span class="d-num">--:--</span><span class="d-sub">No due date</span></div>`
      : `<div class="display${overdue ? " bad" : sc.urgency > 0.7 ? " hot" : ""}"><span class="d-lbl">${overdue ? "Overdue by" : "Due in"}</span><span class="d-num num" data-cd data-f="${overdue ? "since" : "clock"}" data-t="${it.due}"></span><span class="d-sub">${esc(mDue(it.due))}${it.est ? ` · ~${E.fmtDur(it.est * MIN)} of work` : ""}</span><span class="d-bar" title="Urgency ${urg}%"><i style="width:${urg}%"></i></span></div>`;
    el.innerHTML = head(`${idx + 1} of ${r.length}`, r.length > 1) + `<div class="hero-grid" data-k="hero:${it.id}"><div class="hero-main">
        <div class="meta-row">${cchip(c)}<span>${kLabel(it.kind)}</span>${it.src !== "manual" ? `<span class="srcl">from ${esc(srcName(it.src))}</span>` : ""}${it.pri ? `<span class="prio p${it.pri}">${ic("flag")}${PRI[it.pri]}</span>` : ""}</div>
        <h2 class="hero-t" data-act="sel" data-id="${it.id}" title="Details"><span class="tt">${esc(it.title)}</span></h2>
        <div class="why"><span class="why-l">Why first:</span>${sc.reasons.map((x) => `<span class="why-chip">${esc(cap(x))}</span>`).join("")}</div>
        <div class="actions">
          <button class="btn primary lg${pulse}" data-act="focus" data-id="${it.id}" data-min="25" data-hint="f">${ic("play", "fill")}Start focus · 25 min<kbd>F</kbd></button>
          <button class="btn" data-act="done" data-id="${it.id}" data-hint="x">${ic("check")}Done<kbd>X</kbd></button>
          <button class="btn" data-act="snooze" data-id="${it.id}" data-hint="s">${ic("clock")}Snooze<kbd>S</kbd></button>
          <button class="btn ghost" data-act="sel" data-id="${it.id}">Details</button>
        </div></div>${disp}</div></div></div>`;
  }
  function mSched(el, list) {
    const live = list.find((it) => it.due <= S.now && it.end > S.now), next = list.find((it) => it.due > S.now), d = new Date(S.now);
    let h = `<div class="panel" data-win="sched"><div class="ph"><span class="pt">${ic("clock")}Up next</span><span class="sp"></span><span class="cnt">${DNM[d.getDay()]}, ${MNM[d.getMonth()]} ${d.getDate()}</span></div><div class="pb">`;
    if (live) { const c = courseOf(live); h += `<div class="live" data-act="sel" data-id="${live.id}" data-k="live:${live.id}"><span class="ldot"></span><span class="lt">Now: <b>${c ? esc(c.code) + " " : ""}${esc(live.title)}</b></span><span class="sp"></span><span class="num">ends in <b data-cd data-f="clock" data-t="${live.end}"></b></span></div>`; }
    if (next) {
      const c = courseOf(next);
      h += `<div class="next" data-k="next:${next.id}"><div class="nx-head"><div class="nx-id"><div class="meta-row">${cchip(c)}<span>${kLabel(next.kind)}</span></div><div class="nx-t">${esc(next.title)}</div>
        <div class="facts"><span>${ic("clock")}${esc(mDue(next.due))}${next.end ? " – " + esc(mTime(next.end)) : ""}</span></div></div>
        <div class="display"><span class="d-lbl">Starts in</span><span class="d-num num" data-cd data-f="clock" data-t="${next.due}"></span></div></div>
        ${locBanner(next, tripTo(next))}
        <div class="actions sm">${(next.links || []).slice(0, 3).map((l) => `<button class="btn" data-act="open" data-url="${esc(l[1])}">${esc(l[0])}${ic("ext")}</button>`).join("")}<button class="btn ghost" data-act="sel" data-id="${next.id}">Details</button></div></div>`;
    } else h += `<div class="m-empty" data-k="next:none">${ic("today", "big")}<b>Nothing scheduled</b><span>in the next few days.</span></div>`;
    const t0 = E.startOfDay(S.now) + 7 * HR, t1 = E.startOfDay(S.now) + 24 * HR, pos = (t) => Math.max(0, Math.min(100, ((t - t0) / (t1 - t0)) * 100));
    const today = list.concat(S.items.filter((it) => E.SCHEDULED(it.kind) && it.end && it.end <= S.now && it.due >= t0 && E.matchItem(it, [], ctx()))).filter((it) => it.due < t1 && (it.end || it.due + HR) > t0);
    h += `<div class="timeline" title="Today, 7 AM to midnight">${today.map((it) => `<span class="blk ${it.kind === "class" ? "" : "ev"}" style="left:${pos(it.due)}%;width:${Math.max(0.8, pos(it.end || it.due + HR) - pos(it.due))}%" title="${esc(it.title)}"></span>`).join("")}<span class="nowln" style="left:${pos(S.now)}%"></span></div><div class="tl-scale"><span>7a</span><span>11a</span><span>3p</span><span>7p</span><span>11p</span></div>`;
    const rest = list.filter((it) => it !== next && it !== live).slice(0, 6);
    if (rest.length) h += `<div class="sub-h">Coming up</div><div class="agenda">${rest.map((it) => { const c = courseOf(it), pl = place(it.location); return `<div class="ag" data-act="sel" data-id="${it.id}" style="${kc(c)}"><span class="ag-when"><b>${esc(mDay(it.due).split(",")[0])}</b>${esc(mTime(it.due))}</span><span class="ag-bar"></span><span class="ag-main"><span class="ag-t">${esc(it.title)}</span><span class="ag-s">${c ? esc(c.code) : kLabel(it.kind)}${pl ? `<span class="ag-loc">${ic("pin")}${esc(placeShort(pl))}</span>` : ""}</span></span></div>`; }).join("")}</div>`;
    el.innerHTML = h + `</div></div>`;
  }
  function mFbar() {
    const terms = E.parseFilter(S.q), raws = terms.map((t) => t.raw);
    const quick = [...S.courses.filter((c) => c.included).map((c) => [`course:${c.tag.toLowerCase()}`, c.code, c]),
      ["due<=today", "Due today"], ["due:week", "This week"], ["is:overdue", "Overdue"], ["!2", "High priority"], ["#exam", "#exam"], ["src:canvas", "From Canvas"], ["src:manual", "Added by me"], ["status:doing", "In progress"]];
    return `<div class="fbar m"><div class="fbox">${ic("filter")}${terms.map((t, i) => `<button class="chip on" data-act="rmTerm" data-i="${i}" title="Remove this filter">${esc(t.raw)}<span class="x">×</span></button>`).join("")}<input id="fq" class="finput" placeholder="${terms.length ? "Add a filter…" : "Filter, e.g. course:130a  due<fri  #exam  !2"}" autocomplete="off" spellcheck="false" aria-label="Filter"></div><button class="btn ghost" data-act="clearQ" data-hint="esc">Clear<kbd>Esc</kbd></button></div>
      <div class="qstrip">${quick.map(([raw, label, c]) => `<button class="chip ${c ? "course" : ""} ${raws.includes(raw) ? "on" : ""}" data-act="toggleTerm" data-t="${esc(raw)}" style="${kc(c)}">${esc(label)}</button>`).join("")}</div>`;
  }
  function mRowHTML(it, i) {
    const c = courseOf(it), sched = E.SCHEDULED(it.kind), open = E.isOpen(it, S.now), st = dueState(it);
    const cls = ["row", "mrow"]; if (S.sel === it.id) cls.push("sel"); if (it.status === "done") cls.push("done"); if (it.status === "doing") cls.push("doing");
    if (sched) cls.push("cls"); if (st.c === "live") cls.push("live"); if (open && !sched && st.c === "over") cls.push("overdue"); if (S.flashId === it.id) cls.push("new");
    const chk = sched ? `<span class="chk sched" title="Scheduled">${ic(it.kind === "ticket" ? "ticket" : "clock")}</span>`
      : `<button class="chk" data-act="toggle" data-id="${it.id}" title="${it.status === "done" ? "Mark as not done" : "Mark done (X)"}" aria-label="Toggle done">${ic("check")}</button>`;
    const meta = [c ? `<span class="cdot" style="${kc(c)}"></span>${esc(c.code)}` : it.tags[0] ? "#" + esc(it.tags[0]) : "Personal", kLabel(it.kind)];
    if (it.est && !sched) meta.push("~" + E.fmtDur(it.est * MIN));
    if (sched && it.location) meta.push(`<span class="m-loc">${ic("pin")}${esc(placeShort(place(it.location)))}</span>`);
    if (it.src !== "manual") meta.push(esc(srcName(it.src)));
    return `<div class="${cls.join(" ")}" data-act="sel" data-id="${it.id}" data-k="${it.id}" style="--i:${i};${kc(c)}">${chk}
      <span class="m-main"><span class="m-t">${it.status === "doing" ? '<span class="doing-tag">In progress</span>' : ""}<span class="tt">${esc(it.title)}</span></span><span class="m-meta">${meta.map((m) => `<span>${m}</span>`).join("")}</span></span>
      <span class="m-pri p${it.pri}" title="${PRI[it.pri]}">${it.pri ? "!".repeat(it.pri) : ""}</span>
      <span class="m-due"><span class="duepill ${st.c}">${esc(st.t)}</span>${it.due != null ? `<span class="m-abs">${esc(st.c === "live" ? "until " + mTime(it.end) : mDue(it.due))}</span>` : ""}</span></div>`;
  }
  function mCoach() { return ui().guide === "g4" ? `<span class="coach" id="coach">Tip: ${TIPS[S.coachI % TIPS.length]}</span>` : ui().guide === "g2" ? `<span class="coach">Hold <b>${ALT}</b> to show every shortcut</span>` : ""; }
  function mBottom(el) {
    const key = (cls, act, hint, icon, label, k, extra) => `<button class="btn ${cls}" data-act="${act}" data-hint="${hint}" ${extra || ""}>${ic(icon)}<span class="kl">${label}</span><kbd>${k}</kbd></button>`;
    el.innerHTML = `<div class="deck" role="toolbar" aria-label="Actions">${key("primary", "quick", "q", "plus", "Add", "Q")}${key("dark", "focusTop", "f", "focus", "Focus 25", "F")}${key("", "tdone", "x", "check", "Done", "X", 'title="Done: the selected item, or Do first"')}${key("", "tsnooze", "s", "clock", "Snooze", "S")}${key("k-next", "skip", "n", "next", "Next", "N")}${key("", "palette", "k", "search", "Search", MOD + " K")}<span class="deck-sp"></span><span class="speaker" aria-hidden="true"></span></div>${mCoach()}`;
  }

  /* ─────────── list computation ─────────── */
  function listItems() {
    const terms = E.parseFilter(S.q);
    const list = S.items.filter((it) => E.matchItem(it, terms, ctx()));
    if (S.sort === "score") {
      const sc = new Map(list.map((it) => [it.id, E.score(it, S.now)]));
      return list.sort((a, b) => ((sc.get(b.id) || { total: -1 }).total - (sc.get(a.id) || { total: -1 }).total) || cmpDue(a, b));
    }
    if (S.sort === "updated") return list.sort((a, b) => b.updated - a.updated);
    return list.sort(cmpDue);
  }
  function hiddenCount() {
    const ex = S.courses.filter((c) => !c.included).map((c) => c.id);
    return { n: S.items.filter((it) => ex.includes(it.course) && E.isOpen(it, S.now)).length, m: ex.length };
  }

  /* ─────────── navigation + filters ─────────── */
  // Switching lens (list, week, classes, links) crossfades the whole screen; within a lens the rows deal in.
  const paint = (lens) => (lens !== S.lens ? MO.swap("lens", renderAll) : renderAll());
  function go(id) {
    const v = viewById(id), lens = S.lens;
    S.view = v.id; S.q = v.q; S.lens = v.lens; S.sort = v.sort; S.skip = 0; S.animRows = true;
    CA.sound.click(); paint(lens);
  }
  function setQ(q, keepFocus, from) {
    const lens = from || S.lens;
    S.q = q.replace(/\s+/g, " ").trim(); S.animRows = true;
    if (S.lens !== "list" && S.lens !== "week") { S.lens = "list"; S.sort = "due"; }
    if (keepFocus) S.refocus = "fq";
    paint(lens);
  }
  function toggleTerm(raw) {
    const terms = E.parseFilter(S.q).map((t) => t.raw);
    const i = terms.indexOf(raw);
    if (i >= 0) terms.splice(i, 1); else terms.push(raw);
    CA.sound.click(); setQ(terms.join(" "));
  }
  function clearQ() { const lens = S.lens; S.view = "all"; S.sort = "due"; S.lens = "list"; toast("Filters cleared · showing everything open"); setQ("is:open", false, lens); }

  /* ─────────── render: list + lenses ─────────── */
  function listLens() {
    const list = listItems(); S.listIds = list.map((x) => x.id);
    let h = "", i = 0, last = null;
    const counts = {}; if (S.sort === "due") list.forEach((it) => { const b = E.bucket(it, S.now); counts[b] = (counts[b] || 0) + 1; });
    for (const it of list) {
      if (S.sort === "due") { const b = E.bucket(it, S.now); if (b !== last) { h += `<div class="grp" data-k="g:${b}" style="--i:${i++}">${b}<span>${counts[b]}</span></div>`; last = b; } }
      h += mRowHTML(it, i++);
    }
    if (!list.length) h = `<div class="m-empty">${ic("done", "big")}<b>Nothing here.</b><span>No items match <code>${esc(S.q || "(no filter)")}</code>.</span><span class="actions sm"><button class="btn" data-act="clearQ">Clear filter<kbd>Esc</kbd></button><button class="btn primary" data-act="quick">${ic("plus")}Add<kbd>Q</kbd></button></span></div>`;
    const hc = hiddenCount();
    if (hc.n) h += `<div class="hidden-note" data-k="hidden">${hc.n} open items hidden from ${hc.m} excluded Canvas courses · <button class="chip" data-act="go" data-v="classes">manage</button></div>`;
    return { h, n: list.length };
  }
  function weekLens() {
    const list = listItems(); S.listIds = list.map((x) => x.id);
    let h = `<div class="week">`;
    for (let d = 0; d < 7; d++) {
      const day = E.addDays(E.startOfDay(S.now), d), dt = new Date(day);
      const its = list.filter((it) => it.due != null && it.due >= day && it.due < day + DAY);
      h += `<div class="wcol ${d === 0 ? "today" : ""}" style="--i:${d}"><div class="wh"><b>${d === 0 ? "Today" : DNM[dt.getDay()]}</b><span>${MNM[dt.getMonth()]} ${dt.getDate()}</span></div>${its.map((it) => {
        const c = courseOf(it), pl = E.SCHEDULED(it.kind) && place(it.location);
        return `<div class="wi ${E.SCHEDULED(it.kind) ? "cls" : ""} ${it.kind === "exam" ? "exam" : ""}" data-act="sel" data-id="${it.id}" data-k="w:${it.id}" style="${kc(c)}" title="${esc(it.title)}"><span class="wt">${esc(mTime(it.due))}${c ? " · " + esc(c.tag) : ""}</span><span class="wn">${esc(it.title)}</span>${pl ? `<span class="wl">${ic("pin")}${esc(placeShort(pl))}</span>` : ""}</div>`;
      }).join("") || '<div class="wnone">Free</div>'}</div>`;
    }
    return { h: h + `</div>`, n: list.length };
  }
  function coursesLens() {
    const card = (c, i) => {
      const open = S.items.filter((it) => it.course === c.id && E.isOpen(it, S.now) && E.ACTIONABLE(it.kind));
      const wkEnd = E.addDays(E.startOfDay(S.now), 7), dueWk = open.filter((it) => it.due != null && it.due < wkEnd).length;
      const nx = S.items.filter((it) => it.course === c.id && it.kind === "class" && it.due > S.now).sort(cmpDue)[0];
      const ex = open.filter((it) => it.kind === "exam").sort(cmpDue)[0];
      const meet = c.meet.map((m) => `${m.days} ${m.h}:${String(m.m).padStart(2, "0")} ${m.loc}`).join(" · ") || "no meetings synced";
      return `<div class="ccard ${c.included ? "" : "excluded"}" data-k="c:${c.id}" style="--i:${i};${kc(c)}"><h4>${esc(c.code)} <span class="dim">${c.tag}</span></h4><div class="meta">${esc(c.title)}</div><div class="meta">${esc(meet)}</div>
        ${c.included ? `<div class="meta">Next: ${nx ? mDue(nx.due) + " · " + E.fmtRel(nx.due, S.now) : "—"}</div><div class="meta">${open.length} open · ${dueWk} due this week${ex ? " · " + esc(ex.title) + " " + mDay(ex.due) : ""}</div>` : `<div class="meta">Excluded · items hidden everywhere</div>`}
        <div class="row2">${c.links.map((l) => `<button class="btn" data-act="open" data-url="${esc(l[1])}">${esc(l[0])}</button>`).join("")}</div>
        <div class="row2">${c.included ? `<button class="btn primary" data-act="q" data-q="is:open course:${c.tag.toLowerCase()}">Items${ic("go")}</button>` : ""}<button class="btn" data-act="incl" data-c="${c.id}">${c.included ? "Exclude" : "Include"}</button></div></div>`;
    };
    let h = `<div class="cgrid">${S.courses.filter((c) => c.included).map(card).join("")}</div>`;
    h += `<div class="sect">Excluded from Canvas sync (${S.courses.filter((c) => !c.included).length})</div><div class="cgrid">${S.courses.filter((c) => !c.included).map(card).join("")}</div>`;
    h += `<div class="sect">Google Calendar · which series are classes?</div><div class="calmap">${S.calendarSeries.map((s) => `<span>${esc(s.name)} <span class="dim">${esc(s.rule)}</span></span><button class="chip ${s.isClass ? "on" : ""}" data-act="calmap" data-s="${s.id}">${s.isClass ? "Class ✓" : "Not a class"}</button>`).join("")}</div>`;
    if (LIVE && !S.calendarSeries.length) h += `<div class="calmap"><span class="dim">Connect Google Calendar below to pick which series are classes.</span></div>`;
    h += `<div class="sect">Sources</div><div class="calmap">${LIVE ? liveSources() : SOURCES.map(([id, name, how, ago]) => `<span>${esc(name)} <span class="dim">${esc(how)}</span></span><button class="chip ${ago === "off" ? "" : "on"}" data-act="source" data-s="${id}">${ago === "off" ? "Connect" : ago === "live" ? "Live" : "Synced " + ago + " ago"}</button>`).join("")}</div>`;
    return { h, n: S.courses.length };
  }
  // Sources as they really stand: the two calendar feeds can be connected now; the rest arrive in M2/M3 (docs/SPEC.md).
  function liveSources() {
    const st = S.settings || {}, fd = S.feeds || {};
    const feed = (id, name, how, url) => {
      const log = fd[id] || {}, on = !!url;
      const label = !on ? "Connect" : !log.checked_at ? "Connected" : log.ok ? "Checked " + agoText(Date.parse(log.checked_at)) : "Problem · fix";
      return `<span>${esc(name)} <span class="dim">${esc(on ? hostOf(url).split("/")[0] : how)}</span></span><button class="chip ${on && log.ok !== false ? "on" : ""}" data-act="source" data-s="${id}">${label}</button>`;
    };
    return feed("canvas", "Canvas", "calendar feed link", st.canvas_feed_url) + feed("gcal", "Google Calendar", "secret iCal address", st.gcal_feed_url) +
      SOURCES.filter(([id]) => id !== "canvas" && id !== "gcal").map(([, name, how]) => `<span>${esc(name)} <span class="dim">${esc(how)}</span></span><button class="chip" data-act="source" data-s="later">Later</button>`).join("");
  }
  function agoText(t) { const m = Math.round((Date.now() - t) / MIN); return m < 1 ? "just now" : m < 60 ? m + "m ago" : m < 1440 ? Math.round(m / 60) + "h ago" : Math.round(m / 1440) + "d ago"; }
  function linksLens() {
    const btn = (l) => `<button class="btn" data-act="open" data-url="${esc(l[1])}">${esc(l[0])}${ic("ext")}</button>`;
    let h = `<div class="sect" style="margin-top:0">UCSB</div><div class="lgroup"><div class="row2">${GLOBAL_LINKS.map(btn).join("")}</div></div><div class="sect">Classes</div><div class="lgrid">`;
    h += S.courses.filter((c) => c.included).map((c) => `<div class="lgroup" style="${kc(c)}"><h4>${esc(c.code)}</h4><div class="row2">${c.links.map(btn).join("")}</div></div>`).join("");
    const withLinks = ranked().map((x) => x.it).filter((it) => it.links.length).slice(0, 8);
    h += `</div><div class="sect">From your open items</div><div class="lgrid">${withLinks.map((it) => { const c = courseOf(it); return `<div class="lgroup" style="${kc(c)}"><h4>${c ? c.tag + " · " : ""}${esc(it.title)}</h4><div class="row2">${it.links.map(btn).join("")}</div></div>`; }).join("")}</div>`;
    return { h, n: GLOBAL_LINKS.length };
  }
  function renderList() {
    const el = $("#list"), v = viewById(S.view);
    const out = ({ list: listLens, week: weekLens, courses: coursesLens, links: linksLens }[S.lens] || listLens)();
    const showBar = S.lens === "list" || S.lens === "week", by = { score: "ranked by do-first score", due: "by due date", updated: "recently changed" }[S.sort];
    el.innerHTML = `<div class="panel" data-win="list"><div class="ph"><span class="pt" data-n="list:t" data-fx="print">${ic(v.id)}${esc(viewTitle())}</span><span class="sp"></span><span class="cnt" data-n="list:n">${S.lens === "list" ? `${out.n} items<span class="cnt-x"> · ${by}</span>` : ""}</span></div>
      ${showBar ? mFbar() : ""}<div class="pb rows ${S.animRows ? "anim" : ""}">${out.h}</div></div>`;
  }

  /* ─────────── render: inspector ─────────── */
  function renderInsp() {
    const el = $("#insp"), it = S.sel && find(S.sel);
    el.className = "region insp float";
    if (!(S.insp && it)) { MO.leave(el); el.hidden = true; el.innerHTML = ""; delete el.dataset.for; return; }
    const swap = !el.hidden && el.dataset.for && el.dataset.for !== it.id;
    el.hidden = false;
    const head = (t) => `<div class="panel" data-win="insp" role="dialog" aria-label="${t}"><div class="ph"><span class="pt">${t}</span><span class="sp"></span><button class="btn ghost sm" data-act="closeInsp" aria-label="Close details">${ic("close")}<span class="bl">Close</span><kbd>Esc</kbd></button></div><div class="pb">`;
    const c = courseOf(it), sched = E.SCHEDULED(it.kind);
    const pad = (n) => String(n).padStart(2, "0");
    const dl = (t) => { if (t == null) return ""; const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
    const seg = (field, opts, cur) => `<div class="seg">${opts.map(([v, l]) => `<button class="chip ${String(cur) === String(v) ? "on" : ""}" data-act="setf" data-f="${field}" data-v="${v}">${l}</button>`).join("")}</div>`;
    const fl = LIVE && S.feeds && S.feeds[it.src], checked = fl && fl.checked_at ? Date.parse(fl.checked_at) : it.updated;
    const syncedAgo = Math.max(1, Math.round((S.now - checked) / MIN));
    el.innerHTML = head(sched ? kLabel(it.kind) : "Inspect") + `
      <div class="f-title" contenteditable="true" spellcheck="false" data-field="title">${esc(it.title)}</div>
      <div class="fgrid">
        <label>Kind</label><select data-field="kind">${Object.keys(KIND).map((k) => `<option value="${k}" ${k === it.kind ? "selected" : ""}>${kLabel(k)}</option>`).join("")}</select>
        <label>Course</label><select data-field="course"><option value="">— personal —</option>${S.courses.filter((x) => x.included || x.id === it.course).map((x) => `<option value="${x.id}" ${x.id === it.course ? "selected" : ""}>${esc(x.code)}</option>`).join("")}</select>
        <label>${sched ? "Starts" : "Due"}</label><input type="datetime-local" data-field="due" value="${dl(it.due)}">
        ${sched ? "" : `<label>Estimate</label>${seg("est", [[15, "15m"], [30, "30m"], [60, "1h"], [120, "2h"], [240, "4h"]], it.est)}`}
        ${sched ? "" : `<label>Priority</label>${seg("pri", [[0, "–"], [1, "!"], [2, "!!"], [3, "!!!"]], it.pri)}`}
        ${sched ? "" : `<label>Status</label>${seg("status", [["inbox", "inbox"], ["todo", "todo"], ["doing", "doing"], ["done", "done"]], it.status)}`}
        <label>Alert</label>${seg("interrupt", [["none", "none"], ["nudge", "nudge"], ["alert", "alert"], ["takeover", "takeover"]], it.interrupt)}
      </div>
      ${it.location ? locBanner(it, sched && it.due > S.now ? tripTo(it) : null) : ""}
      <div class="links">${it.links.map((l) => `<button class="btn" data-act="open" data-url="${esc(l[1])}">${esc(l[0])}${ic("ext")}</button>`).join("")}${c && c.links[0] ? `<button class="btn ghost" data-act="open" data-url="${esc(c.links[0][1])}">${esc(c.tag)} ${esc(c.links[0][0])}${ic("ext")}</button>` : ""}</div>
      <textarea class="notes" data-field="notes" placeholder="Notes… (saved on blur)">${esc(it.notes)}</textarea>
      <div class="srcinfo">${it.src === "manual" ? "Added by you" : `Source: ${esc(srcName(it.src))} · ${LIVE ? "checked" : "synced"} ${syncedAgo}m ago · your edits are kept as overrides on re-sync`}</div>
      <div class="acts">${sched ? "" : `<button class="btn primary" data-act="focus" data-id="${it.id}" data-min="25">${ic("play")}Focus 25</button><button class="btn" data-act="done" data-id="${it.id}">${ic("check")}${it.status === "done" ? "Undo done" : "Done"}</button><button class="btn" data-act="snooze" data-id="${it.id}">${ic("clock")}Snooze</button>`}<button class="btn ghost" data-act="del" data-id="${it.id}">${ic("trash")}Delete</button></div></div></div>`;
    el.dataset.for = it.id;
    if (swap) MO.ack(el.querySelector(".pb"), "swap");
  }

  /* ─────────── render: key deck ─────────── */
  function renderBottom() {
    const el = $("#bottom"), key = ui().guide;
    if (el.dataset.key === key && el.innerHTML) return;
    el.dataset.key = key; mBottom(el);
  }

  /* ─────────── island + shell mocks (desk preview) ─────────── */
  function presence() {
    const list = scheduleItems(), live = list.find((it) => it.kind === "class" && it.due <= S.now && it.end > S.now), next = list.find((it) => it.due > S.now && it.due - S.now < 12 * HR);
    if (S.focus) { const it = find(S.focus.id); return { label: "Focus · " + (it ? it.title : "session"), t: S.focus.end, p0: S.focus.start, p1: S.focus.end, short: "FOCUS" }; }
    if (live) { const c = courseOf(live); return { label: "In class · " + (c ? c.tag : "") + " " + live.title, t: live.end, p0: live.due, p1: live.end, short: c ? c.tag : "CLASS" }; }
    if (next) { const c = courseOf(next); return { label: (c ? c.tag + " " : "") + next.title, t: next.due, p0: next.due - HR, p1: next.due, short: c ? c.tag : kShort(next.kind), it: next, trip: tripTo(next) }; }
    const top = topItem(); return top ? { label: "Due · " + top.title, t: top.due || S.now, p0: S.now - HR, p1: top.due || S.now, short: "DUE" } : { label: "All clear", t: S.now, p0: 0, p1: 1, short: "OK" };
  }
  function dueTodayCount() { return S.items.filter((it) => E.matchItem(it, E.parseFilter("is:open is:actionable due<=today"), ctx())).length; }
  function renderIsland() {
    const el = $("#island");
    if (!ui().island || ui().desk !== "desk" || narrow()) { el.hidden = true; return; }
    if (busy() && el.contains(document.activeElement)) return;
    el.hidden = false; el.className = "island bset-" + ui().btn + (S.islandOpen ? " open" : ""); el.dataset.guide = ui().guide;
    const p = presence(), top = topItem(), urgent = p.t - S.now < 10 * MIN && p.t > S.now;
    el.innerHTML = `<div class="is-pill" data-act="island"><svg class="is-ring" viewBox="0 0 30 30" aria-hidden="true"><circle class="tr" cx="15" cy="15" r="12"/><circle class="pr" cx="15" cy="15" r="12" stroke-dasharray="75.4" data-ring data-p0="${p.p0}" data-p1="${p.p1}"/></svg><span class="is-lbl">${esc(p.label)}</span>${urgent ? '<span class="is-dot"></span>' : ""}<span class="is-cd num" data-cd data-f="clock" data-t="${p.t}">${cdText(p.t - S.now)}</span></div>
      <div class="is-more">
        ${p.it ? `<div class="is-row"><span class="dim">Next</span><span class="t">${esc(p.it.location || "")}${p.trip ? " · leave by " + mTime(p.trip.leave) : ""}</span>${(p.it.links || []).slice(0, 1).map((l) => `<button class="btn" data-act="open" data-url="${esc(l[1])}">${esc(l[0])}</button>`).join("")}</div>` : ""}
        ${top ? `<div class="is-row"><span class="dim">Do first</span><span class="t">${esc(top.title)}</span><button class="btn" data-act="done" data-id="${top.id}" aria-label="Done">${ic("check")}</button><button class="btn" data-act="focus" data-id="${top.id}" data-min="25">${ic("play")}25</button></div>` : ""}
        <div class="is-row"><span class="dim">${dueTodayCount()} due today</span><input id="isIn" placeholder="quick add… (enter)" autocomplete="off" spellcheck="false" aria-label="Quick add"></div>
      </div>`;
    updateRings();
  }
  function renderShell() {
    const desk = $("#desk"), tb = $("#taskbar"), sb = $("#shellbar");
    desk.dataset.mode = ui().desk; desk.dataset.shell = ui().shell;
    if (ui().desk !== "desk") { tb.hidden = sb.hidden = true; return; }
    const p = presence(), n = dueTodayCount(), d = new Date(S.now);
    const cd = `<span data-cd data-f="clock" data-t="${p.t}">${cdText(p.t - S.now)}</span>`;
    if (ui().shell === "win") {
      sb.hidden = true; tb.hidden = false;
      tb.innerHTML = `<span class="tb-hint">PREVIEW · STOCK WINDOWS TASKBAR (progress + overlay badge)</span><div class="tb-ic"><span class="g">::</span></div><div class="tb-ic"><span class="g">◎</span></div><div class="tb-ic"><span class="g">▤</span></div><div class="tb-ic"><span class="g">&gt;_</span></div>
        <div class="tb-ic tb-app" data-act="island" title="Collegiapp · ${esc(p.label)}"><span class="g">C</span><span class="tb-prog"><i data-ring data-p0="${p.p0}" data-p1="${p.p1}"></i></span>${n ? `<span class="tb-badge">${n}</span>` : ""}</div>
        <div class="tb-tray"><span title="Tray: tooltip shows ${esc(p.label)}">▴ C</span><span class="clock num">${E.fmtTime24(S.now)}<br>${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}</span></div>`;
    } else if (ui().shell === "zebar") {
      tb.hidden = true; sb.hidden = false; sb.className = "shellbar";
      sb.innerHTML = `<div class="ws"><span class="on">1</span><span>2</span><span>3</span></div><span style="opacity:.55">ZEBAR WIDGET · reads localhost:4747/presence</span><div class="wid" data-act="island">◉ ${esc(p.short)} ${cd}<span class="sep">│</span>${n} DUE TODAY<span class="sep">│</span>${esc((topItem() || { title: "—" }).title)}</div><span class="num">${E.fmtTime24(S.now)}</span>`;
    } else {
      tb.hidden = true; sb.hidden = false; sb.className = "shellbar mac";
      sb.innerHTML = `<div class="menus"><b>Collegiapp</b><span>File</span><span>Edit</span><span>View</span><span>Window</span></div><div class="stat"><span class="mi" data-act="island" title="Menu bar extra (tray title)">◉ ${esc(p.short)} ${cd}</span><span>${E.DN[d.getDay()].slice(0, 1) + E.DN[d.getDay()].slice(1).toLowerCase()} ${E.MN[d.getMonth()].slice(0, 1) + E.MN[d.getMonth()].slice(1).toLowerCase()} ${d.getDate()} ${E.fmtTime(S.now)}M</span></div>`;
    }
    updateRings();
  }
  function updateRings() {
    $$("[data-ring]").forEach((el) => {
      const p0 = +el.dataset.p0, p1 = +el.dataset.p1, p = Math.max(0, Math.min(1, (S.now - p0) / Math.max(1, p1 - p0)));
      if (el.tagName === "circle") el.setAttribute("stroke-dashoffset", (75.4 * (1 - p)).toFixed(1)); else el.style.width = (p * 100).toFixed(1) + "%";
    });
  }

  /* ─────────── render all ─────────── */
  // Every render replaces the markup, so motion.js carries the continuity. S.fx, set by the action that changed the
  // data, says what happened ({ flip, exit: { id: "done" | "swipe" | "snooze" | "del" | "out" }, skip }): list parts
  // that moved glide (FLIP), parts that left play their exit, and the Do first and Up next cards swap. A render for a
  // resize or a tick has no S.fx, so nothing moves; the cards still swap when their item changed.
  function renderAll() {
    S.now = Date.now();
    const fx = S.fx || {}; S.fx = null;
    const content = $("#content"); content.dataset.wide = S.lens === "list" ? "0" : "1";
    const view = [S.view, S.q, S.lens, S.sort].join("|"), same = view === S.shownView && !S.animRows;
    const listEl = $("#list"), lpb = $("#list .pb"), ltop = lpb ? lpb.scrollTop : 0, insp = $("#insp"), ipb = $("#insp .pb");
    const itop = ipb && !insp.hidden && insp.dataset.for === S.sel ? ipb.scrollTop : 0;
    const kept = fx.flip && same ? MO.keep(listEl) : null, hero = MO.keep($("#now")), next = MO.keep($("#sched")), texts = MO.texts(content);
    mTop($("#top")); mNav($("#nav")); mNow($("#now"), ranked()); mSched($("#sched"), scheduleItems()); renderList(); renderInsp(); renderBottom(); renderIsland(); renderShell();
    updateCountdowns();
    // keep the list and the details where they were scrolled to (a different list starts at the top)
    if (same && ltop) { const n = $("#list .pb"); if (n) n.scrollTop = ltop; }
    if (itop) { const n = $("#insp .pb"); if (n) n.scrollTop = itop; }
    const added = S.flashId && $(`#list .row[data-k="${S.flashId}"]`);
    if (added) added.scrollIntoView({ block: "nearest" });
    const exit = fx.exit || {}, hx = {};
    for (const id in exit) hx["hero:" + id] = exit[id] === "swipe" ? "done" : exit[id];
    if (fx.skip) hero.forEach((b, k) => { hx[k] = hx[k] || "skip"; });
    MO.settle(listEl, kept, { exit });
    MO.settle($("#now"), hero, { move: false, exit: hx, enter: fx.skip ? "r" : "up" });
    MO.settle($("#sched"), next, { move: false, enter: "up" });
    MO.counts(content, texts);
    // a done item that stays in this list (Exams shows done ones) gets its check stamped where it is
    for (const id in exit) {
      const row = exit[id] !== "out" && exit[id] !== "del" && listEl.querySelector(`.row.done[data-k="${id}"]`);
      if (row) { MO.ack(row.querySelector(".chk"), "stamp"); MO.ack(row.querySelector(".tt"), "strike"); }
    }
    S.animRows = false; S.flashId = null; S.shownView = view;
    if (S.refocus) { const f = document.getElementById(S.refocus); if (f) f.focus(); S.refocus = null; }
  }
  function updateCountdowns() {
    $$("[data-cd]").forEach((el) => {
      const s = el.dataset.f === "since" ? sinceText(S.now - +el.dataset.t) : cdText(+el.dataset.t - S.now);
      setDisp(el, s); el.classList.toggle("blink", s === "NOW"); // an LCD at zero blinks, like an alarm clock
    });
    $$("[data-clock]").forEach((el) => setDisp(el, clockStr()));
    updateRings();
  }

  /* ─────────── overlays ─────────── */
  function openOv(name, html, cls) {
    const ov = $("#ov"), again = !ov.hidden && S.overlay === name;
    if (!ov.hidden && !again) MO.leave(ov); // one overlay replacing another: the old one fades under the new
    ov.className = "ov " + (cls || "") + (again ? " again" : ""); ov.innerHTML = html; ov.hidden = false; S.overlay = name;
  }
  function closeOv() { const ov = $("#ov"); MO.leave(ov); ov.hidden = true; ov.innerHTML = ""; S.overlay = null; }
  function dialog(title, hint, body, cls) { return `<div class="dialog panel ${cls || ""}" role="dialog" aria-label="${title}"><div class="ph"><span class="pt">${title}</span><span class="sp"></span><span class="cnt">${hint}</span><button class="btn ghost sm ov-x" data-act="closeOv" aria-label="Close">${ic("close")}</button></div><div class="pb">${body}</div></div>`; }

  // quick add
  const TPL = [["Homework", "hw  fri ~2h"], ["Lab", "lab  tmr ~3h"], ["Reading", "read ch  tmr ~45m"], ["Exam prep", "study for midterm ~2h #exam"], ["Email TA", "email TA about  !!"], ["Errand", "buy  "], ["Apply", "apply  #career"], ["Office hours", "oh  "]];
  function openQuick(prefill) {
    openOv("quick", dialog("Quick add", `Enter add · Shift+Enter add + open · ${MOD}+Enter add + focus`, `<div class="qa-wrap"><span class="qa-prompt">+</span><input id="qaIn" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" aria-label="Quick add" placeholder="pa3 130a fri 11:59p ~4h !!"><button class="btn primary" data-act="qaGo">${ic("plus")}Add<kbd>Enter</kbd></button></div>
      <div class="qa-parse" id="qaParse"></div><div class="qa-hl" id="qaHl"></div>
      <div class="tpl"><span class="dim">Templates</span>${TPL.map(([l, t], i) => `<button class="btn" data-act="tpl" data-i="${i}">${l}</button>`).join("")}</div>
      <div class="qa-hl">Grammar: course <span class="tk-course">130a</span> · date <span class="tk-date">fri / tmr / 11/12 / in 3d</span> · time <span class="tk-time">5pm</span> · estimate <span class="tk-estimate">~2h</span> · priority <span class="tk-priority">!!</span> · <span class="tk-tag">#tag</span> · <span class="tk-location">@place</span> · words like <span class="tk-kindhint">hw lab quiz midterm read</span> set the kind. Title only is fine; it lands in the Inbox.</div>`));
    const inp = $("#qaIn"); inp.value = prefill || ""; inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); S.qaPrev = null; updateQuick(); CA.sound.whoosh();
  }
  function draftFrom(text) {
    const d = E.parseQuick(text, Date.now(), S.courses), auto = !d.course ? ctxCourse() : null;
    return { d, auto };
  }
  function updateQuick() {
    const inp = $("#qaIn"); if (!inp) return;
    const { d, auto } = draftFrom(inp.value), c = cById(d.course || (auto && auto.id));
    const chips = [`<span class="pc" data-k="title">Title <b>${esc(d.title || "…")}</b></span>`, `<span class="pc" data-k="kind">Kind <b>${kLabel(d.kind)}</b></span>`];
    if (c) chips.push(`<span class="pc course" data-k="course" style="${kc(c)}">Course <b>${esc(c.code)}</b>${!d.course && auto ? ` <i>auto · ${auto.why}</i>` : ""}</span>`);
    chips.push(`<span class="pc" data-k="due">Due <b>${d.due ? mDue(d.due) + " · " + E.fmtRel(d.due, Date.now()) : "none"}</b>${!d.due && !c ? " <i>→ Inbox</i>" : ""}</span>`);
    if (d.est) chips.push(`<span class="pc" data-k="est">Estimate <b>${E.fmtDur(d.est * MIN)}</b></span>`);
    if (d.pri) chips.push(`<span class="pc" data-k="pri">Priority <b>${"!".repeat(d.pri)}</b></span>`);
    d.tags.forEach((t) => chips.push(`<span class="pc" data-k="tag:${esc(t)}">Tag <b>#${esc(t)}</b></span>`));
    if (d.location) chips.push(`<span class="pc" data-k="where">Where <b>${esc(d.location)}</b></span>`);
    $("#qaParse").innerHTML = chips.join("");
    // what the grammar just recognized pops in; a value that changed flashes (the title changes on every key, so it doesn't)
    const prev = S.qaPrev; S.qaPrev = {};
    $$("#qaParse .pc").forEach((el) => {
      const k = el.dataset.k, v = el.textContent; S.qaPrev[k] = v;
      if (prev && k !== "title" && prev[k] !== v) MO.ack(el, prev[k] == null ? "pop" : "flash");
    });
    $("#qaHl").innerHTML = d.tokens.length ? d.tokens.map((t) => `<span class="tk tk-${t.type}">${esc(t.t)}</span>`).join(" ") : "";
  }
  function addFromText(text, mode) {
    if (!text.trim()) return null;
    const { d, auto } = draftFrom(text), now = Date.now(), course = d.course || (auto && auto.id) || null;
    const it = { id: CA.store.uuid(), title: d.title || "(untitled)", kind: d.kind, status: d.due || course ? "todo" : "inbox", course, due: d.due, end: null, est: d.est, pri: d.pri, weight: null,
      tags: d.tags, links: d.links.map((u) => [hostOf(u).split("/")[0], u]), location: d.location, notes: "", interrupt: "none", src: "manual", snoozed: null, created: now, updated: now };
    S.items.push(it); CA.store.save(it); S.flashId = it.id; S.sel = it.id; S.stats.xp += 2; S.fx = { flip: true };
    S.undo = { label: "ADD", fn: () => { it.deleted = true; CA.store.save(it); S.items = S.items.filter((x) => x.id !== it.id); } };
    toast(`Added · ${esc(it.title)}${course ? " · " + cById(course).tag : ""}${it.due ? " · " + mDue(it.due) : " · Inbox"}`, { undo: true });
    CA.sound.ok();
    if (mode === "open") S.insp = true;
    if (mode === "focus") startFocus(it.id, 25);
    return it;
  }

  // command palette
  function palEntries() {
    const out = [], cmd = (label, hint, run, sub) => out.push({ sec: "Commands", label, hint, run, sub });
    cmd("Quick add…", "Q", () => openQuick());
    cmd("Focus 25 min on Do first", "F", focusTop);
    cmd("Focus 50 min on Do first", "", () => topItem() && startFocus(topItem().id, 50));
    cmd("Lockdown 90 min (kill games, block sites)", "", () => topItem() && startFocus(topItem().id, 90, "lockdown"));
    cmd("Focus setup…", "Shift+F", openFocusSetup);
    cmd("Clear filters", "Esc", clearQ);
    if (LIVE) { cmd("Refresh calendars", "", syncNow); cmd("Connect calendars…", "", () => openFeeds()); } else cmd("Sync now", "", syncNow);
    if (LIVE && !MOBILE) cmd(S.update ? `Install update ${S.update.version}…` : "Check for updates", "", () => (S.update ? openUpdate(S.update) : checkUpdate(true)));
    cmd("Appearance…", MOD + "+.", openLab);
    cmd("Larger text", MOD + "+=", () => CA.lab.zoom(1));
    cmd("Smaller text", MOD + "+−", () => CA.lab.zoom(-1));
    cmd("Switch light / night", "", () => CA.lab.toggleNight());
    cmd("Toggle desk preview", "", () => CA.lab.set({ desk: ui().desk === "desk" ? "full" : "desk" }));
    cmd("Toggle island", "", () => (TAURI ? TAURI.core.invoke("toggle_island").catch(() => {}) : CA.lab.set({ island: !ui().island })));
    cmd("Simulate: class in 10 min (nudge)", "", () => simulate("nudge"));
    cmd("Simulate: class in 10 min (alert)", "", () => simulate("alert"));
    cmd("Simulate: class in 5 min (takeover)", "", () => simulate("takeover"));
    cmd("Keyboard shortcuts", "?", openHelp);
    VIEWS.forEach((v) => out.push({ sec: "Views", label: "Go to " + v.label, hint: v.k, sub: v.q, run: () => go(v.id) }));
    S.courses.filter((c) => c.included).forEach((c) => out.push({ sec: "Classes", label: c.code + " " + c.title, hint: "", sub: c.tag, run: () => setQ("is:open course:" + c.tag.toLowerCase()) }));
    S.items.filter((it) => E.matchItem(it, [], ctx()) && E.isOpen(it, S.now)).forEach((it) => { const c = courseOf(it); out.push({ sec: "Items", label: it.title, sub: (c ? c.tag + " · " : "") + (it.due ? fDue(it.due) : kLabel(it.kind)), hint: "", run: () => select(it.id, true) }); });
    S.courses.filter((c) => c.included).forEach((c) => c.links.forEach((l) => out.push({ sec: "Links", label: c.tag + " " + l[0], sub: hostOf(l[1]), hint: "↗", run: () => openLink(l[1]) })));
    GLOBAL_LINKS.forEach((l) => out.push({ sec: "Links", label: l[0], sub: hostOf(l[1]), hint: "↗", run: () => openLink(l[1]) }));
    return out;
  }
  function openPalette(initial) {
    openOv("palette", dialog("Search · commands", "↑↓ Enter · Esc", `<div class="qa-wrap"><span class="qa-prompt">&gt;</span><input id="palIn" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" aria-label="Search commands" placeholder="commands, items, classes, links…"></div><div class="pal-res" id="palRes"></div>`));
    const inp = $("#palIn"); inp.value = initial || ""; inp.focus(); S.palI = 0; updatePalette(); CA.sound.whoosh();
  }
  function updatePalette() {
    const q = ($("#palIn") || {}).value || "";
    let list = palEntries();
    if (q) list = list.map((e) => ({ e, s: E.fuzzy(q, e.label + " " + (e.sub || "")) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 30).map((x) => x.e);
    else list = list.filter((e) => e.sec === "Commands" || e.sec === "Views").slice(0, 26);
    S.palList = list; S.palI = Math.min(S.palI, Math.max(0, list.length - 1));
    let h = "", sec = null;
    const order = q ? list : list;
    order.forEach((e, i) => { if (!q && e.sec !== sec) { h += `<div class="pal-sec">${e.sec}</div>`; sec = e.sec; } h += `<div class="pal-it ${i === S.palI ? "on" : ""}" data-act="palRun" data-i="${i}"><span>${esc(e.label)}</span><span class="dim">${[q ? e.sec.toLowerCase() : "", esc(e.sub || "")].filter(Boolean).join(" · ")}</span><span class="sp"></span>${e.hint ? `<kbd>${esc(e.hint)}</kbd>` : ""}</div>`; });
    $("#palRes").innerHTML = h || `<div class="empty">No match. Enter adds “${esc(q)}” as a new item.</div>`;
    const on = $(".pal-it.on"); if (on) on.scrollIntoView({ block: "nearest" });
  }
  function runPalette(i) {
    const e = S.palList[i]; const q = ($("#palIn") || {}).value || "";
    closeOv();
    if (e) e.run(); else if (q.trim()) addFromText(q), renderAll();
  }

  function openHelp() {
    const keys = [["Q", "quick add (" + MOD + "+Shift+Space system-wide in the app)"], [MOD + "+K  /", "search and commands"], ["1 – 9, 0", "views: saved filters"], ["Esc", "close · clear filters"], ["J K ↑ ↓", "move selection"], ["Enter", "open details"],
      ["X  Space", "toggle done"], ["F", "focus 25 on selection / Do first"], ["Shift+F", "focus setup"], ["S", "snooze"], ["N", "next Do first"], ["+", "priority up"], ["Del", "delete (undo)"], [MOD + "+Z", "undo"],
      [MOD + "+.", "appearance"], [MOD + "+=  " + MOD + "+−", "text size"], ["Hold " + ALT, "show every shortcut"], ["Right-click · long-press", "radial menu (on a row: item actions)"], ["Swipe a row", "right: done · left: snooze (touch)"]];
    openOv("help", dialog("Keys & help", "Esc", `<div class="helpgrid">${keys.map(([k, d]) => `<div><kbd>${k}</kbd><span>${d}</span></div>`).join("")}</div>`));
  }

  // snooze
  function openSnooze(id) {
    const it = find(id); if (!it) return;
    const now = Date.now(), t = (dOff, h, m) => { const d = new Date(E.addDays(E.startOfDay(now), dOff)); d.setHours(h, m || 0, 0, 0); return d.getTime(); };
    const nc = S.items.filter((x) => x.kind === "class" && x.due > now).sort(cmpDue)[0];
    const sat = (6 - new Date(now).getDay() + 7) % 7 || 7, mon = (8 - new Date(now).getDay()) % 7 || 7;
    const opts = [["In 1 hour", now + HR], ...(new Date(now).getHours() < 20 ? [["Tonight 9 PM", t(0, 21)]] : []), ...(nc ? [["After next class (" + (courseOf(nc) ? courseOf(nc).tag : "") + ")", nc.end + 10 * MIN]] : []),
      ["Tomorrow 9 AM", t(1, 9)], ["This weekend (Sat 10 AM)", t(sat, 10)], ["Next week (Mon 9 AM)", t(mon, 9)]];
    S.snoozeOpts = opts; S.snoozeId = id;
    openOv("snooze", dialog("Snooze · " + esc(it.title), "1–" + opts.length + " · Esc", `<div class="pal-res stag">${opts.map(([l, ts], i) => `<div class="pal-it" data-act="snoozePick" data-i="${i}" style="--i:${i}"><kbd>${i + 1}</kbd><span>${esc(l)}</span><span class="sp"></span><span class="dim">${fDue(ts, now)}</span></div>`).join("")}</div>`, "sm"));
  }
  function snoozePick(i) {
    const it = find(S.snoozeId), o = S.snoozeOpts[i]; closeOv(); if (!it || !o) return;
    S.undo = { label: "SNOOZE", fn: edit(it, { snoozed: o[1] }), id: it.id }; S.fx = { flip: true, exit: { [it.id]: "snooze" } };
    toast(`Snoozed · ${esc(it.title)} → ${mDue(o[1])}`, { undo: true }); CA.sound.click(); renderAll();
  }

  /* ─────────── focus sessions ─────────── */
  const BLOCK_APPS = ["steam.exe", "discord.exe", "riotclientservices.exe", "epicgameslauncher.exe", "battle.net.exe", "robloxplayerbeta.exe"];
  const BLOCK_SITES = ["youtube.com", "reddit.com", "twitch.tv", "x.com", "instagram.com", "tiktok.com", "netflix.com"];
  function openFocusSetup(id) {
    const it = (id && find(id)) || target();
    S.fsetup = { id: it && it.id, min: 25, level: ui().focusLevel || "hard" };
    const body = () => `<div class="fo-setup"><span class="dim">Task</span><span>${it ? esc(it.title) : "—"}</span>
      <span class="dim">Length</span><div class="seg">${[15, 25, 50, 90].map((m) => `<button class="chip ${S.fsetup.min === m ? "on" : ""}" data-act="fsMin" data-v="${m}">${m} min</button>`).join("")}</div>
      <span class="dim">Level</span><div class="seg">${[["soft", "Soft · reminders"], ["hard", "Hard · kill + block"], ["lockdown", "Lockdown · kiosk"]].map(([v, l]) => `<button class="chip ${S.fsetup.level === v ? "on" : ""}" data-act="fsLvl" data-v="${v}">${l}</button>`).join("")}</div>
      <span class="dim">Blocks</span><span class="dim">${S.fsetup.level === "soft" ? "nothing — nudges only" : LIVE ? "closes " + (S.blocklist.length ? S.blocklist.join(" · ") : "games and chat apps") + " · sites need the Firefox extension (M3)" : BLOCK_APPS.join(" · ") + " · " + BLOCK_SITES.length + " sites"}</span></div>
      <div class="nb" style="justify-content:center;margin-top:.8em"><button class="btn primary" data-act="fsGo">${ic("play")}Start<kbd>Enter</kbd></button><button class="btn" data-act="closeOv">Cancel<kbd>Esc</kbd></button></div>`;
    S.fsetupBody = body;
    openOv("fsetup", dialog("Focus setup", "Enter start · Esc", `<div id="fsBody">${body()}</div>`, "sm"));
  }
  // Inside the app a session is real (src-tauri/src/focus.rs): Hard and Lockdown close the blocked apps every 2 s
  // and end early only with the phrase. The web demo simulates it.
  function startFocus(id, min, level) {
    closeOv();
    level = level || ui().focusLevel || "hard";
    if (!LIVE) return beginFocus(id, min, level, null);
    CA.store.invoke("start_focus", { minutes: min, level }).then((st) => beginFocus(id, min, level, st)).catch((e) => toast("Focus did not start · " + esc(String(e))));
  }
  function beginFocus(id, min, level, st) {
    const now = Date.now();
    S.focus = { id, start: st ? Date.parse(st.started_at) : now, end: st ? Date.parse(st.ends_at) : now + min * MIN, min, level, killed: 0 };
    const it = find(id); if (it && it.status !== "done") edit(it, { status: "doing" });
    CA.sound.ok(); showFocus(true); renderAll();
  }
  // End a session: the Rust session first (a Hard one refuses without the phrase), then the screen.
  function endFocus(completed, phrase) {
    if (!LIVE || !S.focus) return finishFocus(completed);
    CA.store.invoke("end_focus", { phrase: phrase || null }).then(() => finishFocus(completed)).catch((e) => toast(esc(String(e))));
  }
  function onFocusTick(st) {
    const f = S.focus; if (!f || !st || !st.active) return;
    f.end = Date.parse(st.ends_at);
    const log = $("#foLog"), fresh = (st.killed || []).slice(f.killed); f.killed = (st.killed || []).length;
    if (log && fresh.length) { log.innerHTML += fresh.map((n) => `<span class="ok">${esc(("> " + n).padEnd(26, ".") + " CLOSED")}</span>\n`).join(""); CA.sound.key(); }
  }
  function showFocus(fresh) {
    const f = S.focus; if (!f) return;
    const it = find(f.id), c = courseOf(it);
    openOv("focus", `<div class="focus"><div class="fo-top">Focus · ${cap(f.level)} level · ends ${mTime(f.end)}${LIVE ? "" : " · simulated in the prototype"}</div>
      <div class="fo-task">${c ? `<span style="${kc(c)}color:var(--kc)">${c.tag}</span> ` : ""}${esc(it ? it.title : "Focus")}</div>
      <div class="display big${f.end - Date.now() <= MIN ? " hot" : ""}"><span class="d-lbl">Time left</span><span class="d-num fo-time num" data-cd data-f="clock" data-t="${f.end}"></span></div>
      <div class="fo-bar meter" id="foBar">${Array.from({ length: 24 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div>
      <div class="fo-log" id="foLog"></div>
      <div class="nb" style="justify-content:center"><button class="btn" data-act="foAdd">+5 min</button>${f.level !== "lockdown" ? `<button class="btn" data-act="foMin">Minimize to island<kbd>Esc</kbd></button>` : ""}<button class="btn primary" data-act="foDone">${ic("check")}Task done</button><button class="btn" data-act="foEnd">End early…</button>${LIVE ? "" : `<button class="btn ghost" data-act="foSkip">Demo: finish now</button>`}</div>
      <div class="fo-exit" id="foExit" hidden><span class="dim">Type “${PHRASE}” to quit early:</span><input id="foPhrase" autocomplete="off" spellcheck="false" aria-label="Exit phrase"></div></div>`, "full");
    focusBar();
    if (fresh) MO.ack($("#ov .display.big"), "boot");
    if (fresh && LIVE) {
      const apps = S.blocklist.length ? S.blocklist.join(" · ").toUpperCase() : "GAMES AND CHAT APPS";
      typeLines($("#foLog"), f.level === "soft" ? ["> FOCUS ARMED · SOFT · " + f.min + ":00", "> NOTHING IS CLOSED · SOFT IS A TIMER"]
        : ["> FOCUS ARMED · " + f.level.toUpperCase() + " · " + f.min + ":00", "> CLOSING ON SIGHT: " + apps, "> SITE BLOCKING ARRIVES WITH THE FIREFOX EXTENSION",
          f.level === "lockdown" ? "> LOCKDOWN · QUIT IS REFUSED UNTIL THE TIMER ENDS" : "> ESC MINIMIZES · IT DOES NOT END THE SESSION"]);
    } else if (fresh) {
      const lines = f.level === "soft" ? ["> FOCUS ARMED · SOFT · " + f.min + ":00", "> NOTHING BLOCKED · YOU'LL GET NUDGES IF YOU WANDER", "> NOTIFICATIONS: DO NOT DISTURB ON"]
        : ["> FOCUS ARMED · " + f.level.toUpperCase() + " · " + f.min + ":00", "> SCANNING PROCESSES …", ...BLOCK_APPS.slice(0, 4).map((a, i) => `> ${a.padEnd(24, ".")} ${i < 2 ? "TERMINATED" : "NOT RUNNING"}`),
          "> FIREFOX POLICY · " + BLOCK_SITES.slice(0, 4).join(" ") + " … BLOCKED", "> ALLOWED: code.exe · firefox (canvas, gradescope, docs) · terminal",
          ...(f.level === "lockdown" ? ["> LOCKDOWN · FULLSCREEN KIOSK · OTHER WINDOWS MINIMIZED", "> EXIT ONLY WHEN THE TIMER ENDS OR WITH THE PHRASE"] : ["> ESC MINIMIZES · IT DOES NOT END THE SESSION"])];
      typeLines($("#foLog"), lines);
    } else $("#foLog").innerHTML = `<span class="ok">> SESSION RUNNING · ${f.level.toUpperCase()}</span>`;
  }
  function typeLines(el, lines) {
    let i = 0; const m = motion();
    const step = () => { if (!el.isConnected || i >= lines.length) return; el.innerHTML += `<span class="${/TERMINATED|BLOCKED|ARMED/.test(lines[i]) ? "ok" : ""}">${esc(lines[i])}</span>\n`; i++; CA.sound.key(); setTimeout(step, m ? 170 * m : 0); };
    step();
  }
  function focusBar() {
    const f = S.focus, bar = $("#foBar"); if (!f || !bar) return;
    const p = Math.max(0, Math.min(1, (Date.now() - f.start) / (f.end - f.start))), n = Math.round(p * 24);
    $$("i", bar).forEach((x, i) => (x.className = i < n ? "on" : ""));
  }
  function finishFocus(completed) {
    const f = S.focus; if (!f) return;
    const mins = Math.max(1, Math.round((Math.min(Date.now(), f.end) - f.start) / MIN)), full = completed ? f.min : mins;
    addFocusStats(full); S.focus = null;
    const it = find(f.id);
    openOv("focusdone", `<div class="focus"><div class="fo-top">Session ${completed ? "complete" : "ended"}</div><div class="fo-time" id="foGain">+${full} min</div><div class="fo-task"><span id="foXp">+${full * 2}</span> XP · ${S.stats.focusMin} min focused today · ${S.stats.streak}-day streak</div>
      <div class="nb" style="justify-content:center">${it && it.status !== "done" ? `<button class="btn primary" data-act="done" data-id="${it.id}">${ic("check")}Mark “${esc(it.title)}” done</button>` : ""}<button class="btn" data-act="focus" data-id="${f.id}" data-min="25">Keep going +25</button><button class="btn" data-act="closeOv">Close<kbd>Esc</kbd></button></div></div>`, "full");
    CA.sound.done(); renderAll();
    // the minutes and XP count up on the LCD, then the pixels go
    MO.count($("#foGain"), full, (n) => "+" + n + " min"); MO.count($("#foXp"), full * 2, (n) => "+" + n);
    setTimeout(() => MO.burstAt($("#foGain"), { n: 18, reach: 64, ms: 700 }), 450 * motion());
  }
  // true when it did something (the F key presses its on-screen twins only then)
  function focusTop() {
    if (S.focus) { showFocus(false); return true; }
    const t = target(), pick = t && E.ACTIONABLE(t.kind) ? t : topItem(); // a selected class can't be focused on; fall back to Do First
    if (pick) { startFocus(pick.id, 25); return true; }
    return refuse(hinted("f"));
  }

  /* ─────────── interruptions ─────────── */
  function fireAlert(it, level) {
    const c = courseOf(it), lbl = `${c ? c.tag + " " : ""}${it.title}`, trip = tripTo(it), leave = trip ? "leave by " + mTime(trip.leave) : "";
    const zoom = (it.links || []).find((l) => /zoom/i.test(l[0]));
    if (level === "nudge") {
      toast(`${ic("bell")}${esc(lbl)} in ${cdText(it.due - Date.now())}${it.location ? " · " + esc(it.location) : ""}${leave ? " · " + leave : ""}`, { ms: 9000, ring: true, actions: [...(zoom ? [["Zoom", () => openLink(zoom[1])]] : []), ["Snooze 5m", () => { S.alerted[it.id] = false; if (LIVE) setTimeout(() => { const x = find(it.id); if (x && x.due > Date.now()) fireAlert(x, "nudge"); }, 5 * MIN); toast("I'll remind you again in 5 min"); }]] });
      CA.sound.beep(); return;
    }
    CA.sound.alarm();
    const acts = `<button class="btn primary" data-act="alertGo">${ic("walk")}On my way</button>${zoom ? `<button class="btn" data-act="open" data-url="${esc(zoom[1])}">${ic("video")}Join Zoom</button>` : ""}<button class="btn" data-act="alertSkip" data-id="${it.id}">Skipping…</button>`;
    if (level === "takeover") {
      openOv("takeover", `<div class="takeover"><div class="fo-top">Interrupt · takeover</div><div class="big">Get up.</div><div class="fo-task">${esc(lbl)}</div><div class="display big bad"><span class="d-lbl">Starts in</span><span class="d-num num" data-cd data-f="clock" data-t="${it.due}"></span></div>${locBanner(it, trip)}<div class="dim">This screen stays until you answer</div><div class="actions">${acts}</div><div id="skipWhy"></div></div>`, "full");
    } else {
      openOv("alert", `<div class="dialog panel alertbox sm"><div class="ph"><span class="pt">${ic("bell")}${kLabel(it.kind)} soon</span><span class="sp"></span><span class="cnt">Alert</span></div><div class="pb"><div class="nx-t">${esc(lbl)}</div><div class="display"><span class="d-lbl">Starts in</span><span class="d-num num" data-cd data-f="clock" data-t="${it.due}"></span></div>${locBanner(it, trip)}<div class="actions">${acts}</div><div id="skipWhy"></div></div></div>`);
    }
    updateCountdowns(); MO.ack($("#ov .display"), "boot");
  }
  function simulate(level) {
    const it = nextAlertable(); if (!it) return toast("No upcoming class to simulate");
    const fake = Object.assign({}, it, { due: Date.now() + (level === "takeover" ? 5 : 10) * MIN });
    fireAlert(fake, level);
  }
  function checkAlerts() {
    for (const it of S.items) {
      if (!E.SCHEDULED(it.kind) || it.interrupt === "none" || S.alerted[it.id] || !E.matchItem(it, [], ctx())) continue;
      const d = it.due - S.now;
      if (d > 0 && d <= 10 * MIN) { S.alerted[it.id] = true; if (!S.overlay) fireAlert(it, it.interrupt); else toast(`◷ ${esc(it.title)} in ${cdText(d)}`); }
    }
  }

  // The Rust ticker sends "alert" when a class with an interrupt level is 10 minutes out (src-tauri/src/presence.rs).
  function onAlert(a) {
    const it = a && find(a.item_id); if (!it || S.alerted[it.id]) return;
    S.alerted[it.id] = true;
    if (!S.overlay || a.level === "takeover") fireAlert(it, a.level); else toast(`◷ ${esc(it.title)} in ${cdText(it.due - Date.now())}`);
  }

  /* ─────────── calendar feeds (src-tauri/src/feeds.rs) ─────────── */
  function feedLine(log, url) {
    if (!url) return "Not connected";
    if (!log || !log.checked_at) return "Connected · not checked yet";
    if (!log.ok) return `<span class="bad">${esc(log.error)}</span>`;
    const n = log.counts || {};
    return `Checked ${agoText(Date.parse(log.checked_at))} · ${n.added} new · ${n.updated} updated · ${n.unchanged} unchanged${n.removed ? " · " + n.removed + " removed" : ""}`;
  }
  function openFeeds() {
    const st = S.settings || {}, fd = S.feeds || {};
    const field = (id, name, where, url, log, ph) => `<div class="feed"><label for="${id}In"><b>${name}</b></label><div class="dim">${where}</div>
      <div class="qa-wrap"><input id="${id}In" class="feed-in" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${url ? "Connected to " + esc(hostOf(url).split("/")[0]) + " · paste a new link to replace" : ph}"></div>
      <div class="dim feed-st" id="${id}St">${feedLine(log, url)}${url ? ` · <button class="chip" data-act="feedOff" data-s="${id === "fC" ? "canvas" : "gcal"}">Disconnect</button>` : ""}</div></div>`;
    openOv("feeds", dialog("Connect calendars", "Enter import · Esc", `<div class="feeds">
      ${field("fC", "Canvas calendar feed", "Canvas › Calendar › Calendar feed (bottom right) › copy the link.", st.canvas_feed_url, fd.canvas, "https://canvas.ucsb.edu/feeds/calendars/user_….ics")}
      ${field("fG", "Google Calendar", "Google Calendar › Settings › your calendar › Integrate calendar › Secret address in iCal format.", st.gcal_feed_url, fd.gcal, "https://calendar.google.com/calendar/ical/…/basic.ics")}
      <div class="dim">These links work like passwords to your calendars. They stay on this device and are checked every 30 minutes.</div>
      <div class="nb"><button class="btn primary" data-act="feedSave">${ic("check")}Save and import<kbd>Enter</kbd></button><button class="btn" data-act="feedFile">Import a .ics file…</button><button class="btn" data-act="closeOv">Close<kbd>Esc</kbd></button></div>
      <input type="file" id="feedFileIn" accept=".ics,text/calendar" hidden></div>`));
    const inp = $("#fCIn"); if (inp) inp.focus();
  }
  function feedSummary(f) {
    const part = (name, log) => (!log || !log.checked_at ? "" : log.ok ? `${name} ${log.counts.added} new, ${log.counts.updated} updated` : `${name} failed`);
    return [part("Canvas", f.canvas), part("Google", f.gcal)].filter(Boolean).join(" · ") || "Nothing connected yet";
  }
  async function feedSave() {
    const pairs = [["canvas", $("#fCIn")], ["gcal", $("#fGIn")]].filter(([, el]) => el && el.value.trim());
    try {
      for (const [adapter, el] of pairs) S.settings = await CA.store.invoke("set_feed", { adapter, url: el.value.trim() });
    } catch (e) { return toast(esc(String(e))); }
    if (!S.settings || !(S.settings.canvas_feed_url || S.settings.gcal_feed_url)) return toast("Paste a feed link first");
    $$(".feed-st").forEach((el) => (el.textContent = "Importing…"));
    try {
      S.feeds = await CA.store.invoke("refresh_feeds");
      toast("Imported · " + esc(feedSummary(S.feeds)) + (S.feeds.series.length ? " · pick your classes in Classes (7)" : ""), { ms: 7000 }); CA.sound.ok();
    } catch (e) { toast("Import failed · " + esc(String(e))); }
    if (S.overlay === "feeds") openFeeds();
    renderAll();
  }
  function feedFile(file) {
    const r = new FileReader();
    r.onload = () => {
      const text = String(r.result || ""), adapter = /PRODID:[^\r\n]*Instructure|UID:[^\r\n]*assignment/i.test(text) ? "canvas" : "gcal";
      CA.store.invoke("import_ics", { text, adapter }).then((n) => { toast(`Imported ${adapter === "canvas" ? "Canvas" : "Google"} file · ${n.added} new · ${n.updated} updated`); CA.sound.ok(); })
        .catch((e) => toast("Import failed · " + esc(String(e))));
    };
    r.readAsText(file);
  }

  function syncNow() {
    if (LIVE) {
      const st = S.settings || {};
      if (!st.canvas_feed_url && !st.gcal_feed_url) return openFeeds();
      toast("Refreshing calendars…");
      return CA.store.invoke("refresh_feeds").then((f) => { S.feeds = f; toast("Refreshed · " + esc(feedSummary(f))); }).catch((e) => toast("Refresh failed · " + esc(String(e))));
    }
    setTimeout(() => { toast("Synced · Windows ⇄ Mac · 0 conflicts · 6 Firestore writes"); CA.sound.ok(); }, 900);
  }

  /* ─────────── updates (src-tauri/src/updater.rs) ─────────── */
  // The app checks GitHub Releases in the background and says so once per version (toast, palette, tray). Installing
  // restarts the app, so it waits for the user, and Rust refuses it during focus.
  function checkUpdate(manual) {
    if (!LIVE || MOBILE) return;
    if (manual) toast("Checking for updates…");
    CA.store.invoke("check_update").then((u) => (u ? openUpdate(u) : manual && toast("Collegiapp is up to date")))
      .catch((e) => manual && toast("Could not check for updates · " + esc(String(e))));
  }
  function onUpdate(u) {
    const fresh = !S.update || S.update.version !== u.version; S.update = u;
    if (fresh && S.overlay !== "update") toast(`${ic("bell")}Collegiapp ${esc(u.version)} is ready`, { ms: 12000, ring: true, actions: [["See what's new", () => openUpdate(u)]] });
  }
  function openUpdate(u) {
    S.update = u;
    const wait = S.focus ? "Finish your focus session first. The update waits for you." : "";
    openOv("update", dialog("Update", "Enter install · Esc", `<div class="upd">
      <div class="display"><span class="d-lbl">New version</span><span class="d-num num">${esc(u.version)}</span><span class="d-sub" id="updSt">You have ${esc(u.current)}</span><span class="d-bar"><i id="updBar" style="width:0%"></i></span></div>
      ${u.notes ? `<div class="upd-notes">${esc(u.notes)}</div>` : ""}
      <div class="dim">${wait || "Collegiapp closes, installs and reopens in a few seconds. Your list and settings stay as they are."}</div>
      <div class="nb"><button class="btn primary" data-act="updGo"${wait ? " disabled" : ""}>${ic("check")}Install and restart<kbd>Enter</kbd></button><button class="btn" data-act="closeOv">Later<kbd>Esc</kbd></button></div></div>`));
  }
  function installUpdate() {
    const b = $("[data-act=updGo]"), st = $("#updSt");
    if (!b || b.disabled) return;
    b.disabled = true; st.textContent = "Downloading…";
    CA.store.invoke("install_update").catch((e) => { b.disabled = false; st.textContent = "Not installed"; toast("Update failed · " + esc(String(e))); });
  }
  function onUpdateProgress(p) {
    const bar = $("#updBar"), st = $("#updSt"); if (!bar) return;
    const pct = p.total ? Math.min(100, Math.round((100 * p.done) / p.total)) : 0;
    bar.style.width = pct + "%"; st.textContent = pct >= 100 ? "Installing · Collegiapp reopens in a moment" : `Downloading · ${pct}%`;
  }

  /* ─────────── item actions ─────────── */
  function select(id, open) {
    if (S.sel === id && S.insp && open !== true) { S.insp = false; } else { S.sel = id; S.insp = true; }
    CA.sound.click(); renderAll();
  }
  // Done answers where it was pressed: pixels burst from the key or the check, the row's check stamps and its title
  // strikes as it leaves (renderAll, exit "done"), and the rows below close the gap. It commits at once, so a second X
  // acts on the next item. Clearing the last Do first item plays the fanfare.
  function toggleDone(id, src, kind) {
    const it = find(id); if (!it || E.SCHEDULED(it.kind)) return;
    const row = $(`#list .row[data-k="${id}"]`), before = ranked().length;
    const undo = edit(it, { status: it.status === "done" ? "todo" : "done" }), done = it.status === "done";
    S.undo = { label: "DONE", fn: undo, id }; S.fx = { flip: true, exit: { [id]: done ? kind || "done" : "out" } };
    if (done) {
      const xp = 10 + it.pri * 10 + (it.weight || 0) * 5; S.stats.xp += xp; saveStats();
      const from = (src && src.isConnected && shown(src) && src) || (row && row.querySelector(".chk")) || $(`#now [data-act="done"][data-id="${id}"]`);
      xpFloat(from || $("#now"), "+" + xp + " XP"); MO.burstAt(from);
      if (S.focus && S.focus.id === id) focusDone(it);
    }
    toast(done ? `Done · ${esc(it.title)}` : `Reopened · ${esc(it.title)}`, { undo: true });
    if (S.sel === id && done && S.view === "now") S.sel = null;
    renderAll();
    if (!done) return CA.sound.click();
    if (before && !ranked().length) { CA.sound.clear(); MO.after(() => MO.burstAt($("#now .hero-empty"), { n: 22, reach: 72, ms: 760 })); } else CA.sound.done();
  }
  function del(id) {
    const it = find(id); if (!it) return;
    S.undo = { label: "DELETE", fn: edit(it, { deleted: true }), id }; S.fx = { flip: true, exit: { [id]: "del" } };
    if (S.sel === id) { S.sel = null; S.insp = false; }
    toast(`Deleted · ${esc(it.title)}`, { undo: true }); renderAll();
  }
  function bumpPri(id) {
    const it = find(id); if (!it) return;
    edit(it, { pri: (it.pri + 1) % 4 }); S.fx = { flip: true };
    toast(`Priority ${it.pri ? "!".repeat(it.pri) : "none"} · ${esc(it.title)}`); CA.sound.click(); renderAll();
    $$(`#list .row[data-k="${id}"] .m-pri, #now .prio`).forEach((el) => { el.dataset.dir = it.pri ? "up" : "down"; MO.ack(el, "bump"); });
  }
  // Undo puts the item back where it was: the rows make room and it drops in, flashing.
  function doUndo() {
    const u = S.undo; if (!u) return;
    u.fn(); S.undo = null; S.fx = { flip: true }; S.flashId = u.id || null;
    toast("Undid " + u.label.toLowerCase()); CA.sound.undo(); renderAll();
  }
  // N: the next Do first candidate slides in from the right (refused when there is no other)
  function skip() {
    if (ranked().length < 2) return refuse(hinted("n"));
    S.skip++; S.fx = { skip: true }; CA.sound.click(); renderAll(); return true;
  }
  function moveSel(d) {
    if (!S.listIds.length) return;
    let i = S.listIds.indexOf(S.sel); i = i < 0 ? (d > 0 ? 0 : S.listIds.length - 1) : Math.max(0, Math.min(S.listIds.length - 1, i + d));
    S.sel = S.listIds[i]; CA.sound.key(); renderAll();
    const sel = MO.ack($("#list .row.sel")), pb = sel && sel.closest(".pb");
    if (sel && pb) { const r = sel.getBoundingClientRect(), b = pb.getBoundingClientRect(); if (r.top < b.top) pb.scrollTop -= b.top - r.top; else if (r.bottom > b.bottom) pb.scrollTop += r.bottom - b.bottom; }
  }
  function openLink(url) {
    if (!url) return;
    if (TAURI) { TAURI.core.invoke("open_link", { url }).catch((e) => toast("Could not open link · " + esc(String(e)))); return; }
    toast(`Opening in Firefox → ${esc(hostOf(url))}`); CA.sound.click();
  }
  function xpFloat(anchor, text) {
    if (!anchor) return;
    const cr = $("#content").getBoundingClientRect(), r = anchor.getBoundingClientRect(), x = document.createElement("div");
    x.className = "xpf"; x.textContent = text; x.style.left = (r.left - cr.left + r.width * 0.6) + "px"; x.style.top = (r.top - cr.top) + "px";
    $("#layer").appendChild(x); setTimeout(() => x.remove(), 1300);
  }
  // Toasts stack like receipts: a new one pushes the others up (they glide), an undo toast drains a bar for the time it
  // has left, and hovering one holds it. opts.ring rings the bell icon (nudges, updates).
  function toast(msg, opts) {
    opts = opts || {};
    const host = $("#toasts"), t = document.createElement("div"), m = motion();
    let left = opts.ms || 4200, t0 = 0, timer = 0;
    t.className = "toast" + (opts.ring ? " ring" : ""); t._actions = opts.actions || [];
    t.innerHTML = `<span class="msg">${msg}</span>${opts.undo ? `<button class="btn" data-act="undo">Undo<kbd>${MOD}+Z</kbd></button>` : ""}${t._actions.map((a, i) => `<button class="btn" data-act="toastAct" data-i="${i}">${esc(a[0])}</button>`).join("")}${opts.undo && m ? `<i class="t-life" style="animation-duration:${left}ms"></i>` : ""}`;
    const old = [...host.children], tops = old.map((x) => x.getBoundingClientRect().top);
    host.appendChild(t); while (host.children.length > 4) host.firstChild.remove();
    if (m) old.forEach((x, i) => {
      const dy = x.isConnected ? tops[i] - x.getBoundingClientRect().top : 0;
      if (Math.abs(dy) > 1) x.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 220 * m, easing: MO.EASE });
    });
    const run = () => { t0 = Date.now(); timer = setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 300); }, left); };
    t.addEventListener("pointerenter", () => { clearTimeout(timer); left = Math.max(900, left - (Date.now() - t0)); t.classList.add("hold"); });
    t.addEventListener("pointerleave", () => { t.classList.remove("hold"); run(); });
    run();
  }

  /* ─────────── radial menu + key tips ─────────── */
  function openRadial(x, y, it) {
    const el = $("#radial");
    const opts = !it ? [["plus", "Add", () => openQuick()], ["focus", "Focus", focusTop], ["today", "Today", () => go("today")], ["work", "Work", () => go("work")], ["search", "Search", () => openPalette()], ["classes", "Classes", () => go("classes")]]
      : E.SCHEDULED(it.kind) ? [["all", "Details", () => select(it.id, true)], ["bell", "Takeover alert", () => { edit(it, { interrupt: "takeover" }); toast("Takeover alert set · " + esc(it.title)); }], ["ext", "Links", () => it.links[0] && openLink(it.links[0][1])], ["trash", "Delete", () => del(it.id)]]
      : [["check", "Done", () => toggleDone(it.id)], ["play", "Focus", () => startFocus(it.id, 25)], ["clock", "Snooze", () => openSnooze(it.id)], ["all", "Details", () => select(it.id, true)], ["flag", "Priority +", () => bumpPri(it.id)], ["trash", "Delete", () => del(it.id)]];
    S.radialOpts = opts;
    const cr = $("#content").getBoundingClientRect(), fs = parseFloat(getComputedStyle($("#content")).fontSize), pad = 8 * fs;
    x = Math.max(pad, Math.min(cr.width - pad, x)); y = Math.max(pad, Math.min(cr.height - pad, y));
    el.style.left = x + "px"; el.style.top = y + "px";
    el.innerHTML = `<div class="ring"></div><div class="hub">${it ? "Item" : "Menu"}</div>${opts.map((o, i) => { const a = (i / opts.length) * Math.PI * 2 - Math.PI / 2; return `<button class="btn rb" data-act="radial" data-i="${i}" style="left:${(Math.cos(a) * 5.4).toFixed(2)}em;top:${(Math.sin(a) * 5.4).toFixed(2)}em;animation-delay:${i * 25}ms">${ic(o[0])}${o[1]}</button>`; }).join("")}`;
    el.hidden = false; CA.sound.whoosh();
  }
  function closeRadial() { const el = $("#radial"); if (!el.hidden) { MO.leave(el); el.hidden = true; el.innerHTML = ""; return true; } return false; }
  function showTips() {
    if (ui().guide === "g3") return;
    const tips = $("#tips"), cr = $("#content").getBoundingClientRect();
    tips.innerHTML = $$("[data-hint]", $("#screen")).filter((el) => el.offsetParent && el.getBoundingClientRect().width).map((el, i) => { const r = el.getBoundingClientRect(); return `<span class="tip" style="left:${r.left - cr.left}px;top:${r.top - cr.top}px;--i:${Math.min(i, 16)}">${esc(el.dataset.hint)}</span>`; }).join("");
    tips.hidden = false;
  }
  function hideTips() { const t = $("#tips"); if (t && !t.hidden) { t.hidden = true; t.innerHTML = ""; return true; } return false; }

  /* ─────────── lab bridge ─────────── */
  function openLab() { CA.lab && CA.lab.open(); }

  /* ─────────── events ─────────── */
  const ACTIONS = {
    go: (el) => go(el.dataset.v), q: (el) => { S.view = "all"; setQ(el.dataset.q); }, sel: (el) => select(el.dataset.id),
    toggle: (el) => toggleDone(el.dataset.id, el), done: (el) => { if (S.overlay === "focusdone") closeOv(); toggleDone(el.dataset.id, el); },
    focus: (el) => startFocus(el.dataset.id, +el.dataset.min || 25), snooze: (el) => openSnooze(el.dataset.id), skip: () => skip(),
    del: (el) => del(el.dataset.id), quick: () => openQuick(), palette: () => openPalette(), help: () => openHelp(), lab: openLab,
    clearQ, rmTerm: (el) => { const t = E.parseFilter(S.q); t.splice(+el.dataset.i, 1); setQ(t.map((x) => x.raw).join(" ")); },
    toggleTerm: (el) => toggleTerm(el.dataset.t), closeInsp: () => { S.insp = false; renderAll(); }, closeOv,
    open: (el) => openLink(el.dataset.url), undo: doUndo, toastAct: (el) => { const t = el.closest(".toast"); const a = t && t._actions[+el.dataset.i]; if (a) a[1](); if (t) t.remove(); },
    setf: (el) => { const it = find(S.sel); if (!it) return; const f = el.dataset.f, v = el.dataset.v; edit(it, { [f]: f === "est" || f === "pri" ? +v : v }); S.fx = { flip: true }; CA.sound.click(); renderAll(); },
    incl: (el) => {
      const c = cById(el.dataset.c); c.included = !c.included;
      CA.store.saveCourse(c).catch((e) => toast("Not saved · " + esc(String(e))));
      toast(`${c.code} ${c.included ? "included" : "excluded · its items are hidden everywhere"}`); S.fx = { flip: true }; renderAll();
    },
    calmap: (el) => {
      const s = S.calendarSeries.find((x) => x.id === el.dataset.s); s.isClass = !s.isClass;
      if (LIVE) CA.store.invoke("set_class_series", { uids: S.calendarSeries.filter((x) => x.isClass).map((x) => x.id) }).catch((e) => toast("Classes not updated · " + esc(String(e))));
      toast(`${esc(s.name)} → ${s.isClass ? "class (gets alerts + countdown)" : "not a class"}`); renderAll();
    },
    source: (el) => {
      const id = el.dataset.s;
      if (LIVE && (id === "canvas" || id === "gcal")) return openFeeds();
      toast(LIVE ? "Shoreline, Gradescope and the UCSB APIs come next (M2 and M3 in docs/SPEC.md)" : `Source setup · ${esc(srcName(id))} · see docs/SPEC.md § Integrations`);
    },
    feedSave: () => feedSave(), feedFile: () => { const f = $("#feedFileIn"); if (f) f.click(); }, updGo: installUpdate,
    feedOff: (el) => CA.store.invoke("set_feed", { adapter: el.dataset.s, url: null }).then((st) => { S.settings = st; toast("Disconnected · its items stay"); openFeeds(); renderAll(); }).catch((e) => toast(esc(String(e)))),
    tpl: (el) => { const inp = $("#qaIn"); inp.value = TPL[+el.dataset.i][1]; inp.focus(); const k = inp.value.indexOf("  "); inp.setSelectionRange(k + 1, k + 1); updateQuick(); },
    palRun: (el) => runPalette(+el.dataset.i), snoozePick: (el) => snoozePick(+el.dataset.i),
    fsMin: (el) => { S.fsetup.min = +el.dataset.v; $("#fsBody").innerHTML = S.fsetupBody(); }, fsLvl: (el) => { S.fsetup.level = el.dataset.v; $("#fsBody").innerHTML = S.fsetupBody(); },
    fsGo: () => S.fsetup.id && startFocus(S.fsetup.id, S.fsetup.min, S.fsetup.level), focusSetup: () => openFocusSetup(), focusTop,
    foAdd: () => {
      if (!LIVE) { S.focus.end += 5 * MIN; return showFocus(false); }
      CA.store.invoke("extend_focus", { minutes: 5 }).then((st) => { S.focus.end = Date.parse(st.ends_at); showFocus(false); }).catch((e) => toast(esc(String(e))));
    }, foMin: () => { closeOv(); renderAll(); toast("Focus continues · the timer is in the island and the top bar"); },
    foDone: () => { const it = find(S.focus.id); if (it && it.status !== "done") { edit(it, { status: "done" }); S.stats.xp += 10 + it.pri * 10 + (it.weight || 0) * 5; saveStats(); } focusDone(it); },
    foEnd: () => { if (S.focus.level === "soft") return endFocus(false); const x = $("#foExit"); x.hidden = false; $("#foPhrase").focus(); },
    foSkip: () => { S.focus.end = Date.now(); finishFocus(true); },
    alertGo: () => { closeOv(); toast("Go. The island keeps the countdown."); CA.sound.ok(); },
    alertSkip: (el) => { $("#skipWhy").innerHTML = `<div class="actions sm" style="justify-content:center;margin-top:.5em"><span class="dim">Why?</span>${["sick", "watching recording", "exam prep", "other"].map((w) => `<button class="chip" data-act="skipWhy" data-w="${w}">${w}</button>`).join("")}</div>`; },
    skipWhy: (el) => { closeOv(); toast(`Skip logged · “${esc(el.dataset.w)}” · shows in your weekly review`); },
    island: () => { S.islandOpen = !S.islandOpen; renderIsland(); CA.sound.click(); },
    tdone: (el) => { const t = target(); if (t) toggleDone(t.id); else refuse(el); }, tsnooze: (el) => { const t = target(); if (t) openSnooze(t.id); else refuse(el); },
    qaGo: () => { const v = $("#qaIn").value; if (!v.trim()) return refuse($(".qa-wrap")); closeOv(); addFromText(v); renderAll(); },
    radial: (el) => { const o = S.radialOpts[+el.dataset.i]; closeRadial(); o && o[2](); },
    focusQ: () => { const f = $("#fq"); if (f) f.focus(); },
    winMin: () => WIN && WIN.minimize().catch(() => {}), winMax: () => WIN && WIN.toggleMaximize().catch(() => {}),
    winClose: () => WIN && WIN.close().catch(() => {}),
  };

  // The key that was clicked springs back up (.ack). Most actions re-render, so the key may be a new element by then:
  // find it again by what it is (its kind, action and data) inside the same region.
  const ACK = ["btn", "nv", "chip", "wk", "row", "fpill", "pal-it"];
  function ackKey(a) {
    if (!motion() || a.closest(".gone")) return;
    const kind = ACK.find((c) => a.classList.contains(c)); if (!kind) return;
    const d = a.dataset, sig = "." + kind + ["act", "id", "v", "i", "f", "t", "s", "c", "min"].map((k) => (d[k] != null ? `[data-${k}="${CSS.escape(d[k])}"]` : "")).join("");
    const host = a.parentElement && a.parentElement.closest("[id]"), hid = host && host.id;
    MO.after(() => {
      if (a.isConnected) return MO.ack(a);
      const root = hid && document.getElementById(hid), b = root && root.querySelector(sig);
      if (b) MO.ack(b);
    });
  }

  function bind() {
    document.addEventListener("click", (e) => {
      if (Date.now() < S.noClickUntil) { e.preventDefault(); return; } // a swipe or long-press just ended
      const radial = $("#radial"); if (!radial.hidden && !e.target.closest("#radial")) closeRadial();
      const a = e.target.closest("[data-act]"); if (!a || !ACTIONS[a.dataset.act]) return;
      if (a.closest("#lab")) return;
      if (a.dataset.act === "island" && e.target.closest(".is-more")) return;
      e.preventDefault(); ACTIONS[a.dataset.act](a, e);
      if (!a.classList.contains("nope")) ackKey(a);
    });
    document.addEventListener("dblclick", (e) => { const r = e.target.closest(".row"); if (r && !E.SCHEDULED((find(r.dataset.id) || {}).kind)) startFocus(r.dataset.id, 25); });
    document.addEventListener("contextmenu", (e) => {
      const content = $("#content"); if (!content.contains(e.target) || e.target.closest("input, textarea, select")) return;
      e.preventDefault(); const cr = content.getBoundingClientRect(), row = e.target.closest(".row, .un-row, .wi, .ag");
      openRadial(e.clientX - cr.left, e.clientY - cr.top, row ? find(row.dataset.id) : null);
    });
    // touch: long-press opens the radial menu (iOS fires no contextmenu); swiping a row right marks it done, left snoozes it
    let press = null, lp = null;
    const swallow = () => { S.noClickUntil = Date.now() + 450; };
    const lpOff = () => { if (lp) { lp.remove(); lp = null; } };
    document.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" || !e.isPrimary || !$("#content").contains(e.target) || e.target.closest("input, textarea, select, [contenteditable]")) return;
      const row = e.target.closest("#list .row.mrow"), it = row && find(row.dataset.id);
      press = { x: e.clientX, y: e.clientY, it, row: it && !E.SCHEDULED(it.kind) ? row : null, dx: 0 };
      press.t = setTimeout(() => { lpOff(); if (!press || press.dx) return; const cr = $("#content").getBoundingClientRect(); swallow(); openRadial(press.x - cr.left, press.y - cr.top, press.it); press = null; }, 520);
      // the ring fills toward the radial menu (pocket.css .lpress)
      lpOff(); const layer = $("#layer");
      if (motion() && layer) { const lr = layer.getBoundingClientRect(); lp = document.createElement("i"); lp.className = "lpress"; lp.style.left = e.clientX - lr.left + "px"; lp.style.top = e.clientY - lr.top + "px"; layer.appendChild(lp); }
    });
    document.addEventListener("pointermove", (e) => {
      if (!press || !e.isPrimary) return;
      const dx = e.clientX - press.x, dy = e.clientY - press.y;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) lpOff();
      if (!press.dx && Math.abs(dy) > 10) { clearTimeout(press.t); press = null; return; } // scrolling, not a gesture
      if (press.row && (press.dx || Math.abs(dx) > 12)) {
        clearTimeout(press.t); press.dx = dx; press.row.style.translate = `${dx}px 0`; press.row.classList.add("drag");
        const sw = dx > 90 ? "done" : dx < -90 ? "snooze" : "";
        if (sw !== (press.row.dataset.swipe || "")) { press.row.dataset.swipe = sw; if (sw) { CA.sound.tick(); if (navigator.vibrate) navigator.vibrate(8); } } // a detent at the threshold
      }
    });
    const release = (e) => {
      if (!press) return; clearTimeout(press.t);
      lpOff(); const p = press; press = null; if (!p.row || !p.dx) return;
      p.row.classList.remove("drag"); delete p.row.dataset.swipe; swallow();
      // a done row leaves from where it was dragged to; any other springs back (pocket.css transitions translate)
      if (e.type === "pointerup" && p.dx > 90) return toggleDone(p.row.dataset.id, null, "swipe");
      p.row.style.translate = "";
      if (e.type === "pointerup" && p.dx < -90) openSnooze(p.row.dataset.id);
    };
    document.addEventListener("pointerup", release); document.addEventListener("pointercancel", release);
    document.addEventListener("input", (e) => {
      const t = e.target;
      if (t.id === "qaIn") updateQuick();
      else if (t.id === "palIn") { S.palI = 0; updatePalette(); }
      else if (t.id === "foPhrase" && t.value.trim().toLowerCase() === PHRASE) endFocus(false, t.value);
    });
    document.addEventListener("change", (e) => {
      const t = e.target;
      if (t.id === "feedFileIn") { if (t.files && t.files[0]) feedFile(t.files[0]); t.value = ""; return; }
      const f = t.dataset && t.dataset.field; if (!f || !t.closest("#insp")) return;
      const it = find(S.sel); if (!it) return;
      if (f === "due") edit(it, { due: t.value ? new Date(t.value).getTime() : null });
      else if (f === "course") edit(it, { course: t.value || null });
      else edit(it, { [f]: t.value });
      S.fx = { flip: true }; renderAll(); MO.ack($(`#insp [data-field="${f}"]`), "saved");
    });
    document.addEventListener("focusout", (e) => {
      const t = e.target; if (!t.dataset || t.dataset.field !== "title" || !t.closest("#insp")) return;
      const it = find(S.sel); const v = t.textContent.trim(); if (it && v && v !== it.title) { edit(it, { title: v }); setTimeout(() => { S.fx = { flip: true }; renderAll(); MO.ack($('#insp [data-field="title"]'), "saved"); }, 0); }
    });
    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup", (e) => { if (e.key === "Alt") hideTips(); });
    window.addEventListener("blur", hideTips);
    window.addEventListener("resize", () => renderAll());
  }

  function onKey(e) {
    const k = e.key, t = e.target, inField = /INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable;
    if (t.closest && t.closest("#lab")) { if (k === "Escape") CA.lab.close(); return; }
    if (k === "Alt") { e.preventDefault(); showTips(); return; }
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      // match the physical key: Option+letter on a Mac types a symbol (Option+Q is “œ”)
      const ch = ((e.code || "").match(/^(?:Key|Digit)(\w)$/) || [])[1] || k;
      const hit = $$(`[data-hint]`, $("#screen")).find((el) => el.dataset.hint.toLowerCase() === ch.toLowerCase() && el.offsetParent);
      if (hit) { e.preventDefault(); hideTips(); hit.click(); }
      return;
    }
    const mod = e.ctrlKey || e.metaKey;
    if (mod && k.toLowerCase() === "k") { e.preventDefault(); mirror("k"); return openPalette(); }
    if (mod && k === ".") { e.preventDefault(); return CA.lab.toggle(); }
    if (mod && e.shiftKey && k === " ") { e.preventDefault(); return openQuick(); }
    if (mod && k.toLowerCase() === "z" && !inField) { e.preventDefault(); return doUndo(); }
    if (mod && (k === "=" || k === "+")) { e.preventDefault(); return CA.lab.zoom(1); }
    if (mod && (k === "-" || k === "_")) { e.preventDefault(); return CA.lab.zoom(-1); }
    if (mod && k === "0") { e.preventDefault(); return CA.lab.zoom(0); }
    const FK = { F1: openHelp, F2: () => openQuick(), F3: () => openPalette(), F4: ACTIONS.focusQ, F8: () => openFocusSetup(), F9: () => CA.lab.toggle() };
    if (FK[k]) { e.preventDefault(); return FK[k](); }
    if (k === "Escape") return onEsc(e);

    // inputs with their own key handling
    if (t.id === "qaIn" && k === "Enter") { e.preventDefault(); const v = t.value; if (!v.trim()) return refuse($(".qa-wrap")); closeOv(); addFromText(v, e.shiftKey ? "open" : mod ? "focus" : null); if (!(mod && v.trim())) renderAll(); return; }
    if (t.id === "palIn") {
      if (k === "ArrowDown" || k === "ArrowUp") { e.preventDefault(); S.palI = Math.max(0, Math.min(S.palList.length - 1, S.palI + (k === "ArrowDown" ? 1 : -1))); updatePalette(); }
      else if (k === "Enter") { e.preventDefault(); runPalette(S.palI); }
      return;
    }
    if (t.id === "isIn" && k === "Enter") { e.preventDefault(); const v = t.value; t.value = ""; t.blur(); addFromText(v); renderAll(); return; }
    if (t.id === "fq") {
      if (k === "Enter" && t.value.trim()) { e.preventDefault(); setQ(S.q + " " + t.value, true); }
      else if (k === "Backspace" && !t.value) { const ts = E.parseFilter(S.q); if (ts.length) { e.preventDefault(); ts.pop(); setQ(ts.map((x) => x.raw).join(" "), true); } }
      return;
    }
    if (S.overlay === "snooze" && /^[1-9]$/.test(k)) { e.preventDefault(); return snoozePick(+k - 1); }
    if (S.overlay === "fsetup" && k === "Enter") { e.preventDefault(); return ACTIONS.fsGo(); }
    if (S.overlay === "feeds" && k === "Enter" && t.classList && t.classList.contains("feed-in")) { e.preventDefault(); return feedSave(); }
    if (S.overlay === "update" && k === "Enter") { e.preventDefault(); return installUpdate(); }
    if (inField) return;
    if (S.overlay) return;
    if (mod) return;

    const view = VIEWS.find((v) => v.k && v.k === k);
    if (view) { e.preventDefault(); mirror(view.k); return go(view.id); }
    const tg = target();
    switch (k) {
      case "/": e.preventDefault(); mirror("k"); return openPalette();
      case "q": case "Q": case "+": e.preventDefault(); if (k === "+" && S.sel) return bumpPri(S.sel); mirror("q"); return openQuick();
      case "?": e.preventDefault(); return openHelp();
      case "j": case "ArrowDown": e.preventDefault(); return moveSel(1);
      case "k": case "ArrowUp": e.preventDefault(); return moveSel(-1);
      case "Enter": if (S.sel) { e.preventDefault(); select(S.sel, true); } return;
      case "x": case " ": e.preventDefault(); if (!tg) return refuse(hinted("x")); mirror("x"); return toggleDone(tg.id);
      case "f": e.preventDefault(); if (focusTop()) mirror("f"); return;
      case "F": e.preventDefault(); return openFocusSetup();
      case "s": e.preventDefault(); if (!tg) return refuse(hinted("s")); mirror("s"); return openSnooze(tg.id);
      case "n": e.preventDefault(); if (skip()) mirror("n"); return;
      case "Delete": return S.sel && del(S.sel);
    }
  }
  function onEsc(e) {
    if (closeRadial()) return;
    if (hideTips()) return;
    if (S.overlay) {
      if (S.overlay === "focus") { if (S.focus && S.focus.level !== "lockdown") { closeOv(); renderAll(); toast("Focus continues · the timer is in the island and the top bar"); } else { refuse($("#ov .display.big")); toast("Lockdown · Esc does nothing here"); } return; }
      if (S.overlay === "takeover") { refuse($("#ov .takeover .big")); return toast("Answer the takeover first"); }
      return closeOv();
    }
    const t = e.target;
    if (/INPUT|TEXTAREA/.test(t.tagName)) { if (t.value) { t.value = ""; t.dispatchEvent(new Event("input", { bubbles: true })); } else t.blur(); return; }
    if (S.insp) { S.insp = false; return renderAll(); }
    if (S.q !== "is:open" || S.view !== "all") { mirror("esc"); return clearQ(); }
    S.sel = null; renderAll();
  }

  function tick() {
    S.now = Date.now(); S.ticks++;
    updateCountdowns(); focusBar(); if (!LIVE) checkAlerts();
    const fo = S.focus && S.overlay === "focus" && $("#ov .display.big");
    if (fo && (S.focus.end - S.now <= MIN) !== fo.classList.contains("hot")) { fo.classList.toggle("hot"); if (fo.classList.contains("hot")) { MO.ack(fo, "boot"); CA.sound.beep(); } }
    if (S.focus && S.now >= S.focus.end) endFocus(true);
    if (S.ticks % 8 === 0) { S.coachI++; const c = $("#coach"); if (c) c.innerHTML = "Tip: " + TIPS[S.coachI % TIPS.length]; }
    if (S.ticks % 30 === 0 && !busy() && !S.overlay) renderAll();
  }

  // Tauri: the global shortcut (Ctrl/⌘+Shift+Space) and the tray's Quick Add open the quick-add box. Inside the app the
  // items come from the Rust store and reload whenever something else changes them (a feed import, the tray, Start).
  function bridge() {
    if (!TAURI || !TAURI.event) return;
    TAURI.event.listen("quickadd", () => { if (!S.overlay) openQuick(); }).catch(() => {});
    if (!LIVE) return;
    CA.store.onError((e) => toast("Not saved · " + esc(String(e))));
    CA.store.onChange(() => reload());
    CA.store.on("alert", onAlert);
    CA.store.on("focus-tick", onFocusTick);
    CA.store.on("focus-ended", (st) => { if (S.focus) finishFocus(!!st && st.ended_reason === "completed"); });
    CA.store.on("update-available", onUpdate);
    CA.store.on("update-progress", onUpdateProgress);
    CA.store.on("update-check", () => checkUpdate(true));
    CA.store.on("backdrop", setBackdrop); syncBackdrop();
    // a Do first row picked in Pocket Start (start.html): show it, after a reload in case Start just added it
    CA.store.on("open-item", (id) => reload().then(() => { if (find(id)) { S.sel = id; S.insp = true; renderAll(); } }));
    CA.store.invoke("focus_blocklist").then((l) => { S.blocklist = l || []; }).catch(() => {});
    reload();
  }
  // Windows: what's behind the window (backdrop.rs). The dot grid takes the Pocket wallpaper's cell and phase, so over
  // the desktop ("desktop") the dots carry on the wallpaper's; "blur" frosts the windows behind with acrylic; "solid" is
  // opaque. The grid comes in physical pixels from the window's corner. The acrylic's tint follows the palette (lab.js).
  function setBackdrop(b) {
    const r = document.documentElement;
    if (!b) { delete r.dataset.backdrop; return; }
    const d = window.devicePixelRatio || 1, c = b.grid[0] / d, at = $("#screen").getBoundingClientRect();
    const phase = (v, o) => (((v / d - o) % c) + c) % c;
    [["--grid", c], ["--grid-x", phase(b.grid[1], at.left)], ["--grid-y", phase(b.grid[2], at.top)], ["--grid-r", 1.25 * c / 16]]
      .forEach(([k, v]) => r.style.setProperty(k, v + "px"));
    r.dataset.backdrop = b.mode;
  }
  function syncBackdrop() {
    if (LIVE) CA.store.invoke("backdrop", { dark: document.documentElement.dataset.scheme === "dark" }).then(setBackdrop, () => {});
  }
  // Take the store's data, keeping local edits whose save is still in flight.
  function reload() {
    return CA.store.load().then((d) => {
      const keep = S.items.filter((it) => CA.store.isPending(it.id)), ids = new Set(keep.map((it) => it.id));
      S.items = d.items.filter((it) => !ids.has(it.id)).concat(keep);
      S.courses = d.courses; S.calendarSeries = d.calendarSeries; S.settings = d.settings; S.feeds = d.feeds;
      if (S.sel && !find(S.sel)) { S.sel = null; S.insp = false; }
      if (busy()) return;
      if (S.loaded) S.fx = { flip: true }; else S.loaded = S.animRows = true;
      renderAll();
    }).catch((e) => toast("Could not read your data · " + esc(String(e))));
  }
  // "Task done" during a session: a Soft one ends; a Hard one keeps its time and moves on to the next Do First item.
  function focusDone(it) {
    const f = S.focus; if (!f) return;
    if (!LIVE || f.level === "soft" || Date.now() >= f.end) return endFocus(true);
    const next = topItem();
    f.id = next ? next.id : f.id;
    toast(`Done${it ? " · " + esc(it.title) : ""}. Still focusing until ${mTime(f.end)}${next ? " · next: " + esc(next.title) : ""}`, { ms: 7000 });
    if (S.overlay === "focus") showFocus(false); else renderAll();
  }
  CA.app = { init() { bind(); bridge(); renderAll(); bindFrame(); CA.fx.powerOn(); setInterval(tick, 1000); }, renderAll, toast, openQuick, openPalette, startFocus, simulate, go, VIEWS, focusTop, openFocusSetup, select, syncBackdrop,
    ic, icons: Object.keys(PIX) }; // the pixel icons, also drawn by the UI kit sheet (docs/UIKit/index.html)
})();
