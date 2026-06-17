# LoFiTyan — Full Project Handoff (2026-06-17)

> **READ THIS FIRST.** Single source of truth for the next agent: what the app is, every
> critical file and what it does, conventions, how releases work, and what's next.
> Pairs with the auto-loaded memory file `lofi-engine-custom-build.md` (project memory).

---

## 0. Status right now

- **A `LoFiTyan v1.0.0-beta.N` pre-release is PUBLISHED** (public) — latest is **`v1.0.0-beta.7`**
  (adds the Telegram **channel** link `@SergD_leads`). Check the current one with
  `gh release list -R Victory-SergD/SergD_LoFiTyan`. Installers for macOS (Apple Silicon + Intel
  `.dmg`), Windows (`.exe`/`.msi`), Linux (`.deb`/`.AppImage`/`.rpm`). The user gave **"добро"** for the pre-release.
- Work on the latest `main` HEAD (only branch). **87 unit tests pass, `pnpm check` 0/0, build OK.**
- Repo is **PUBLIC**. The user (SergD) is the author/owner; their Mac is Apple Silicon (M4 Pro).
- **IMMEDIATE NEXT TASK** (the user asked for it right after this handoff + a /compact):
  write a **КiберТопор-style promo post** for LoFiTyan (see §9 — a ready, accurate draft is included).

---

## 1. What the app is

**LoFiTyan** — a cozy desktop app (Tauri 2 + Svelte) that plays **real internet lo-fi radio**
(radio-browser.info) over a **live video/image background** (the bundled LoFi-тян video by
default), with **ambience** effects (rain/thunder/jungle/campfire, gapless), auto-hiding
controls, fullscreen, a station picker, favorites, OS media-key control, and 7 UI languages.
macOS / Windows / Linux. **Forked from** `meel-hd/lofi-engine` (MIT) — the original generative
engine was fully removed and replaced with radio + everything above. In-app brand: **LoFiTyan**.

---

## 2. Repo, local layout, conventions (IMPORTANT)

- **Repo:** `Victory-SergD/SergD_LoFiTyan` (`origin`), **PUBLIC**. `upstream` = `meel-hd/lofi-engine` (don't touch).
- **Local clone:** `/Users/wsgp/SergD_LoFi/lofi-engine` — **the git repo is the `lofi-engine/` SUBDIR**,
  not the parent `SergD_LoFi/`. Always `cd` there (the Bash shell resets cwd between calls).
- **Run all git/gh with `env -u GITHUB_TOKEN`** — the `GITHUB_TOKEN` env var is invalid; the real
  auth is the `gh` keyring (account `wsgp2`). Without the prefix, git/gh push/release fail.
- **ONE branch: `main`.** Small fixes were committed straight to `main` during the test→fix→beta
  loop; larger work (the deps migration) used a short branch that was `--ff-only` merged then deleted.
  Never leave stray branches.
- **Keep `pnpm test` green (87) and `pnpm check` at 0/0 on every commit.** Locales are typed
  `Translations = typeof en` → change all 7 together or `check` fails.
- **Co-author commits** with the trailer the user uses (Claude Opus 4.8).
- **User prefers Russian** — always reply in Russian.

---

## 3. Tech stack (AFTER the major migration)

`Tauri 2` (Rust + system webview) · **`Svelte 4.2`** · `TypeScript 5` · **`Vite 5.4`** ·
**`Vitest 3`** · `@sveltejs/vite-plugin-svelte 3` · `svelte-check 4` · `pnpm 10` · `jsdom`.

> Svelte 5 was tried and **reverted** — it errors on self-closing `<div/>` + a11y and floods
> deprecation warnings for `on:`/`<slot>`/`export let` (our whole codebase). A real Svelte 5
> (runes) migration is its own project, **deferred**. Don't reattempt without a plan.

---

## 4. Commands

```bash
pnpm install
pnpm tauri:d   # REAL app (Rust + webview) — the ONLY way to test dialog/video/fullscreen/window/media-keys/icon
pnpm tauri:b   # build installers locally (.dmg/.exe/.deb)
pnpm dev       # frontend only (Vite, localhost:1420) — for browser smoke; NO Tauri APIs
pnpm test      # Vitest run (87 tests) — MUST stay green
pnpm check     # svelte-check — MUST stay 0 errors / 0 warnings
pnpm build     # frontend prod build
```

**Browser-verification (the user's trusted method, used all session):** start `pnpm dev`, drive
it with Playwright MCP at `http://localhost:1420`, measure via `browser_evaluate`, screenshot to
confirm. **Kill the dev server after** (`lsof -ti:1420 | xargs kill`) so port 1420 is free for the
user's `tauri:d`. Tauri-only features (window size, dock icon, media keys, native file dialog,
asset-protocol video) can ONLY be confirmed in the real app — the user does that.

---

## 5. Release flow (how a new version ships)

1. Bump version in `src-tauri/tauri.conf.json` + `src-tauri/Cargo.toml` (+ `Cargo.lock` root) +
   the About-box string in `Info.svelte` if you want it shown. (Currently `1.0.0`; betas use a
   `-beta.N` git tag, NOT a bundle-version suffix, to keep Windows MSI happy.)
2. Commit to `main`, push.
3. **Cut a tag:** `git tag -a v1.0.0-beta.N -m "..."` then `git push origin v1.0.0-beta.N`.
   This triggers `.github/workflows/release.yml` (tauri-action) → builds mac(arm64+x64)/Win/Linux
   → creates a **DRAFT** GitHub Release with all 9 installers. Watch with
   `gh run watch <id> --exit-status -R Victory-SergD/SergD_LoFiTyan` (run it `run_in_background`).
4. Set notes + publish: `gh release edit v1.0.0-beta.N --notes-file <notes.md> --prerelease --draft=false`.
5. **Delete the previous beta** so only the freshest is public:
   `gh release delete v1.0.0-beta.PREV --yes --cleanup-tag`. (The user wants "only the fresh one".)
6. Verify public: `gh release view ... --json isDraft` (false = public). curl the page (`--max-time`,
   it sometimes hangs transiently — gh's `isDraft:false` is the authority).

**CI FLAKE to expect:** tauri-action's **`bundle_dmg.sh` intermittently fails on macos-latest**
(the AppleScript/hdiutil DMG-layout step — the app compiles fine, only DMG packaging dies). Fix =
`gh run rerun <id> --failed` (re-runs just the failed matrix job; it uploads the missing asset to
the existing draft). Happened on beta.6's `x86_64-apple-darwin` job; one rerun fixed it. If it
recurs often, add a retry wrapper around the bundle step in `release.yml`.

**macOS unsigned-app GOTCHA (every Mac user hits this):** builds are UNSIGNED (no Apple Developer
account). On Sequoia 15 the Gatekeeper dialog has **no "Open" button**. The fix users run is:
`/usr/bin/xattr -cr /Applications/LoFiTyan.app` (full path `/usr/bin/` matters — a conda/PATH
`xattr` lacks `-r`), or System Settings → Privacy & Security → "Open Anyway". README has a
prominent `[!IMPORTANT]` callout. **Real fix = Apple Developer signing+notarization ($99/yr)** —
the user has NO account yet; offered to wire it into CI when they get one. (When they do: add
`APPLE_CERTIFICATE`/`APPLE_*` secrets + tauri-action signing inputs in `release.yml`.)

---

## 6. Critical file-by-file map

### Entry & shell
- **`src/main.ts`** — mounts the app (Svelte 4 `new App({ target: ... })`; `!` on getElementById).
- **`src/App.svelte`** (269) — ROOT layout + global wiring. Renders `Canvas` (bg) + `RainAnimation`
  (outside `.chrome`) + `.chrome`{Config, TopBar, .content{Controls, Info}, RadioPlayer} + StationPicker
  + ContextMenu + Tooltip. **`onMount` does the background restore** incl. the **first-launch default =
  the bundled video** and a **one-time bg migration** (`lofityan.bg-default-v2`: stale `bg-type="default"`
  → `"default-video"`). **RadioPlayer is hidden while the About box OR Settings is open**
  (`{#if !$infoOpen && !$settingsOpen}`). Global hotkeys (Escape, Ctrl/⌘+R, `k`, Space, Ctrl/⌘+I).
- **`src/lib/Config.svelte`** — disables the native right-click menu.

### Radio (core) — `src/lib/stores/radio.ts` (443)
THE radio engine. `SEED` (hand-verified HQ stations; **`loficafe-chilling` "Lofi Cafe · Chilling" is
FIRST/default, ad-free**; REYFM moved last — it had ad jingles). Stores: `stations`, `current`,
`isPlaying`, `error`("stream-failed"), `buffering`, `listLoading`/`listError` (SEPARATE from playback),
`favorites`, `queue`, `queueSource`. `loadStations` (mirror fallback, https-only, dedupe, `loadSeq`
race guard). `play` (swallows AbortError on station switch). `selectStation`/`playNext`/`playPrev`/
`togglePlay`/`pause`. **`initRadio`** restores the last station OR defaults to `SEED["Lo-Fi"][0]`
(Lofi Cafe · Chilling); also runs a **one-time station migration** (`lofityan.station-v2`: clears a
stale `last-station` whose id is `reyfm-lofi`). **`setupMediaSession`** wires OS media keys
(F7/F8/F9, Bluetooth, headset) via the MediaSession API → play/pause/prev/next + now-playing metadata.
- **`RadioPlayer/index.svelte`** (176) — bottom transport (◀ ⏯ ▶) + now-playing chip (opens picker) +
  buffering spinner + localized retry on error.
- **`StationPicker/index.svelte`** (218) — bottom-sheet picker: GENRES (SEED) + ★ Favorites + More
  (radio-browser). `picker.ts` store.

### Background / video / icon
- **`Controls/Settings/Background.svelte`** (866 — **BIGGEST/most complex; read it fully before touching bg**).
  Manages: the **bundled default video as a first-class background** (`DEFAULT_VIDEO_ID="default_video"`,
  `DEFAULT_VIDEO_SRC="assets/default-bg/lofi-girl-autumn.mp4"`, bg-type `"default-video"`, in the carousel,
  selectable, focal/zoom saved under `default_video`); default images bg1–10; custom images (WebP→IndexedDB)
  & videos (Tauri dialog→path→`convertFileSrc`). Click-to-focal preview + zoom slider. `applyDefaultVideo`/
  `applyCurrentBackground`/`applyBackground`/`applyTarget`(used by next/prevBg)/`getCurrentIndex`/`curId`
  all handle the three bg-types. **`.container` (carousel) has `min-height:124px`** so a wider bg (bg8 is
  1920×966 ≈ 1.99:1) can't shrink the row and shift the settings below it. "Where to get backgrounds"
  block = circular favicon-logo buttons (Lofi Girl / MotionBGs / MoeWalls) opened via plugin-shell.
- **`background.ts`** (47) — `bgMedia` store `{kind,src,focalX,focalY,scale}`; `setBgMedia/setFocal/setScale`
  (scale clamp [1,3]); per-bg transform persistence (`lofityan.bg-transforms`).
- **`Canvas/index.svelte`** (55) — the unified `<img>`/`<video class="bg-media" autoplay loop muted>` cover
  layer (object-position focal + transform scale); video `on:error` → localized overlay.

### Atmosphere / immersion / fullscreen
- **`utils/audioLoop.ts`** (83) — gapless Web Audio loop (re-entrancy-safe). The 4 effects use it.
- **`Controls/{Rain,Thunder,Jungle,CampFire}/index.svelte`** (~110 each) — one effect each (a/s/d/f, `k`).
- **`Controls/Rain/RainAnimation.svelte`** — full-screen rain visual (outside `.chrome`).
- **`stores/immersion.ts`** (198) — idle auto-hide; bails while picker/settings/about open.
- **`stores/fullscreen.ts`** (60) — Tauri setFullscreen + OS-state sync.
- **`Controls/FullScreen/index.svelte`** + **`Controls/index.svelte`** (effects dock).

### Settings / Info / TopBar / misc
- **`Controls/Settings/index.svelte`** (282) — settings panel (Background + Volume + Language + an
  **author/contact footer** with `settings.author` + GitHub/Telegram links).
- **`InfoBox/Info.svelte`** (191) — About/shortcuts box. **`.info-overlay` is `position:fixed`** so it
  centers in the viewport (portrait no longer clips its top); `#info-box` is flex-column + `#bottom-section`
  flex:1 so all shortcuts fit with no scroll. Logo = `lofityan-logo.png` (the girl). Auto-shows on first launch.
- **`InfoBox/ShortCuts.svelte`** (96) — shortcuts list; modifier is **⌘ on macOS / Ctrl on Win-Linux**
  (`/Mac/i.test(navigator.userAgent)`).
- **`InfoBox/SocialLinks.svelte`** (50) — GitHub (our repo) + **Telegram `@SergD_leads`** links.
- **`Tooltip.svelte`** (117) — `data-tooltip` hover tooltips; **dismiss on `mousedown` + drop orphaned
  tooltips via `isConnected` on `mousemove`** (they used to stick when the owner element unmounted).
- **`TopBar/{TopBar,MacControls,GenericControls}.svelte`** — frameless-window drag + close/min/max
  (`appWindow: any`, null-guarded). Hidden in fullscreen.
- **`ContextMenu/ContextMenu.svelte`** (196) — right-click menu.
- **`stores/{volume,weather,picker,ui}.ts`** — `volumes`; `rainActive`; `pickerOpen`/`pickerTab`;
  `settingsOpen`/`infoOpen`. **`localDB.ts`** (83) — IndexedDB (custom backgrounds). **`utils/dom.ts`** — `isTypingTarget`.

### i18n — `src/lib/locales/`
`store.ts` (54): `locale` + `t` (derived) + `setLocale`; **`detectInitialLocale()` follows the OS/browser
language** (`navigator.language`) on first launch, falls back to `en`. `en.ts` is the source of truth;
`{ru,ja,zh,hi,fr,nl}.ts` typed against it (7 in lockstep). `types.ts` = `Translations = typeof en`.

### Build / native config
- **`svelte.config.js`** (NEW from migration) — `{ preprocess: vitePreprocess() }`.
- **`vite.config.ts`** — simplified: `plugins:[svelte()]` (loads svelte.config.js), port 1420 strict.
- **`src-tauri/tauri.conf.json`** — window **680×940** (min 560×700; portrait-friendly, resizable,
  frameless, transparent); CSP (`connect-src` radio-browser; `media-src`/`img-src` allow `self`/`asset:`/
  `https:`/`blob:`/`data:`); `assetProtocol` scope `["$HOME/**","/Volumes/**"]`; productName/identifier
  `LoFiTyan` / `io.github.victory-sergd.lofityan`; version `1.0.0`.
- **`src-tauri/Cargo.toml`** — package `LoFiTyan`; tauri (macos-private-api, protocol-asset) + dialog + shell.
- **`src-tauri/capabilities/migrated.json`** — perms: window (incl. set-fullscreen), `dialog:allow-open`,
  `shell:allow-open`.
- **`src-tauri/src/lib.rs`** — Tauri builder (registers shell + dialog).
- **`.github/workflows/release.yml`** — multi-platform release on `v*` tag push (node 20, pnpm 10,
  matrix mac arm64+x64/ubuntu/windows; draft release; `prerelease: contains(ref,'-')`).

### Bundled assets
- `public/assets/default-bg/lofi-girl-autumn.mp4` — **default video bg (1080p, 2.4 MB, committed)**.
- `public/assets/background/bg{1..10}.webp` — default scenes (NOTE **bg8 is 1920×966 ≈ 1.99:1**, the others ~16:9).
- `public/assets/sources/{lofigirl,motionbgs,moewalls}.png` — site favicon logos for the "where to get bg" buttons.
- `public/lofityan-logo.png` (About logo) + `app-icon.png` (README) + `src-tauri/icons/*` — **the LoFi-тян
  icon (a frame from the user's video), rounded macOS-squircle**. NOTE: `tauri dev` does NOT refresh the
  dock icon — only the built `.dmg` shows the rounded icon; verify there, not in dev.
- `public/assets/engine/effects/*.mp3` — the 4 ambience loops.

### Tests (10 files, 87 tests)
`radio.test.ts` (557, biggest), `immersion.test.ts` (341), `background.test.ts`, `audioLoop.test.ts`,
`picker.test.ts`, `fullscreen.test.ts`, `volume.test.ts`, `locales/store.test.ts`, `dom.test.ts`, `smoke.test.ts`.

---

## 7. Persistence keys (localStorage / IndexedDB)
- `lofityan.last-station` — last station (restored paused; else default = Lofi Cafe · Chilling).
- `lofityan.station-v2` — flag: the one-time "clear stale REYFM last-station" migration ran.
- `bg-type` (`default` / `custom` / **`default-video`**) · `bg-id` · `custom-bg-id` — current background.
- `lofityan.bg-default-v2` — flag: the one-time "stale default→default-video" migration ran.
- `lofityan.bg-transforms` — `{ [bgId]: {focalX,focalY,scale} }` per background.
- `lofityan.favorites` · `lofityan.volumes` · `locale` · `shownBefore-info`.
- IndexedDB `custom-backgrounds` (via `localDB`) — user images (dataURL) + videos (path).

> **Pattern learned this session:** most "bugs" the user reports during testing are **stale
> localStorage from earlier betas** (old default station / background). Always verify FRESH state
> first (clear localStorage in Playwright), then add a one-time keyed migration for upgraders.

---

## 8. Invariants / gotchas (don't regress)
- `bgMedia` layer + `StationPicker` render OUTSIDE `.chrome` (else the idle auto-hide ghosts them).
- RadioPlayer hidden while `infoOpen || settingsOpen` (don't let it overlap menus).
- `error` (playback) is separate from `listError` (station-list fetch). Don't merge.
- `play()` swallows AbortError; `selectStation` always (re)plays (recovers stalls).
- The default video is a real bg-type (`default-video`) — keep `Background.svelte` + `App.svelte` in sync if you touch bg logic.
- Carousel `.container { min-height: 124px }` keeps the settings stable across bg aspect ratios.
- 7 locales in lockstep; `pnpm check` 0/0 (use `<!-- svelte-ignore ... -->` for intentional cases).
- Unsigned builds → the `/usr/bin/xattr` step is mandatory for macOS users (it's in the README + release notes).

---

## 9. Backlog / next steps (the user's priority order)

1. **▶ NEXT (the user asked right after this handoff): a КiберТопор-style promo post for LoFiTyan**,
   in the voice of the example they gave, but **accurate** (the original example said "generates
   infinite tracks" — FALSE for us; we play REAL radio + live video wallpaper). A ready, accurate
   draft (relay it, adjust to taste, link to our repo):

   > ⚡️ Своя LoFi-тян прямо на рабочем столе — собрали **LoFiTyan** для работы, учёбы и вечернего чилла.
   >
   > Уютное настольное приложение: играет **настоящее lo-fi радио** на фоне живой сцены — твоего видео или картинки. Идеальный фон для кодинга, монтажа, учёбы или просто залипания за компом.
   >
   > Что умеет:
   > — 🎵 Настоящее lo-fi радио: станции lo-fi / chillhop / focus / sleep, избранное, переключение;
   > — 🎬 Живые обои: своё видео или картинка-сцена с зумом и точкой кадра;
   > — 🌧 Атмосфера поверх музыки: дождь, гром, лес, костёр — бесшовным циклом;
   > — 🖥 Полноэкранный режим, горячие клавиши, «просторный режим», медиа-клавиши;
   > — 🌍 7 языков интерфейса.
   >
   > Главное — всё **бесплатно** и с **открытым кодом** (форк lofi-engine, MIT). Сейчас готова сборка под **macOS** (Windows и Linux — в релизе тоже есть).
   >
   > Забрать тут: `https://github.com/Victory-SergD/SergD_LoFiTyan/releases/latest`
   >
   > 🕹 КиберТопор — Подписаться
   >
   > **Caveats to flag to the user before posting:** (a) the audience is Windows-heavy and the macOS
   > build is unsigned (needs the `xattr` step) — set expectations; (b) link `/releases` (not `/latest`,
   > since it's a pre-release `/latest` skips it) → use `/releases` or the explicit tag.

2. **Apple Developer signing + notarization** ($99/yr) — removes the macOS Gatekeeper friction (the #1
   barrier for testers). Wire certs into `release.yml` when the user gets an account.
3. **Windows/Linux promo** — they build already; once tested, promote beyond macOS.
4. **Real-character icon polish / "Victory" brand** — DEFERRED; current icon is a frame from the user's video.
5. **Compact bottom-row layout** for the vertical monitor — tentative, the user keeps saying "уже неплохо".
6. **Remaining 11 dev-only Dependabot advisories** — need Svelte 5 / Vite 6 (a runes migration), DEFERRED;
   none ship to users. The migration cleared the critical + most highs (45/36 → 11).
7. **Re-verify SEED stations periodically** (streams die); the curated list is in `radio.ts` `SEED`.

---

## 10. History / where to look
- **Project memory** (auto-loaded): `~/.claude/.../memory/lofi-engine-custom-build.md` — running log of every iteration.
- `docs/superpowers/specs/` & `plans/` — design/plan/audit docs (radio pivot, picker, video bg, zoom,
  two adversarial audits, music-sources research, the earlier 2026-06-16 handoff which THIS supersedes).
- Telegram-forward install blurb: `/Users/wsgp/SergD_LoFi/LoFiTyan_telegram.txt`.
- The user's source video (for the icon / default bg): `/Users/wsgp/SergD_LoFi/lofi-girl-autumn.{1920x1080,3840x2160}.mp4`.

**The release cadence is proven and smooth: fix → commit to `main` → push a `v*` tag → CI builds →
publish + delete the previous beta. Browser-verify frontend changes; the user verifies the real app.**
