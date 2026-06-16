# Station Picker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let the user SEE and PICK stations — genre tabs (Lo-Fi / Chillhop / Focus / Sleep), a curated HQ seed list, favorites ★, a dynamic "More" tab (radio-browser), now-playing favicon, and last-station memory — without changing the existing radio playback core.

**Architecture:** Keep `src/lib/stores/radio.ts` as the single audio owner. Add a static curated SEED (verified HTTPS stations, grouped by genre), a persisted `favorites` store, last-station memory, and a `bitrateMin` filter on `loadStations` (used by the "More" tab). New `StationPicker` bottom-sheet panel + a `pickerOpen` store. Wire an open-trigger + now-playing favicon into `RadioPlayer`. Everything stays unit-tested; playback path is untouched.

**Tech Stack:** Tauri 2, Svelte 3, TypeScript, Vite, Vitest, @tabler/icons-svelte.

**Baseline:** `pnpm test` = 54 green; `pnpm check` = 0 errors / 1 known a11y warning. Keep green every task. Branch: `feat-station-picker` (merge to `main`, delete after — single-branch policy).

---

## Locked seed list (all verified alive + HTTPS on 2026-06-16)

```ts
// Genre buckets + the radio-browser tag used for each genre's "More" tab.
export type Genre = "Lo-Fi" | "Chillhop" | "Focus" | "Sleep";
export const GENRES: Genre[] = ["Lo-Fi", "Chillhop", "Focus", "Sleep"];
export const GENRE_TAG: Record<Genre, string> = {
  "Lo-Fi": "lofi",
  "Chillhop": "chillhop",
  "Focus": "study",
  "Sleep": "sleep",
};

// Curated, hand-verified HQ stations. favicon "" -> the picker shows a default
// music icon. These ship in-app and work even if the radio-browser API is down.
export const SEED: Record<Genre, RadioStation[]> = {
  "Lo-Fi": [
    { id: "reyfm-lofi",        name: "REYFM #LOFI",          url: "https://listen.reyfm.de/lofi_320kbps.mp3",                     favicon: "", codec: "MP3", bitrate: 320, tags: "lofi" },
    { id: "ilm-chillhop",      name: "I ♥ Chillhop",     url: "https://ilm.stream35.radiohost.de/ilm_ilovechillhop_mp3-192",  favicon: "", codec: "MP3", bitrate: 192, tags: "lofi,chillhop" },
    { id: "loficafe-chilling", name: "Lofi Cafe · Chilling", url: "https://radio.loficafe.net/listen/chilling/radio.mp3",     favicon: "", codec: "MP3", bitrate: 192, tags: "lofi" },
    { id: "nia-lofi",          name: "NIA Radio Lo-Fi",       url: "https://radio.nia.nc/radio/8020/lofi-hq-stream.aac",           favicon: "", codec: "AAC", bitrate: 128, tags: "lofi" },
    { id: "loficafe-gaming",   name: "Lofi Cafe · Gaming", url: "https://radio.loficafe.net/listen/gaming/radio.mp3",         favicon: "", codec: "MP3", bitrate: 192, tags: "lofi" },
  ],
  "Chillhop": [
    { id: "radio-acid",        name: "Radio ACID · Chill", url: "https://stream.radioacid.com/stream",                       favicon: "", codec: "MP3", bitrate: 256, tags: "chillhop" },
    { id: "loficafe-working",  name: "Lofi Cafe · Working", url: "https://radio.loficafe.net/listen/working/radio.mp3",       favicon: "", codec: "MP3", bitrate: 192, tags: "chillhop" },
    { id: "fmv-fit-focus",     name: "FMV FIT · Focus",   url: "https://radio.webicdp.com/listen/fmvfitradiofocus/radio.mp3", favicon: "", codec: "MP3", bitrate: 192, tags: "chillhop" },
  ],
  "Focus": [
    { id: "loficafe-studying", name: "Lofi Cafe · Studying", url: "https://radio.loficafe.net/listen/studying/radio.mp3",    favicon: "", codec: "MP3", bitrate: 192, tags: "study" },
    { id: "rautemusik-study",  name: "rautemusik STUDY",      url: "https://study-high.rautemusik.fm/",                            favicon: "", codec: "MP3", bitrate: 192, tags: "study" },
  ],
  "Sleep": [
    { id: "loficafe-sleeping", name: "Lofi Cafe · Sleeping", url: "https://radio.loficafe.net/listen/sleeping/radio.mp3",    favicon: "", codec: "MP3", bitrate: 192, tags: "sleep" },
    { id: "asp",               name: "Ambient Sleeping Pill", url: "https://radio.stereoscenic.com/asp-s",                        favicon: "", codec: "MP3", bitrate: 128, tags: "sleep,ambient" },
    { id: "spokoynoe",         name: "Спокойное радио", url: "https://listen9.myradio24.com/6262", favicon: "", codec: "MP3", bitrate: 128, tags: "sleep,calm" },
    { id: "abc-lounge",        name: "ABC Lounge",            url: "https://eu1.fastcast4u.com/proxy/kpmxz?mp=/1",                 favicon: "", codec: "MP3", bitrate: 128, tags: "lounge,chill" },
  ],
};
```

---

## File structure
- Modify: `src/lib/stores/radio.ts` — seed + genre model + favorites + last-station + `bitrateMin` on `loadStations` + `selectStation` + `initRadio` + `togglePlay` seed fallback.
- Modify: `src/lib/stores/radio.test.ts` — tests for the above.
- Create: `src/lib/stores/picker.ts` — `pickerOpen` writable + `openPicker`/`closePicker`/`togglePicker`.
- Create: `src/lib/stores/picker.test.ts`.
- Create: `src/lib/components/StationPicker/index.svelte` — the bottom-sheet panel.
- Modify: `src/lib/components/RadioPlayer/index.svelte` — list-icon trigger + now-playing favicon/fallback.
- Modify: `src/App.svelte` — render `<StationPicker/>`, Esc closes picker, replace `loadStations("lofi")` onMount with `initRadio()`.

---

### Task 1: Seed + genre model + favorites + last-station (store logic, TDD)

**Files:** Modify `src/lib/stores/radio.ts`, `src/lib/stores/radio.test.ts`.

- [ ] **Step 1 — Failing tests** in `radio.test.ts` (new `describe("station picker store")`). Cover:
  - `SEED` has all 4 genres, each non-empty, every `url` starts `https://`, every `id` unique across the whole seed.
  - `favorites`: `toggleFavorite(station)` adds then removes; persists to `localStorage["lofityan.favorites"]`; `isFavorite(id)` reflects it.
  - `selectStation(station)` sets `current` and writes `localStorage["lofityan.last-station"]` (JSON with the station).
  - `loadStations(tag, 192)` puts `&bitrateMin=192` in the request URL (extend the existing fetch-mock test or add one).
  - `initRadio()` with a saved last-station restores `current` (paused; `isPlaying` false) and does NOT auto-fetch.

- [ ] **Step 2 — Run, see them fail.** `pnpm test 2>&1 | tail -10`.

- [ ] **Step 3 — Implement in `radio.ts`:**
  - Add `Genre`, `GENRES`, `GENRE_TAG`, `SEED` exactly as in the locked block above (place after the `RadioStation` interface).
  - `favorites`: `export const favorites = writable<RadioStation[]>(loadFavorites());` with `loadFavorites()` reading `localStorage["lofityan.favorites"]` (try/catch -> []). `export function toggleFavorite(s: RadioStation)` updates+persists; `export function isFavorite(id: string): boolean` via `get(favorites).some(f => f.id === id)`.
  - Last station: `const LAST_KEY = "lofityan.last-station";` `function rememberLast(s: RadioStation){ localStorage.setItem(LAST_KEY, JSON.stringify(s)); }`.
  - `export function selectStation(s: RadioStation): void { rememberLast(s); void play(s); }` (play already sets `current`/buffering).
  - `export function initRadio(): void` — read `LAST_KEY`; if present + valid, `current.set(saved)` (do NOT play). No network call.
  - Extend `loadStations(tag = "lofi", bitrateMin = 0)`: when `bitrateMin > 0`, append `&bitrateMin=${bitrateMin}` to `path`. Default 0 keeps the existing URL unchanged (existing tests stay green).
  - Update `togglePlay()` fallback: when no `current` AND `stations` empty, play `SEED["Lo-Fi"][0]` via `selectStation`. (Keep existing behaviour when `stations` is non-empty.)

- [ ] **Step 4 — Run tests green.** `pnpm test` (expect new tests pass, prior 54 still pass), `pnpm check` 0 errors.
- [ ] **Step 5 — Commit:** `feat(radio): curated seed + genres + favorites + last-station memory`.

---

### Task 2: `pickerOpen` store + StationPicker panel (UI)

**Files:** Create `src/lib/stores/picker.ts`, `src/lib/stores/picker.test.ts`, `src/lib/components/StationPicker/index.svelte`.

- [ ] **Step 1 — `picker.ts`** (mirror the `fullscreen.ts` store shape):
```ts
import { writable } from "svelte/store";
export const pickerOpen = writable<boolean>(false);
export function openPicker() { pickerOpen.set(true); }
export function closePicker() { pickerOpen.set(false); }
export function togglePicker() { pickerOpen.update((v) => !v); }
```
- [ ] **Step 2 — `picker.test.ts`**: open/close/toggle flips the store (like `fullscreen.test.ts`).
- [ ] **Step 3 — Run, green.** (2 new tests.)

- [ ] **Step 4 — `StationPicker/index.svelte`.** A bottom-sheet panel shown when `$pickerOpen`. Behaviour:
  - Local `let tab: Genre | "★" | "More" = "Lo-Fi";`.
  - Tabs row: `GENRES` + `"★"` + `"More"`. Active tab highlighted.
  - Rows source: genre tab -> `SEED[tab]`; `"★"` -> `$favorites`; `"More"` -> `$stations` (radio-browser). When switching to `"More"` (or changing genre while on More), call `loadStations(GENRE_TAG[lastGenre] , 128)` — for the "More" tab use the currently-selected genre's tag (track `let moreGenre: Genre = "Lo-Fi"`); show `$loading` spinner and `$error` (with retry) reusing the radio store states.
  - Each row: a `<button>` with: favicon `<img>` if `station.favicon` startswith `https`, else a default `IconMusic` (from @tabler/icons-svelte); the name; a bitrate badge (`{station.bitrate}k` when >0); a ★/☆ toggle button (`on:click|stopPropagation={() => toggleFavorite(station)}`). Row click -> `selectStation(station)`. Highlight the row when `$current?.id === station.id` (show a small play indicator).
  - Header: title "Станции" (localized — add `picker` keys, see Step 5) + ✕ close button (`closePicker`).
  - Styling: bottom sheet — `position: fixed; left/right: 0; bottom: 0;` rounded top corners, `max-height: 60vh; overflow-y: auto;` glassy background (reuse `.glass`); high z-index (above RadioPlayer's 30, e.g. 40). Portrait-safe (it's anchored to the viewport bottom, full width — no containing-block trap). Follow the visual language of `Settings/index.svelte` (glass, white text, rounded, tab buttons like the language switcher).

- [ ] **Step 5 — Localized strings.** Add a `picker` block to all 7 locales (`en` canonical): `{ title, more, favorites, empty_favorites, loading, retry }`. `en`: `{ title:'Stations', more:'More', favorites:'Favorites', empty_favorites:'No favorites yet — tap ☆ to add', loading:'Loading…', retry:'Tap to retry' }`. `ru`: `{ title:'Станции', more:'Ещё', favorites:'Избранное', empty_favorites:'Пока пусто — нажми ☆, чтобы добавить', loading:'Загрузка…', retry:'Нажми, чтобы повторить' }`. Translate the other 5 idiomatically. (All 7 must change together — `Translations = typeof en`.)

- [ ] **Step 6 — Green.** `pnpm check` 0 errors, `pnpm test` all pass.
- [ ] **Step 7 — Commit:** `feat(picker): station picker bottom-sheet (genres, favorites, more)`.

---

### Task 3: Wire into RadioPlayer + App

**Files:** Modify `src/lib/components/RadioPlayer/index.svelte`, `src/App.svelte`.

- [ ] **Step 1 — RadioPlayer trigger + favicon.**
  - Import `openPicker` from the picker store and `IconList` from icons. Add a list-icon button to the left of ◀ (`on:click={openPicker}`, aria-label "Stations"). Also make the station-name element open the picker on click (`on:click={openPicker}`; keep the retry-button behaviour for the error branch — error stays tap-to-retry, not open-picker).
  - Now-playing favicon: before the station name, render `station.favicon` as a small `<img>` when it's an https URL, else nothing (keep it minimal).
- [ ] **Step 2 — App wiring.**
  - Import `<StationPicker/>` and render it inside `.chrome` (after `<RadioPlayer/>`), so it hover-pauses the auto-hide while open.
  - Import `closePicker` + `pickerOpen`; in `onGlobalHotkey`, the `Escape` branch also calls `closePicker()` (alongside `exitFullscreen`). Order: close picker first if open, else exit fullscreen — or just call both (both are no-ops when inactive).
  - Replace `void loadStations("lofi");` in `onMount` with `initRadio();` (restore last station; the seed is always available; "More" loads on demand).
- [ ] **Step 3 — Green.** `pnpm test` + `pnpm check`.
- [ ] **Step 4 — Commit:** `feat(picker): wire picker trigger, favicon, Esc-close, restore last station`.

---

### Task 4: Verify in the real Tauri window + docs

- [ ] **Step 1 — Full green gate.** `pnpm test` + `pnpm check` + `pnpm build`.
- [ ] **Step 2 — Run `pnpm tauri:d` and drive it:** open picker (list icon + station-name click); switch genres; play a station from each genre (hear it; now-playing shows name + bitrate); ★ a station, see it in Favorites, unstar it; open "More" → radio-browser list loads (spinner → list), play one; close via ✕ and Esc; relaunch → last station restored (paused), press play works. Confirm portrait layout (panel full-width at bottom, scrolls, nothing clipped). Screenshot.
- [ ] **Step 3 — Docs.** README: add the station picker to "Возможности" + structure (`StationPicker`, `picker` store). Handoff doc: mark "station picker" backlog item done; note the curated seed + "More" tab + favorites.
- [ ] **Step 4 — Commit:** `docs: station picker shipped`.

---

## Self-review
- **Coverage:** seed+genres+favorites+last-station (T1), panel UI + picker store + locales (T2), wiring + favicon + Esc + restore (T3), real-window verify + docs (T4). ✓
- **Playback untouched:** `play/pause/next/prev/buffering` unchanged; `selectStation` just wraps `play` + remember; `togglePlay` fallback only changes the empty-stations case. ✓
- **Green invariant:** `loadStations` default args keep existing URL/tests valid; locale change touches all 7 together. ✓
- **Type consistency:** `Genre`/`GENRES`/`GENRE_TAG`/`SEED` defined in radio.ts and consumed in StationPicker; `favorites: RadioStation[]`; `picker` locale block in all 7. ✓
