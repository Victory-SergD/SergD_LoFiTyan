# Post-Features Audit Results (2026-06-16)

Adversarial workflow (5 systems × find × verify × synth). 27 findings, 26 confirmed, 23 distinct. No blockers.

## Verdict

Good shape overall, ship-ready after a focused fix pass. The baseline is solid (83 tests pass, pnpm check clean, prod build succeeds) and none of the 23 deduped issues is a blocker — nothing crashes or loses user data on the happy path. The defect density is concentrated in two newer subsystems flagged for scrutiny: (1) the gapless Web Audio loop has a genuine, user-reachable concurrency flaw, and (2) the unified background/video system has several edge-case and feedback gaps. 26 confirmed findings collapse to 23 distinct issues after deduping the three audioLoop race reports into one root cause. Severity mix: 7 major, 9 minor, 7 nit. The majors are real but bounded — each is a recoverable UX/state-desync or a11y violation, not a stability risk.\n\nDEDUPE NOTE: Three separate findings (\"double-play on rapid toggle\", \"stop-during-async-load race\", \"play() starts audio after stop()\") are the SAME defect — the `if (playing) return` guard at audioLoop.ts:43 sits after the two awaits at lines 41-42, so `playing` is meaningless during the fetch+decode window and works as neither an entry-lock nor a cancellation sentinel. Merged into one major. The \"concurrent fetch+decode\" minor is a fourth symptom of the same missing-guard root and is folded in via the same fix. The two tauri.conf.json:42 findings are kept separate (one is a functional black-screen bug, the other a security-hardening posture), as are the two onBackgroundsUpdated/saveCustomBackgrounds IDB findings (distinct lines, distinct fixes).

## Recommendation

FIX NOW (before release):\n1. audioLoop race + tests (audioLoop.ts:39-51 and the four toggleX) — one intent-capture fix plus a guard collapses all three race reports; land audioLoop.test.ts alongside it. This is the single highest-value change: users hit it on first-ever use of any atmosphere effect.\n2. Idle timer hides open Settings (immersion.ts:161-163) — UI disappears under the user; one store guard.\n3. Escape doesn't close Settings (Settings/index.svelte) — broken expectation, trivial branch.\n4. aria-hidden on interactive backdrop button (StationPicker:54) — flagged critical by axe/Lighthouse/WCAG; swap to role=presentation div.\n5. onBackgroundsUpdated await ordering (Background.svelte:363-366) — corrupts in-memory custom backgrounds; one-line async fix.\n6. Video black-screen on non-$HOME paths (tauri.conf.json:42 + on:error handlers) — silent failure with zero feedback after a successful file pick; add on:error and surface a message.\n\nThese six are small, localized, and fully specified — collectively well under a day of work.\n\nDEFER (next iteration, batch into one i18n/UX-polish PR):\n- Stale More-tab list, favorites-queue snapshot desync, arrow-keys-over-Settings, focal-before-metadata, double preview decode.\n- i18n gaps (RadioPlayer 'Повторить', untranslated stream errors).\n- Upload silent-skip feedback, swallowed IDB write errors, asset-scope narrowing.\n\nNITS (opportunistic / when touching the file): dead .canvas CSS, Rain wrapper div, Info document-vs-window listener, fullscreen debounce, en.ts Translations annotation, settings-open-changed dispatch symmetry. None block anything; clean up as you pass through.\n\nBottom line: the app is healthy and close to release-quality. Knock out the six majors (especially the audioLoop fix + its missing tests, which are coupled), then ship and clear the minors/nits in a follow-up.

## Confirmed issues (23)

- **[MAJOR]** audioLoop play() has no cancellation/in-flight guard — three race conditions converge (audio plays after stop, double source nodes, UI stuck 'on')  
  `src/lib/utils/audioLoop.ts:39-51 (+ Rain/Thunder/Jungle/CampFire toggleX)` — _fix:_ Capture intent at call time: set `playing = true` at the very top of play(); after the two awaits, re-check it is still true and only then build/start the source; in toggleX add an `inflight` guard so a second click is ignored until the first play() promise settles. This single change closes all three races (stop-during-load, double-play, double decode).
- **[MAJOR]** Idle timer auto-hides chrome while Settings panel is open — UI vanishes under the user  
  `src/lib/stores/immersion.ts:161-163` — _fix:_ In onIdle, guard a `settingsOpen` (and Info) store the same way pickerOpen is already guarded, so the 8s immersive collapse cannot fire while Settings/Info is open.
- **[MAJOR]** Escape key does not close the Settings panel (only click-outside does)  
  `src/lib/components/Controls/Settings/index.svelte:18-23 (+ App.svelte:47-50)` — _fix:_ Add an Escape branch to Settings onKeydown: `else if (e.key==='Escape' && isActive){ isActive=false; dispatch settings-open-changed }`, mirroring Info.svelte's handleEscape.
- **[MAJOR]** Videos on external drives / non-$HOME paths silently show a black screen (asset scope + no on:error)  
  `src-tauri/tauri.conf.json:42 (+ Canvas/index.svelte:9-12, Background.svelte:266,447-456)` — _fix:_ Add an `on:error` handler on both <video class="bg-media"> elements that surfaces a localized 'video unavailable' message, and document/relax the asset scope for common video dirs so legitimate picks outside $HOME don't 403 silently.
- **[MAJOR]** aria-hidden="true" on an interactive backdrop <button> violates ARIA 1.2 (axe/Lighthouse critical, WCAG 4.1.2)  
  `src/lib/components/StationPicker/index.svelte:54` — _fix:_ Replace the interactive backdrop <button aria-hidden> with `<div role="presentation" aria-hidden="true" on:click={closePicker}>` — Esc already closes the picker globally (App.svelte:47), so the button is redundant for keyboard/AT.
- **[MAJOR]** Zero test coverage for audioLoop (play/stop/setVolume/isPlaying) — hides the race above  
  `src/lib/utils/audioLoop.ts (no .test.ts)` — _fix:_ Add audioLoop.test.ts with fake timers / mocked AudioContext asserting: double play() yields one source, stop() during in-flight play() leaves playing=false, and isPlaying() tracks correctly. Land this together with the race fix.
- **[MAJOR]** onBackgroundsUpdated reads IndexedDB before the triggering write commits — corrupts in-memory customBackgrounds  
  `src/lib/components/Controls/Settings/Background.svelte:363-366` — _fix:_ const onBackgroundsUpdated = async () => { await loadCustomBackgrounds(); buildAllBackgrounds(); };
- **[MINOR]** Preview panel plays a second concurrent video decode stream when a video background is active  
  `src/lib/components/Controls/Settings/Background.svelte:448-456` — _fix:_ On the preview <video>, drop `autoplay` and use `preload="metadata"` — the live background already plays; the preview only needs a poster frame for the focal marker.
- **[MINOR]** More tab shows stale station list when picker is reopened (no onMount refetch)  
  `src/lib/components/StationPicker/index.svelte:34-37` — _fix:_ Add onMount(() => { if ($pickerTab === 'More') void loadStations(GENRE_TAG[$pickerMoreGenre as Genre], 128); }).
- **[MINOR]** favorites-queue desync: ◀ ▶ navigate a stale frozen snapshot of favorites  
  `src/lib/stores/radio.ts:289, 358-371` — _fix:_ In playNext/playPrev, when the queue originated from favorites, re-read live `get(favorites)` instead of the snapshot frozen at selectStation time (or re-snapshot queue on toggleFavorite).
- **[MINOR]** Arrow keys cycle backgrounds even when a focal-preview/upload/delete button inside Settings has focus  
  `src/lib/components/Controls/Settings/Background.svelte:368-374` — _fix:_ At top of onBgKeydown add: `if ((e.target as HTMLElement)?.closest?.('#settings-box')) return;`.
- **[MINOR]** Focal click maps to wrong coordinates before media metadata loads — bad focal persisted to lofityan.bg-transforms  
  `src/lib/components/Controls/Settings/Background.svelte:377-389` — _fix:_ Add a `metaReady` guard set in onMediaMeta and ignore onFocalClick until it is true.
- **[MINOR]** RadioPlayer retry button title is hardcoded Russian 'Повторить' (bypasses i18n)  
  `src/lib/components/RadioPlayer/index.svelte:29` — _fix:_ import { t } and set title={$t.picker.retry}.
- **[MINOR]** Playback error messages not translated — raw English/DOMException strings shown to non-English users  
  `src/lib/stores/radio.ts:221, 261` — _fix:_ Add a radio error key to all locales and route error.set(...) through $t; for DOMException, map to a generic localized 'stream failed' message rather than the raw browser string.
- **[MINOR]** assetProtocol scope $HOME/** is overly broad (defense-in-depth gap, no current exploit)  
  `src-tauri/tauri.conf.json:42` — _fix:_ Narrow scope to realistic video dirs (e.g. $HOME/Movies/**, $HOME/Downloads/**, $HOME/Desktop/**, $HOME/Videos/**, /Volumes/**) instead of all of $HOME.
- **[MINOR]** saveCustomBackgrounds silently swallows IndexedDB write failures (no await/.catch) — backgrounds can vanish on next launch  
  `src/lib/components/Controls/Settings/Background.svelte:152-154` — _fix:_ await the setItem and surface a localized error on rejection (and await it in the callers/onBackgroundsUpdated).
- **[MINOR]** Oversized / failed image uploads are silently dropped with only console.warn/error — no user feedback  
  `src/lib/components/Controls/Settings/Background.svelte:205, 226` — _fix:_ Add a reactive uploadErrors: string[] rendered below the upload area for skipped/failed files.
- **[NIT]** Settings click-outside close does not dispatch settings-open-changed (latent contract asymmetry, no current consumer)  
  `src/lib/components/Controls/Settings/index.svelte:29-36` — _fix:_ In handleClickOutside, after isActive=false dispatch the same settings-open-changed event toggle() emits.
- **[NIT]** Rain toggle wrapped in a dead anonymous <div>, inconsistent with Thunder/Jungle/CampFire  
  `src/lib/components/Controls/Rain/index.svelte:94,105` — _fix:_ Remove the wrapper <div> so <button> is the template root.
- **[NIT]** Info/About Escape listener bound on document instead of window (harmless inconsistency)  
  `src/lib/components/InfoBox/Info.svelte:43` — _fix:_ Use window.addEventListener/removeEventListener to match every other keydown handler.
- **[NIT]** Fullscreen OS-sync polls isFullscreen() on every onResized event (extra IPC during macOS animation; no dedicated API exists)  
  `src/lib/stores/fullscreen.ts:49` — _fix:_ Debounce the isFullscreen() call ~100ms to coalesce the resize burst; end-state is already correct. No actionable Tauri API change available.
- **[NIT]** en.ts locale not annotated as Translations — en.ts itself is unchecked source of truth (type drift risk)  
  `src/lib/locales/types.ts:1, en.ts:1` — _fix:_ Define an explicit Translations interface and annotate en.ts with it so typos/shape errors in en.ts are caught.
- **[NIT]** Dead CSS on .canvas: background-size/position/repeat never apply (no background-image on element)  
  `src/lib/components/Canvas/index.svelte:28-29` — _fix:_ Remove the vestigial background-repeat/size/position rules; only background-color is active.
