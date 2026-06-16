# Phase 2 — System Audit Results (2026-06-16)

Adversarial workflow audit (5 systems × find × verify × synth). 27 findings, 26 confirmed, 22 distinct.

## Verdict

Phase 2 is NOT safe to close as-is: there is 1 blocker that makes the station picker undismissable by mouse/touch (a core flow on a radio app) plus 7 majors that are reliably hit on common interactions — wrong context-menu state, leaking listeners that break background nav, a permanently frozen auto-hide timer, fullscreen/OS desync, double-fired playback on Space, stale wrong-genre lists, and no restart on re-selecting the current station. The remaining 13 minors and 5 nits are real but cosmetic/a11y/latent and do not block. After deduping, the 26 confirmed findings collapse to 22 distinct issues (the ContextMenu major, the Background.svelte listener-leak major, and the Volume duplicate-id nit / loadStations race were each reported twice across dimensions).", "confirmed">[]

## Recommendation

Fix NOW before closing Phase 2 (1 blocker + 7 majors): (1) the picker ghost-overlay — move StationPicker out of .chrome or guard onIdle on $pickerOpen; (2) ContextMenu play/pause via $isPlaying store; (3) Background.svelte listener leak — move the 3 listeners into onMount with cleanup; (4) immersion toggleImmersive() use resume() not reset(); (5) fullscreen store sync via Tauri resize listen; (6) Space double-fire — add 'button' to the closest() guard; (7) loadStations sequence guard to stop stale-genre overwrites; (8) re-selecting current station should restart instead of silently closing. Note that fixes 2, 3, and the Volume duplicate-id were each filed twice — implement once. DEFER to a Phase-3 polish pass: the 13 minors and 5 nits (favicon https:// guard, on:error fallbacks, backdrop tabindex, effect-button aria, dead/misleading shortcut labels, picker state persistence, empty-state hint, isTypingTarget consistency, volume slider ids, queue-before-guard, initRadio HTTPS check). Recommend re-running pnpm check + the 69 unit tests after the 8 fixes, and ideally adding a regression test for the loadStations race and the immersion resume() path since both are state-machine bugs not covered today.

## Confirmed issues (22)

- **[BLOCKER]** Open station picker becomes a ghost overlay when immersive idle timer fires — undismissable by mouse/touch  
  `src/App.svelte:155 + src/lib/components/StationPicker/index.svelte:48` — _fix:_ Move <StationPicker /> outside the .chrome div in App.svelte (alongside <RainAnimation />), or guard the immersion store's onIdle to not set immersive.set(true) while $pickerOpen is true.
- **[MAJOR]** ContextMenu play/pause label and icon permanently stuck on 'Play'  
  `src/lib/components/ContextMenu/ContextMenu.svelte:18,66-88` — _fix:_ import { isPlaying } from '../../stores/radio' and use $isPlaying in the template; delete the local let isPlaying, the handlePlayStateChange handler, and both add/removeEventListener('lofi-play-state-changed') calls (the event is never dispatched).
- **[MAJOR]** Background.svelte leaks 3 window listeners per Settings open — ArrowRight skips N backgrounds after N opens  
  `src/lib/components/Controls/Settings/Background.svelte:246-266` — _fix:_ Move the three window.addEventListener calls (customBackgroundSelected, backgroundsUpdated, keydown) into onMount and return a cleanup function that removeEventListener's each.
- **[MAJOR]** Manual immersive toggle while hovering chrome permanently freezes the auto-hide timer for the session  
  `src/lib/stores/immersion.ts:23-26` — _fix:_ In toggleImmersive(), replace activeTimer.reset() with activeTimer.resume() so the countdown re-arms even when the timer was paused by pointerenter.
- **[MAJOR]** Fullscreen store desyncs from OS when user exits via native gesture — drag region stays hidden  
  `src/lib/stores/fullscreen.ts:1-39` — _fix:_ Subscribe to Tauri window resize events (win.listen('tauri://resize', async () => fullscreen.set(await win.isFullscreen()))) and unlisten on cleanup, so the store tracks OS-driven fullscreen changes.
- **[MAJOR]** Space key double-fires playback when a picker/controls button is keyboard-focused  
  `src/App.svelte:43` — _fix:_ Add 'button' to the guard: t.closest('input, textarea, select, button') so the global Space handler does not fire alongside a button's native click activation.
- **[MAJOR]** 'More' tab shows stale stations from a previous genre — in-flight loadStations has no cancellation/sequence guard  
  `src/lib/stores/radio.ts:125-155 (set at :145) + src/lib/components/StationPicker/index.svelte:33-43` — _fix:_ Add a module-level loadSeq/currentLoadTag; capture it at the top of loadStations and bail (return before stations.set/listLoading.set) if it no longer matches when each await resolves, discarding superseded responses.
- **[MAJOR]** Clicking the currently-playing row closes the picker but never restarts — no recovery for a stalled stream  
  `src/lib/components/StationPicker/index.svelte:83 + src/lib/stores/radio.ts:288` — _fix:_ Drop the `if current===s && isPlaying return` early-return in selectStation so re-selecting always calls play() (idempotent for healthy streams, restarts stalled ones), or skip closePicker()/show feedback when re-selecting the current station.
- **[MINOR]** Background.svelte arrow-key guard misses textarea/select and modifier-key combos  
  `src/lib/components/Controls/Settings/Background.svelte:258-265` — _fix:_ Replace the ad-hoc `!e.target.closest('input')` guard with the shared isTypingTarget(e) helper so Ctrl/Cmd+Arrow and textarea/select/contenteditable are excluded.
- **[MINOR]** Escape key swallowed by input guard when focus is on a volume range slider  
  `src/App.svelte:43,52` — _fix:_ Move the Escape branch (closePicker(); void exitFullscreen(); return;) above the input guard at line 43 so Escape works regardless of focus target.
- **[MINOR]** selectStation mutates queue before the same-station guard — silent navigation-context switch  
  `src/lib/stores/radio.ts:285` — _fix:_ Move `if (list && list.length) queue.set(list);` to after the same-station guard (line 288) so the queue is only replaced when a real station switch happens.
- **[MINOR]** initRadio restores a station from localStorage without HTTPS validation  
  `src/lib/stores/radio.ts:303` — _fix:_ Tighten the guard to `if (s && typeof s.url === 'string' && s.url.startsWith('https://'))` so a stored HTTP URL doesn't cause a silent 'Stream failed to play' on launch (CSP blocks non-HTTPS media).
- **[MINOR]** 'More' tab has no empty state — zero HTTPS stations renders a blank list  
  `src/lib/components/StationPicker/index.svelte:73-98` — _fix:_ Add a branch `{:else if tab === 'More' && rows.length === 0}` that shows an empty-results hint (new empty_results i18n key, or reuse empty_favorites as a stopgap).
- **[MINOR]** moreGenre/tab reset to defaults each time the picker is closed and re-opened  
  `src/lib/components/StationPicker/index.svelte:27-28` — _fix:_ Hoist tab and moreGenre into module-level writables (e.g. picker.ts) and bind the component to them so values survive the {#if $pickerOpen} destroy/recreate cycle.
- **[MINOR]** Favicon <img> has no on:error fallback — broken/tracking URLs show the broken-image glyph  
  `src/lib/components/StationPicker/index.svelte:84-88 + src/lib/components/RadioPlayer/index.svelte:31-33` — _fix:_ Add on:error on both <img> elements to hide/swap to the IconMusic fallback; RadioPlayer additionally needs an {:else} icon branch which it currently lacks.
- **[MINOR]** Picker backdrop button is in the tab order and announced as a full-screen interactive control  
  `src/lib/components/StationPicker/index.svelte:48` — _fix:_ Add tabindex="-1" aria-hidden="true" to the backdrop button (Esc handler and the visible ✕ already provide keyboard close).
- **[MINOR]** Effect toggle buttons (Rain/Thunder/Jungle/CampFire) have no accessible name or pressed state  
  `src/lib/components/Controls/Rain/index.svelte:96 (+ Thunder/Jungle/CampFire :94)` — _fix:_ Add aria-label and aria-pressed bound to each local state variable (isRaining/isStorming/isActive/isFire), matching the FullScreen button pattern.
- **[MINOR]** Shortcuts UI lists 'Ctrl+R = Restart' but no handler exists (dead shortcut)  
  `src/lib/components/InfoBox/ShortCuts.svelte:30-33` — _fix:_ Either add a Ctrl/Cmd+R handler (e.preventDefault(); window.location.reload()) or remove the row and the `restart` key from all 7 locale files.
- **[MINOR]** Esc documented as 'Hide this window' but never minimizes/hides the Tauri window  
  `src/lib/components/InfoBox/ShortCuts.svelte:12-13` — _fix:_ Either call appWindow.minimize() in the Esc handler, or fix the `esc` string in all 7 locale files to describe the real behavior (close picker / exit fullscreen).
- **[NIT]** Five volume sliders share id='volume-slider' — invalid HTML, a11y ID-resolution hazard  
  `src/lib/components/Controls/Settings/Volume.svelte:36,49,62,75,88` — _fix:_ Give each input a unique id (vol-rain/vol-thunder/vol-jungle/vol-campfire/vol-main), add class="volume-slider", and change the CSS selector at line 109 from #volume-slider to .volume-slider.
- **[NIT]** Favicon guard uses .startsWith('https') instead of 'https://' — accepts non-URL strings  
  `src/lib/components/StationPicker/index.svelte:84 + src/lib/components/RadioPlayer/index.svelte:31` — _fix:_ Change both guards to .startsWith('https://') so favicons like 'httpsevil.com/x.png' fall back to the music-note icon.
- **[NIT]** Global hotkey input guard uses .closest() instead of isTypingTarget() — misses contentEditable  
  `src/App.svelte:30,43` — _fix:_ Import and use isTypingTarget(e) from ./lib/utils/dom in both handlers (preserving the modifier-key early-return logic) for consistency with the five effect components.

---

## ✅ Resolution (2026-06-16)

All confirmed issues fixed on branch `fix-phase2-audit` (4 grouped subagent passes A/B/C1/C2 + adversarial-verified):
- **Blocker** (picker ghost) — `StationPicker` moved OUT of `.chrome` + immersion `onIdle` bails while `pickerOpen`.
- **7 majors** — ContextMenu uses `$isPlaying`; Background listeners moved to onMount/onDestroy; immersion `toggleImmersive` resume()+reset(); fullscreen `initFullscreenSync()` tracks OS; Space skips focused buttons; `loadStations` sequence guard; re-selecting current station now restarts.
- **Minors/nits** — Escape works under focus; initRadio https check; "More" empty state; favicon `https://` guard + on:error fallback; backdrop a11y; effect-button aria; unique slider ids; persisted picker tab; live Ctrl/Cmd+R reload; honest Esc label.

Verified: **71 unit tests, 0 type errors, 0 a11y warnings, build OK**, and a full browser smoke (picker open/close/select/tab-persist/favorites/More/backdrop — all pass, zero JS exceptions). **Phase 2 closed.**
