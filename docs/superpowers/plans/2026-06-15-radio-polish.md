# Radio Foundation Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the radio foundation to a flawless, honest, lean state — **without adding features**. Keep current layout positions (effects dock at top, radio at bottom-center), make them intentional and portrait-safe.

**Architecture:** Tauri 2 + Svelte 3 + TypeScript. Svelte stores are the single source of truth (`radio`, `volume`, `weather`, `immersion`, `locale`). This iteration removes dead generative-era code/assets/strings, makes the UI honest (real shortcuts, real labels), gives the radio real loading/buffering/error feedback, and tightens the immersive auto-hide so the first click always lands.

**Tech Stack:** Tauri 2, Svelte 3, TypeScript, Vite 4, pnpm, Vitest, @tabler/icons-svelte.

**Baseline (verified 2026-06-15):** `pnpm test` → 6 files / 49 tests green. `pnpm check` → 0 errors, 1 known a11y warning. Every task below must keep this green (tests never below 49, type errors stay 0).

**Scope decisions locked with the user:**
- Layout = **"прибрать текущее"**: keep current positions, just make them intentional + portrait-safe. NO big reorg.
- Polish only, **no new features**. The one micro-addition allowed: a `Space` = radio play/pause hotkey, because it *restores* the already-documented (but currently dead) "SPACEBAR play/pause" shortcut.
- In-app name → "LoFiTyan" + honest tagline (text only). Deep Victory brand (icons / bundle identifier / productName) is deferred to a later "brand" phase.

---

## File Structure

**Modified:**
- `package.json` — drop `tone` dependency.
- `public/assets/engine/` — delete `PianoSamples/`, `DrumSamples/`, `tracks/` (keep `effects/`).
- `src/lib/locales/{en,ja,zh,hi,fr,nl,ru}.ts` — remove dead keys, rework shortcuts, honest labels/title. `en.ts` defines the `Translations` type, so all 7 must change together to stay green.
- `src/lib/components/InfoBox/ShortCuts.svelte` — rewrite to list only REAL shortcuts.
- `src/lib/components/InfoBox/Info.svelte` — app logo alt/title come from locale; no code change needed beyond locale (verify).
- `src/lib/components/Controls/Settings/Volume.svelte` — relabel "Main Track" slider (it controls master = radio volume).
- `src/App.svelte` — add `Space` → radio `togglePlay` hotkey.
- `src/lib/stores/radio.ts` — add a `buffering` store fed by audio `waiting`/`playing`/`canplay` events.
- `src/lib/stores/radio.test.ts` — tests for the buffering transitions.
- `src/lib/components/RadioPlayer/index.svelte` — show loading / buffering spinner / error / station name.
- `src/lib/stores/immersion.ts` — make the chrome REVEAL instant (transition only on hide), so a click after the reveal lands immediately.
- `src/App.svelte` (style) — reveal-instant transition tweak + portrait spacing tidy.
- `README.md`, `docs/superpowers/specs/2026-06-15-radio-pivot-handoff.md` — reflect the polished state.

**Branch:** create `polish-radio-foundation` off `phase-1-foundation` before starting.

---

### Task 0: Setup branch

- [ ] **Step 1: Create the working branch**

```bash
cd /Users/wsgp/SergD_LoFi/lofi-engine
env -u GITHUB_TOKEN git checkout -b polish-radio-foundation
```

- [ ] **Step 2: Confirm clean + green baseline**

Run: `git status --short && pnpm test 2>&1 | tail -3 && pnpm check 2>&1 | tail -2`
Expected: clean tree; `Tests 49 passed (49)`; `0 errors and 1 warning`.

---

### Task 1: Lean — drop `tone` + 26M of dead generative assets

**Files:**
- Modify: `package.json`
- Delete: `public/assets/engine/PianoSamples/`, `public/assets/engine/DrumSamples/`, `public/assets/engine/tracks/`

- [ ] **Step 1: Confirm the dead assets are referenced nowhere**

Run: `grep -rho 'assets/engine/[a-zA-Z0-9_/.-]*' src | sort -u`
Expected: only the four `assets/engine/effects/{fire,jungle,rain,thunder}.mp3`. If anything else appears, STOP and report.

- [ ] **Step 2: Delete the dead asset folders (keep `effects/`)**

```bash
cd /Users/wsgp/SergD_LoFi/lofi-engine
rm -rf public/assets/engine/PianoSamples public/assets/engine/DrumSamples public/assets/engine/tracks
ls public/assets/engine    # expect: effects
```

- [ ] **Step 3: Remove the `tone` dependency**

In `package.json`, delete the line `"tone": "^14.7.30"` from `dependencies` (and fix the trailing comma on the line above so JSON stays valid — `"@tauri-apps/plugin-shell": "~2.3.0"` becomes the last dependency, no trailing comma).

- [ ] **Step 4: Refresh the lockfile**

Run: `pnpm install`
Expected: completes; `tone` removed from `pnpm-lock.yaml`.

- [ ] **Step 5: Verify green + no tone left**

Run: `grep -rn "tone" src || echo "no tone refs"` then `pnpm test 2>&1 | tail -3 && pnpm check 2>&1 | tail -2`
Expected: no `tone` references in `src`; `49 passed`; `0 errors and 1 warning`.

- [ ] **Step 6: Commit**

```bash
env -u GITHUB_TOKEN git add -A
env -u GITHUB_TOKEN git commit -m "chore: drop tone dep and ~26M of dead generative audio assets"
```

---

### Task 2: Honest text — remove dead locale keys, real labels, LoFiTyan name

All 7 locale files share the type `Translations = typeof en`, so they must change together. `en.ts` is canonical; mirror the structure to the other six with translated strings.

**Remove from every locale:** `settings.autodj` (whole block), `player` (whole block — only had `regenerate`), `tracks` (whole block).
**Rework `info.shortcuts`** to the real keys only (see new shape below).
**Relabel** `settings.volume.main_track` value → "Radio" / "Радио" etc. (key name stays `main_track` to avoid touching `Volume.svelte` logic, only the displayed string changes). 
**Honest** `info.title` → `"LoFiTyan"`, `info.tagline` → radio-reality line.

**Files:**
- Modify: `src/lib/locales/en.ts` (canonical), then `ja.ts`, `zh.ts`, `hi.ts`, `fr.ts`, `nl.ts`, `ru.ts`
- Modify: `src/lib/components/InfoBox/ShortCuts.svelte`
- Modify: `src/lib/components/Controls/Settings/Volume.svelte` (no code change — it reads `$t.settings.volume.main_track`; only the locale string changes. Verify it still renders.)

- [ ] **Step 1: Rewrite `en.ts` to the honest shape**

Replace the whole `en` object with:

```ts
export const en = {
    settings: {
        title: 'Settings',
        background: {
            title: 'Background',
            add_custom: 'Add Custom Images',
            delete_tooltip: 'Delete this background',
            processing: 'Processing images...',
        },
        volume: {
            title: 'Volume',
            rain: 'Rain',
            thunder: 'Thunder',
            jungle: 'Jungle',
            campfire: 'Campfire',
            main_track: 'Radio',
        },
        language: {
            title: 'Language',
            select: 'Select Language',
        },
    },
    info: {
        title: 'LoFiTyan',
        tagline: 'Real lo-fi radio with atmosphere, in a cozy window.',
        buttons: {
            show_next_time: 'Show on start next time',
            shown_next_time: 'Will show on next start',
        },
        shortcuts: {
            title: 'Shortcuts',
            general: {
                title: 'General',
                esc: 'Hide this window',
                j: 'Open/close Settings',
                immersive: 'Toggle spacious mode',
                next_bg: 'Next Background Image',
                prev_bg: 'Previous Background Image',
                restart: 'Restart',
            },
            radio: {
                title: 'Radio',
                play_pause: 'Play/Pause radio',
                stop_all: 'Stop everything',
            },
            effects: {
                title: 'Effects',
                rain: 'Toggle Rain',
                thunder: 'Toggle Thunder',
                nature: 'Toggle Nature sounds',
                campfire: 'Toggle Campfire',
            },
        },
    },
    context_menu: {
        play: 'Play',
        pause: 'Pause',
        toggle_rain: 'Toggle Rain',
        toggle_thunder: 'Toggle Thunder',
        toggle_jungle: 'Toggle Jungle',
        toggle_campfire: 'Toggle Campfire',
        reload: 'Reload',
        about: 'About',
    },
};
```

- [ ] **Step 2: Run check — expect type errors pointing at the dead-key consumers**

Run: `pnpm check 2>&1 | tail -25`
Expected: errors in `ShortCuts.svelte` (references removed `main_track`/`ambient`). This is the to-do list for Step 3. (`Volume.svelte` still compiles — `main_track` key still exists.)

- [ ] **Step 3: Rewrite `ShortCuts.svelte` to list ONLY real shortcuts**

Replace the whole file with (real keys verified in code: `Esc` hides Info, `J` settings, `Ctrl/Cmd+I` immersive, `←/→` background, `Ctrl+R` reload, `Space` radio play/pause [added in Task 3], `K` stop-all, `A/S/D/F` effects):

```svelte
<script lang="ts">
  import { IconArrowLeft, IconArrowRight } from "@tabler/icons-svelte";
  import { t } from "../../locales/store";
</script>

<div class="shortcuts">
  <h4>{$t.info.shortcuts.title}</h4>

  <h5 style="margin-left: 10px;">{$t.info.shortcuts.general.title}</h5>
  <div class="shortcut">
    <div class="shortcut-key">Esc</div>
    <div class="shortcut-desc">{$t.info.shortcuts.general.esc}</div>
  </div>
  <div class="shortcut">
    <div class="shortcut-key">J</div>
    <div class="shortcut-desc">{$t.info.shortcuts.general.j}</div>
  </div>
  <div class="shortcut">
    <div class="shortcut-key">Ctrl/⌘ + I</div>
    <div class="shortcut-desc">{$t.info.shortcuts.general.immersive}</div>
  </div>
  <div class="shortcut">
    <div class="shortcut-key"><IconArrowRight size={15} /></div>
    <div class="shortcut-desc">{$t.info.shortcuts.general.next_bg}</div>
  </div>
  <div class="shortcut">
    <div class="shortcut-key"><IconArrowLeft size={15} /></div>
    <div class="shortcut-desc">{$t.info.shortcuts.general.prev_bg}</div>
  </div>
  <div class="shortcut">
    <div class="shortcut-key">Ctrl + R</div>
    <div class="shortcut-desc">{$t.info.shortcuts.general.restart}</div>
  </div>

  <h5 style="margin-left: 10px;">{$t.info.shortcuts.radio.title}</h5>
  <div class="shortcut">
    <div class="shortcut-key">Space</div>
    <div class="shortcut-desc">{$t.info.shortcuts.radio.play_pause}</div>
  </div>
  <div class="shortcut">
    <div class="shortcut-key">K</div>
    <div class="shortcut-desc">{$t.info.shortcuts.radio.stop_all}</div>
  </div>

  <h5 style="margin-left: 10px;">{$t.info.shortcuts.effects.title}</h5>
  <div class="shortcut">
    <div class="shortcut-key">A</div>
    <div class="shortcut-desc">{$t.info.shortcuts.effects.rain}</div>
  </div>
  <div class="shortcut">
    <div class="shortcut-key">S</div>
    <div class="shortcut-desc">{$t.info.shortcuts.effects.thunder}</div>
  </div>
  <div class="shortcut">
    <div class="shortcut-key">D</div>
    <div class="shortcut-desc">{$t.info.shortcuts.effects.nature}</div>
  </div>
  <div class="shortcut">
    <div class="shortcut-key">F</div>
    <div class="shortcut-desc">{$t.info.shortcuts.effects.campfire}</div>
  </div>
</div>

<style>
  .shortcuts {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0 10px;
  }
  h4,
  h5 {
    margin: 0;
  }
  .shortcut {
    display: flex;
    gap: 1rem;
    font-size: small;
    margin-left: 20px;
  }
  .shortcut-key {
    min-width: 30px;
    background-color: #fff;
    color: #000;
    padding: 5px 10px;
    border-radius: 10px;
    text-align: center;
  }
  .shortcut-desc {
    color: #fff;
  }
</style>
```

- [ ] **Step 4: Mirror the new shape to the other 6 locales**

For each of `ja.ts`, `zh.ts`, `hi.ts`, `fr.ts`, `nl.ts`, `ru.ts`: delete `settings.autodj`, `player`, `tracks`; replace `info.shortcuts` with the same key structure as `en` (general{title,esc,j,immersive,next_bg,prev_bg,restart}, radio{title,play_pause,stop_all}, effects{title,rain,thunder,nature,campfire}); set `info.title` = `"LoFiTyan"`; translate `info.tagline` and `settings.volume.main_track` ("Radio"). Use the existing translated strings where keys are unchanged; translate the new `immersive` / `radio.*` strings naturally per language.

For `ru.ts` specifically use:
- `volume.main_track`: `'Радио'`
- `info.title`: `'LoFiTyan'`
- `info.tagline`: `'Настоящее lo-fi радио с атмосферой, в уютном окне.'`
- `shortcuts.general.esc`: `'Скрыть это окно'`, `.immersive`: `'Просторный режим'`
- `shortcuts.radio`: `{ title: 'Радио', play_pause: 'Воспроизведение / пауза радио', stop_all: 'Остановить всё' }`
- `shortcuts.effects`: `{ title: 'Эффекты', rain: 'Вкл/выкл дождь', thunder: 'Вкл/выкл грозу', nature: 'Вкл/выкл звуки природы', campfire: 'Вкл/выкл костёр' }`

- [ ] **Step 5: Verify green**

Run: `pnpm check 2>&1 | tail -3 && pnpm test 2>&1 | tail -3`
Expected: `0 errors and 1 warning`; `49 passed`. (The locale store test still passes — it doesn't assert removed keys.)

- [ ] **Step 6: Manual locale parity check**

Run: `node -e "['en','ja','zh','hi','fr','nl','ru'].forEach(l=>{const m=require('./src/lib/locales/'+l+'.ts')})" 2>/dev/null || echo "ts not requireable — rely on pnpm check (already green)"`
(Parity is already guaranteed by `pnpm check` since every locale is typed `Translations`.)

- [ ] **Step 7: Commit**

```bash
env -u GITHUB_TOKEN git add -A
env -u GITHUB_TOKEN git commit -m "refactor(i18n): drop dead generative strings, honest shortcuts + radio labels, LoFiTyan name"
```

---

### Task 3: Radio feedback — loading / buffering spinner / error + Space hotkey

Give the radio real feedback so "I clicked play and nothing happened" disappears. Add a `buffering` store driven by the audio element's `waiting`/`playing`/`canplay` events, show it (plus existing `loading`/`error`) in `RadioPlayer`, and wire `Space` → `togglePlay`.

**Files:**
- Modify: `src/lib/stores/radio.ts`
- Modify: `src/lib/stores/radio.test.ts`
- Modify: `src/lib/components/RadioPlayer/index.svelte`
- Modify: `src/App.svelte`

- [ ] **Step 1: Write failing tests for the `buffering` store**

In `radio.test.ts`, inside the `describe("playback transitions (FakeAudio)")` block, add a test. Extend `FakeAudio` to let tests fire arbitrary listeners (it already stores them in `this.listeners` and has `addEventListener`). Add:

```ts
  it("buffering reflects waiting/playing/canplay audio events", async () => {
    const { mod, created } = await setup();
    const list = get(mod.stations);
    await mod.play(list[0]);
    const el = created[0];

    el.listeners["waiting"]?.forEach((fn) => fn());
    expect(get(mod.buffering)).toBe(true);

    el.listeners["playing"]?.forEach((fn) => fn());
    expect(get(mod.buffering)).toBe(false);

    el.listeners["waiting"]?.forEach((fn) => fn());
    expect(get(mod.buffering)).toBe(true);
    el.listeners["canplay"]?.forEach((fn) => fn());
    expect(get(mod.buffering)).toBe(false);
  });

  it("starting playback on a new station sets buffering true until it plays", async () => {
    const { mod, created } = await setup();
    const list = get(mod.stations);
    await mod.play(list[0]);
    // play() optimistically marks buffering until 'playing'/'canplay'
    expect(get(mod.buffering)).toBe(true);
    created[0].listeners["playing"]?.forEach((fn) => fn());
    expect(get(mod.buffering)).toBe(false);
  });
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `pnpm test 2>&1 | tail -8`
Expected: FAIL — `mod.buffering` is undefined / not exported.

- [ ] **Step 3: Implement `buffering` in `radio.ts`**

Add the store and wire the events. Specifically:

After the other `writable` declarations add:
```ts
export const buffering = writable<boolean>(false);
```

In `ensureAudio()`, after the existing `error` listener, register buffering listeners:
```ts
    audio.addEventListener("waiting", () => buffering.set(true));
    audio.addEventListener("playing", () => buffering.set(false));
    audio.addEventListener("canplay", () => buffering.set(false));
```

In `play()`, set buffering true optimistically right after `error.set(null);`:
```ts
    buffering.set(true);
```
and in the `try` after `isPlaying.set(true);` leave buffering as-is (the `playing`/`canplay` event clears it); in the `catch` add `buffering.set(false);`.

In `pause()` add `buffering.set(false);` so a paused stream isn't shown as buffering.

- [ ] **Step 4: Run tests — verify green**

Run: `pnpm test 2>&1 | tail -4`
Expected: `51 passed` (49 + 2 new).

- [ ] **Step 5: Show feedback in `RadioPlayer`**

Update `RadioPlayer/index.svelte` script imports to include `loading, error, buffering`:
```ts
  import {
    current,
    isPlaying,
    loading,
    error,
    buffering,
    togglePlay,
    playNext,
    playPrev,
  } from "../../stores/radio";
  import { t } from "../../locales/store";
```

Replace the `<p class="station-name">…</p>` with a status-aware line (no new locale keys required — reuse plain text; if you prefer localized text, add `player: { loading, offline }` to all locales, but plain is acceptable here):
```svelte
  <p class="station-name" title={$current?.name ?? ""}>
    {#if $error}
      ⚠ {$error}
    {:else if $loading}
      Loading stations…
    {:else if $buffering}
      <span class="dot-spin" aria-hidden="true"></span> {$current?.name ?? "Buffering…"}
    {:else}
      {$current?.name ?? "…"}
    {/if}
  </p>
```

Add a tiny CSS spinner to the component `<style>`:
```css
  .dot-spin {
    display: inline-block;
    width: 10px;
    height: 10px;
    margin-right: 4px;
    border: 2px solid rgba(255, 255, 255, 0.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: dot-spin 0.8s linear infinite;
    vertical-align: middle;
  }
  @keyframes dot-spin {
    to { transform: rotate(360deg); }
  }
```

Also reflect buffering on the play button so the click feels acknowledged: when `$buffering`, keep showing the pause icon path is fine; no logic change required (optional: dim the button). Keep it minimal.

- [ ] **Step 6: Wire `Space` → radio play/pause in `App.svelte`**

In `onGlobalHotkey`, after the `if (e.key === "k")` block, add (note: `e.code === "Space"` so it works regardless of layout; preventDefault to stop page scroll):
```ts
    if (e.code === "Space") {
      e.preventDefault();
      togglePlay();
    }
```
`togglePlay` is already imported in `App.svelte`. The existing guard `if (t && t.closest("input, textarea, select")) return;` already prevents triggering while typing.

- [ ] **Step 7: Verify green**

Run: `pnpm test 2>&1 | tail -3 && pnpm check 2>&1 | tail -2`
Expected: `51 passed`; `0 errors and 1 warning`.

- [ ] **Step 8: Commit**

```bash
env -u GITHUB_TOKEN git add -A
env -u GITHUB_TOKEN git commit -m "feat(radio): loading/buffering/error feedback + Space play-pause hotkey"
```

---

### Task 4: Eaten-click fix + intentional, portrait-safe layout

Make the immersive chrome **reveal instantly** (transition only when hiding), so the moment a user moves the pointer the controls are back and the next click lands. Keep current positions; tidy spacing so nothing overlaps the titlebar or the dock in portrait.

**Files:**
- Modify: `src/lib/stores/immersion.ts` (no logic change needed — the reveal-instant is CSS; verify activity events already include `mousemove`/`pointermove` — they include `mousemove`, `pointerdown`; add `pointermove` for parity)
- Modify: `src/App.svelte` (style)

- [ ] **Step 1: Add `pointermove` to the activity events**

In `immersion.ts` `initIdleWatch`, add `"pointermove"` to the `activityEvents` array (so pen/touch hovers also wake instantly). Keep the rest unchanged.

- [ ] **Step 2: Make the reveal instant in `App.svelte`**

In the `<style>` of `App.svelte`, change the chrome transition so only the HIDE animates and the SHOW is immediate:
```css
  .chrome {
    transition: opacity 0.4s ease;
  }
  .container.immersive .chrome {
    opacity: 0;
    pointer-events: none;
    /* hide fades out over 0.4s (rule above); reveal is instant so a click
       right after the pointer wakes the chrome lands on a real, opaque button. */
    transition: opacity 0.4s ease;
  }
  .container:not(.immersive) .chrome {
    transition: none;
  }
```

- [ ] **Step 3: Portrait spacing tidy**

Verify in `RadioPlayer/index.svelte` the portrait `bottom: 24px` clears the screen edge, and the effects dock (top, inside `.content`) isn't under the 26px titlebar — `.content` already has `padding-top: 30px` in landscape and `padding: 20px` in portrait. If the dock visually touches the titlebar in portrait, bump portrait `.content` `padding-top` to `34px`. Make this change only if the real-window check in Task 5 shows an overlap; otherwise leave as-is and note it.

- [ ] **Step 4: Verify green**

Run: `pnpm test 2>&1 | tail -3 && pnpm check 2>&1 | tail -2`
Expected: `51 passed`; `0 errors and 1 warning`.

- [ ] **Step 5: Commit**

```bash
env -u GITHUB_TOKEN git add -A
env -u GITHUB_TOKEN git commit -m "fix(immersion): instant chrome reveal so the first click lands; portrait tidy"
```

---

### Task 5: Verify in the real Tauri app + refresh docs

Polish is only real if it works in the actual window. Verify, then make the docs honest.

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-06-15-radio-pivot-handoff.md`

- [ ] **Step 1: Full green gate**

Run: `pnpm test 2>&1 | tail -3 && pnpm check 2>&1 | tail -2`
Expected: `51 passed`; `0 errors and 1 warning`.

- [ ] **Step 2: Run the real app and drive it**

Run: `pnpm tauri:d` (launches the native window). Verify by interaction:
- Stations load → station name appears (or "Loading stations…" then a name).
- Press `Space` → toggles play/pause. Click play button → buffering spinner shows, then audio.
- `◀ ▶` switch stations; each shows buffering then plays.
- Turn off Wi‑Fi briefly, reload → error line "⚠ …" shows instead of a silent "…".
- Let controls auto-hide (8s), then move the mouse → controls reappear instantly; the **first** click on play works (no double-click).
- Open settings (`J`/gear): "Radio" volume slider relabeled; the About box title says "LoFiTyan"; shortcuts panel lists only real keys (no SPACEBAR-main-track, no 1–9).

Capture a screenshot of the running window and confirm visually. If anything fails, fix in the relevant task's file and re-verify before committing.

- [ ] **Step 3: Update README + handoff to the polished reality**

In `README.md`: under "Status / Возможности", note loading/buffering/error feedback, honest shortcuts, Space hotkey, and that the app now identifies in-UI as "LoFiTyan". In the handoff doc, move "clickability" from backlog item #1 to "done (instant reveal)", and mark the polish items complete; keep the remaining backlog (station picker, character, fullscreen, deep Victory brand).

- [ ] **Step 4: Commit**

```bash
env -u GITHUB_TOKEN git add -A
env -u GITHUB_TOKEN git commit -m "docs: reflect polished radio state (feedback, honest shortcuts, instant reveal)"
```

---

## Self-Review (done while writing)

- **Spec coverage:** every locked scope item maps to a task — drop tone/assets (T1), dead keys + honest shortcuts + LoFiTyan name + radio label (T2), loading/buffering/error feedback + Space (T3), eaten-click + portrait tidy (T4), real-app verify + docs (T5). ✓
- **Type consistency:** `buffering` exported from `radio.ts` and imported in `RadioPlayer` + tests; `info.shortcuts.{general.immersive, radio.*}` defined in `en` and consumed in `ShortCuts.svelte`; `main_track` key kept (only its string changes) so `Volume.svelte` is untouched. ✓
- **No placeholders:** all edits give concrete code or exact strings; the only per-language judgment is translating the new `immersive`/`radio.*` strings, with `en` + `ru` given verbatim. ✓
- **Green invariant:** Task 2 changes locales + consumers together (Step 2 deliberately surfaces the type errors as the Step 3 to-do), so no commit is left red. ✓
