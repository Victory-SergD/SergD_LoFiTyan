# LoFiTyan — Full Project Handoff (2026-06-16)

> **Read this first.** It's the complete map of what's built, every critical file and what it does, the conventions, and the next steps. Goal of the project right now: get to a **rock-solid, releasable** version we can publish on a couple of sites for people to try.

---

## 1. What the app is

**LoFiTyan** — a branded (company **Victory**) desktop lo-fi app. Plays **real internet-radio lo-fi** (radio-browser.info) over a cozy **background** that can be a scene image **or the user's own video** (live wallpaper, with zoom + focal point), with **atmosphere** effects (rain/thunder/jungle/campfire, gapless), auto-hiding controls, fullscreen, station picker, favorites, 7 languages. **macOS / Windows / Linux** via Tauri.

**Forked from** meel-hd/lofi-engine (MIT); the original generative-audio engine was fully removed and replaced with radio + the features above. In-app name is **LoFiTyan**.

**Status:** feature-rich, **two adversarial audits passed**, 87 unit tests, `pnpm check` = **0 errors / 0 warnings**, prod build OK. Release-ready shape; remaining work is polish + the backlog in §7.

---

## 2. Run / build / test / conventions

```bash
pnpm install
pnpm tauri:d   # REAL app (Rust + native webview) — the only way to test dialog/video/fullscreen/window
pnpm tauri:b   # build installers (.dmg/.exe/.deb)
pnpm dev       # frontend only (Vite, localhost:1420) — no Tauri APIs
pnpm test      # Vitest (87 tests) — MUST stay green
pnpm check     # svelte-check — MUST stay 0 errors / 0 warnings
pnpm build     # frontend prod build
```

**Git conventions (IMPORTANT):**
- **One working branch: `main`.** Do work on a short-lived branch, `--ff-only` merge into `main`, push, delete the branch — leave only `main`. Never accumulate branches.
- Prefix every git/gh command with **`env -u GITHUB_TOKEN`** (the env `GITHUB_TOKEN` is invalid; account is `wsgp2` via keyring). Repo: `Victory-SergD/SergD_LoFiTyan` (`origin`); `upstream` = meel-hd (external, don't touch).
- Keep `pnpm test` green and `pnpm check` at **0/0** on every commit.
- Locale files are typed `Translations = typeof en` → **change all 7 together** or check fails.

**Gotcha — Tauri-only features:** the file **dialog**, **asset-protocol video playback**, **fullscreen** (setFullscreen), and **window controls** only work in `pnpm tauri:d`. The browser / Playwright **cannot** test them — verify those in the real window (the user does this). Browser smokes are good for image backgrounds, radio UI, picker, settings, zoom/focal math.

**How we work:** plan → subagent-driven implementation (implementer + reviews) → browser/real-window verify → `--ff-only` merge. Big checkpoints use an **adversarial workflow audit** (5 systems × find × verify × synth). Audit docs live in `docs/superpowers/specs/2026-06-1{5,6}-*audit*.md`.

---

## 3. Architecture & patterns

- **Svelte stores = single source of truth.** Each subsystem owns a store in `src/lib/stores/`. Components subscribe with `$store`. Audio side-effects use injectable factories (testable without real audio/network).
- **Background** is ONE reactive cover layer (`bgMedia` store → `<img>`/`<video>` in `Canvas`), `object-fit:cover` + `object-position` (focal) + `transform:scale` (zoom, clamped ≥1 so no empty edges). Default scenes, custom images, and videos ALL go through it.
- **The "chrome"** (controls) auto-hides on idle; the **background layer and the station picker render OUTSIDE `.chrome`** so they're never hidden/ghosted. The idle timer also bails while picker/settings/about is open.
- **Effects audio** = gapless Web Audio (`audioLoop.ts`), re-entrancy-safe.
- **i18n** = `t` derived store; 7 locales keyed off `en`.

---

## 4. Critical file map (study these to work on tasks)

### Entry & shell
- **`src/main.ts`** — mounts the Svelte app.
- **`src/App.svelte`** (244) — ROOT layout + global wiring. Renders: `Canvas` (bg) + `RainAnimation` (outside chrome) + `.chrome`{`Config`,`TopBar`,`.content`{`Controls`,`Info`},`RadioPlayer`} + `StationPicker` + `ContextMenu` + `Tooltip` (last three OUTSIDE chrome). Global hotkeys in `onGlobalHotkey` (Escape→closePicker+exitFullscreen first; Ctrl/⌘+R→reload; `k`→stop-all; Space→togglePlay, skipped when a button is focused) and `onImmersionHotkey` (Ctrl/⌘+I→toggleImmersive). `onMount`: `initIdleWatch`, `initFullscreenSync`, `initRadio`, and the **background restore** (reads last bg from localStorage/localDB → `setBgMedia` image or video). CSS: container/content/chrome, immersive fade (instant reveal), fullscreen hides the titlebar.
- **`src/lib/Config.svelte`** (14) — disables the native right-click menu.

### Radio (the core)
- **`src/lib/stores/radio.ts`** (379) — THE radio engine. Stores: `stations` (radio-browser results), `current`, `isPlaying`, `error` (PLAYBACK error, holds the code `"stream-failed"`), `buffering`, `listLoading`/`listError` (the radio-browser FETCH state — kept SEPARATE from playback), `favorites`, `queue`, `queueSource`. Data: `SEED` (14 hand-verified HQ stations grouped by `GENRES` Lo-Fi/Chillhop/Focus/Sleep), `GENRE_TAG`. Fns: `loadStations(tag,bitrateMin)` (tries mirrors `de1/de2/nl1/at1/all` with a `loadSeq` race guard, https-only, dedupe), `play` (swallows AbortError on station switch; buffering via waiting/playing/canplay; on hard error sets `error="stream-failed"`), `pause`, `togglePlay` (Space; falls back to SEED Lo-Fi[0]), `selectStation(s, list?, source?)` (always (re)plays — restart recovers a stalled stream; sets `queue`+`queueSource`; persists last station), `initRadio` (restores last station PAUSED, https-guarded, seeds the ◀▶ queue from its genre), `playNext`/`playPrev` (navigate `queue`, or LIVE `favorites` when `queueSource==="favorites"`), `toggleFavorite`/`isFavorite`, `parseStations`. **Single injectable `<audio>` element.**
- **`src/lib/components/RadioPlayer/index.svelte`** (176) — bottom-center transport: ◀ ⏯ ▶ (centered), a now-playing chip (≡ list icon + favicon + name) that opens the picker, buffering spinner, and on `$error` a localized retry chip (`$t.radio.stream_error`, re-plays current).
- **`src/lib/components/StationPicker/index.svelte`** (218) — bottom-sheet picker. Tabs: GENRES (static SEED) + ★ Favorites + More (radio-browser via `loadStations`, shows `listLoading`/`listError`+retry/empty). Rows: favicon (https + on:error fallback) / music icon, name, bitrate badge, ★ toggle (live `favIds`). Row click → `selectStation(s, rows, source-by-tab)` + `closePicker()`. Closes on ✕ / Esc / backdrop `<div>`. Tab + More-genre persisted in `picker.ts`; refetches More on mount.
- **`src/lib/stores/picker.ts`** (12) — `pickerOpen` (+open/close/toggle), `pickerTab`, `pickerMoreGenre`.

### Background / video / zoom
- **`src/lib/stores/background.ts`** (47) — `bgMedia` `{kind:'image'|'video', src, focalX, focalY, scale}` (the live layer). `setBgMedia/setFocal/setScale` (clamp focal 0–100, scale `[MIN_SCALE=1, MAX_SCALE=3]`). Per-bg transform persistence: `getTransform/hasTransform/saveTransform` over the `lofityan.bg-transforms` localStorage map (keyed by `default_N` / item id). `bgMediaError` + `setBgError` (for a failed video).
- **`src/lib/components/Canvas/index.svelte`** (55) — `#bg` container + the unified `<img>`/`<video class="bg-media">` cover layer (object-position focal + transform scale + transform-origin focal). Video `on:error={setBgError}` → a localized `.bg-error` overlay (`$t.canvas.video_unavailable`).
- **`src/lib/components/Controls/Settings/Background.svelte`** (747 — the BIGGEST, most complex file). Manages: default bg1–10 (`assets/background/bgN.webp`), custom IMAGES (browser file input → WebP-compressed dataURL in IndexedDB via `localDB`), and VIDEOS (Tauri `dialog.open()` → file PATH). The carousel (prev/next), the **click-to-focal preview** (aspect-matched box → 1:1 click → `setFocal`+`saveTransform`, for image AND video), the **zoom slider** (`setScale`+`saveTransform`), delete, upload-skip feedback. Apply paths (`applyBackground`/`applyCurrentBackground`/`applyVideoItem`/`nextBg`/`prevBg`) all route through `setBgMedia(...)` + `getTransform(id)` (videos: `convertFileSrc(path)`). **If you touch backgrounds, read this whole file.** Note its IDB writes are awaited (`saveCustomBackgrounds`, `onBackgroundsUpdated`).

### Atmosphere / immersion / fullscreen
- **`src/lib/utils/audioLoop.ts`** (83) — gapless Web Audio loop. Shared lazy `AudioContext`; `createLoop(url)` → `{play, stop, setVolume, isPlaying}`. **Re-entrancy-safe**: `play()` claims `playing=true` BEFORE the await, re-checks after (so a `stop()` mid-load cancels, no double source). Has tests.
- **`src/lib/components/Controls/{Rain,Thunder,Jungle,CampFire}/index.svelte`** (~110 each) — one effect each, via `createLoop("assets/engine/effects/<name>.mp3")`. Toggle button (aria-label + aria-pressed), keydown `a/s/d/f`, `lofi-stop-all` (`k`), `lofi-set-*`, volume = `master × effect`, `onDestroy` stop. **Rain** also drives `rainActive`.
- **`src/lib/components/Controls/Rain/RainAnimation.svelte`** (36) — the full-screen rain VISUAL, rendered outside `.chrome` (stays visible in immersive mode), driven by `rainActive`.
- **`src/lib/stores/weather.ts`** (10) — `rainActive`.
- **`src/lib/components/Controls/FullScreen/index.svelte`** (23) — the ⛶ button → `toggleFullscreen`.
- **`src/lib/stores/fullscreen.ts`** (60) — `fullscreen` store, `toggleFullscreen`/`exitFullscreen` (Tauri `setFullscreen`), `initFullscreenSync` (tracks OS-driven changes via debounced `onResized`).
- **`src/lib/stores/immersion.ts`** (198) — the auto-hide. `createIdleTimer` (start/stop/activity/reset/pause/resume), `initIdleWatch` (8s idle; activity events incl. `pointermove`; `onIdle` bails while `pickerOpen || settingsOpen || infoOpen`). `toggleImmersive` (resume+reset so the timer never freezes), `pauseIdleWatch`/`resumeIdleWatch` (hover-pause).
- **`src/lib/components/Controls/index.svelte`** (39) — the effects DOCK (Rain, Thunder, Jungle, CampFire, FullScreen, Settings).

### Settings / volume / UI state
- **`src/lib/components/Controls/Settings/index.svelte`** (230) — the settings panel (gear). Hosts Background + Volume + Language. Sets `settingsOpen`; `Esc` and `J` close; click-outside closes.
- **`src/lib/components/Controls/Settings/Volume.svelte`** (118) — master ("Radio") + 4 effect volume sliders (unique ids).
- **`src/lib/stores/volume.ts`** (65) — `volumes` `{master, effects}` + persistence (`lofityan.volumes`) + `setMaster`/`setEffectVolume`.
- **`src/lib/stores/ui.ts`** (3) — `settingsOpen`, `infoOpen` (read by immersion so the auto-hide can't eat open panels).

### i18n
- **`src/lib/locales/store.ts`** (46) — `locale` store, `t` (derived translations), `dir`, `setLocale`, RTL set.
- **`src/lib/locales/{en,ru,ja,zh,hi,fr,nl}.ts`** — 7 locale dictionaries. `en` is the source of truth; the rest are typed against it.
- **`src/lib/locales/types.ts`** (3) — `Translations = typeof en`. *(Open nit: make an explicit interface so typos in `en` itself are caught — low priority.)*

### TopBar / Info / misc
- **`src/lib/components/TopBar/{TopBar,MacControls,GenericControls}.svelte`** — frameless-window drag region + close/min/max (the window is `decorations:false`). Hidden in fullscreen.
- **`src/lib/components/InfoBox/{Info,ShortCuts,SocialLinks}.svelte`** — the About box (sets `infoOpen`), the **honest** shortcuts list, social links.
- **`src/lib/components/ContextMenu/ContextMenu.svelte`** (196) — right-click menu (play/pause via `$isPlaying`, effects, reload, about).
- **`src/lib/components/Tooltip.svelte`** (115) — hover tooltips driven by `data-tooltip` attributes (used on the bg/video/zoom controls — important for the "users understand each button" goal).
- **`src/lib/localDB.ts`** (83) — tiny IndexedDB wrapper (stores custom backgrounds; videos store only a path, images store a dataURL).
- **`src/lib/utils/dom.ts`** (21) — `isTypingTarget(e)` (used by all keydown handlers to ignore typing in inputs).

### Tauri native (`src-tauri/`)
- **`tauri.conf.json`** — window (frameless, transparent, 480×900 portrait-friendly, resizable); **CSP** (`connect-src` radio-browser mirrors; `media-src` allows `asset:` + `blob:` + `https:` for video + radio streams; `img-src` allows `asset:` + `https:` for favicons/images); **`assetProtocol`** `{enable:true, scope:["$HOME/**","/Volumes/**"]}` (for local video files).
- **`capabilities/migrated.json`** — permissions: window (incl. `core:window:allow-set-fullscreen`), shell, **`dialog:allow-open`**.
- **`Cargo.toml`** — `tauri` (features `macos-private-api`, **`protocol-asset`**), `tauri-plugin-shell`, **`tauri-plugin-dialog`**.
- **`src/lib.rs`** — Tauri builder; registers shell + dialog plugins.

### Tests (10 files, 87 tests)
`radio.test.ts` (biggest — playback/queue/favorites/loadStations/initRadio), `background.test.ts` (bgMedia + transform persistence), `audioLoop.test.ts` (the 3 race cases), `picker.test.ts`, `fullscreen.test.ts`, `immersion.test.ts` (timer logic), `volume.test.ts`, `locales/store.test.ts`, `dom.test.ts`, `smoke.test.ts`.

---

## 5. Persistence keys (localStorage / IndexedDB)
- `lofityan.volumes` — master + effect volumes.
- `lofityan.favorites` — favorite stations (full objects).
- `lofityan.last-station` — last played station (restored paused on launch).
- `lofityan.bg-transforms` — `{ [bgId]: {focalX,focalY,scale} }` per background.
- `bg-type` / `bg-id` / `custom-bg-id` — current background selection.
- `locale` — UI language.
- IndexedDB `custom-backgrounds` (via `localDB`) — user images (dataURL) + videos (path + kind).

---

## 6. Known gotchas / invariants (don't regress these)
- `bgMedia` layer + `StationPicker` live OUTSIDE `.chrome` (else auto-hide ghosts them). Idle timer bails on picker/settings/info open.
- `error` (playback) is separate from `listError` (station-list fetch). RadioPlayer shows playback error; the picker shows list error. Don't merge them.
- `play()` swallows `AbortError` (station switching). `selectStation` always (re)plays (restart-on-reselect). `playNext/playPrev` use `queueSource` to read live favorites.
- Background changes must keep image flow working (default + custom images) — verify in a browser smoke; videos verify only in the real app.
- Locales: 7 in lockstep. Keep `pnpm check` at 0 warnings (use `<!-- svelte-ignore ... -->` for intentional non-interactive click-catchers like the picker backdrop).
- Audio effects need a user gesture to start (the toggle click provides it) — don't try to autoplay them.

---

## 7. Backlog / next steps (in the user's priority order)

1. **Compact bottom-row layout** (NEXT, but tentative — user said "кажется, уже неплохо работает"). Goal: a clean, compact control row at the bottom for the vertical monitor; scene as hero. Re-evaluate whether it's needed before investing.
2. **Find genuinely high-quality 320k stations** (user wants this — NOT a paid API). Re-run a verified probe (like the seed-building one) to upgrade the `SEED` in `radio.ts` with real 320k/HQ streams; consider a "test from the user's location" pass (latency varies — they're in RU; some EU streams stutter). Source research is in `docs/superpowers/specs/2026-06-16-music-sources-research.md`.
3. **Character as video / animated LoFi-тян** — largely achievable NOW via the video-background feature (a looping character video). Optionally curate/ship a default character video.
4. **Victory brand — DEFERRED.** User: keep the personal brand for now; "Victory" is already on the GitHub repo. In-app text is "LoFiTyan"; app ICONS are still the original lofi-engine icons + bundle id `com.lofi-engine.dev`. Only do the deep brand (icons/identifier/productName) when the user asks.
5. **Publish prep** — the real near-term goal: make sure the CURRENT version is flawless, then publish on a couple of sites for people to try. Before publishing: a final real-window pass on all flows + maybe one more adversarial audit.
6. **Premium audio (Feed.fm / licensing) — user said NOT needed.** Skip unless asked; real 320k radio (#2) is the chosen path.
7. **Open nit:** explicit `Translations` interface for `en.ts` (low value, deferred).

## 8. History docs (context, not required reading)
`docs/superpowers/specs/` and `plans/` hold the design/plan/audit docs for each iteration (radio pivot, station picker, video backgrounds, background zoom, both audits, music-sources research). The two audit result docs are the best evidence of current health.
