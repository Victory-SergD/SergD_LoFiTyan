# Live Video Backgrounds — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Let the user set a local video file as a live background (native, persists, handles 4K), with a **click-on-preview focal point** so the subject stays centered on any monitor orientation. Atmosphere effects keep layering on top.

**Architecture:** Tauri-native. A file-picker dialog returns the video's PATH; we store the path (+ focal point), render it via `convertFileSrc` + the Tauri asset protocol in a `<video>` layer (`object-fit: cover; object-position: focalX% focalY%`). The focal point is chosen by clicking a full-frame preview. Image backgrounds keep working exactly as today.

**Tech Stack:** Tauri 2 (`@tauri-apps/plugin-dialog`, asset protocol, `@tauri-apps/api/core convertFileSrc`), Svelte 3, TS, Vitest.

**Baseline:** 71 tests green, 0 errors / 0 warnings, build OK, single `main` (`2549538`). Branch: `feat-video-backgrounds` (merge to main, delete after). NOTE: video playback / dialog / asset protocol only work in the REAL Tauri app — final verification is `pnpm tauri:d` (Rust rebuilds once).

**Scope locked with user:** native path; focal point via **click-on-preview** (not sliders); tooltips on new controls (production polish — this ships to GitHub for others). OUT for now: quality gating, bundled default videos, drag (click is enough).

---

### Task 0: Branch + Tauri plumbing (dialog plugin + asset protocol)

**Files:** `package.json`, `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/capabilities/migrated.json`, `src-tauri/tauri.conf.json`.

- [ ] **Step 1 — branch:** `cd /Users/wsgp/SergD_LoFi/lofi-engine && env -u GITHUB_TOKEN git checkout -b feat-video-backgrounds`.
- [ ] **Step 2 — JS dep:** add `"@tauri-apps/plugin-dialog": "~2"` to `package.json` dependencies; `pnpm install`.
- [ ] **Step 3 — Rust dep:** in `src-tauri/Cargo.toml` `[dependencies]`, add `tauri-plugin-dialog = "2"`.
- [ ] **Step 4 — register plugin:** in `src-tauri/src/lib.rs`, add `.plugin(tauri_plugin_dialog::init())` to the builder chain (next to `tauri_plugin_shell::init()`).
- [ ] **Step 5 — capability:** in `src-tauri/capabilities/migrated.json` `permissions`, add `"dialog:allow-open"`.
- [ ] **Step 6 — asset protocol:** in `src-tauri/tauri.conf.json`, under `app.security`, add a sibling to `csp`:
```json
"assetProtocol": { "enable": true, "scope": ["$HOME/**"] }
```
(The CSP already allows `media-src asset: https://asset.localhost` and `img-src asset:`, so no CSP change is needed.)
- [ ] **Step 7 — verify:** `pnpm check 2>&1 | tail -2` (0 errors) and `pnpm test 2>&1 | tail -3` (71 pass). Then attempt `cd src-tauri && cargo check 2>&1 | tail -15` with a long timeout — if it compiles, great; if it's too slow to finish in the sandbox, note that and rely on the user's `pnpm tauri:d`. Do NOT block on a slow cargo build.
- [ ] **Step 8 — commit:** `chore(tauri): add dialog plugin + asset protocol for video backgrounds`.

---

### Task 1: Video-background store + Canvas `<video>` layer

**Files:** Create `src/lib/stores/background.ts` + `background.test.ts`; modify `src/lib/components/Canvas/index.svelte`.

- [ ] **Step 1 — failing tests** in `background.test.ts`: `videoBg` starts null; `setVideoBg(path, x, y)` sets `{path, focalX, focalY}`; `setFocal(x, y)` clamps to 0–100 and updates focalX/Y; `clearVideoBg()` → null.
- [ ] **Step 2 — implement `background.ts`:**
```ts
import { writable, get } from "svelte/store";
export interface VideoBg { path: string; focalX: number; focalY: number; }
export const videoBg = writable<VideoBg | null>(null);
const clamp = (n: number) => Math.max(0, Math.min(100, n));
export function setVideoBg(path: string, focalX = 50, focalY = 50): void {
  videoBg.set({ path, focalX: clamp(focalX), focalY: clamp(focalY) });
}
export function setFocal(focalX: number, focalY: number): void {
  const cur = get(videoBg);
  if (!cur) return;
  videoBg.set({ ...cur, focalX: clamp(focalX), focalY: clamp(focalY) });
}
export function clearVideoBg(): void { videoBg.set(null); }
```
- [ ] **Step 3 — Canvas renders the video layer.** In `Canvas/index.svelte`, import `videoBg` and `convertFileSrc` from `@tauri-apps/api/core`. Inside `#bg` (before `<slot/>`), add:
```svelte
{#if $videoBg}
  <video
    class="bg-video"
    src={convertFileSrc($videoBg.path)}
    style="object-position: {$videoBg.focalX}% {$videoBg.focalY}%"
    autoplay loop muted playsinline
  ></video>
{/if}
```
CSS: `.bg-video { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:0; }` (the div's `background-image` shows through only when no video). (`convertFileSrc` is a pure URL builder — safe to import; it just won't resolve outside Tauri, which is fine since `videoBg` is only set in the real app.)
- [ ] **Step 4 — verify green; Step 5 — commit:** `feat(bg): video-background store + Canvas video layer`.

---

### Task 2: Background settings — Add Video + click-on-preview focal picker

**Files:** `src/lib/components/Controls/Settings/Background.svelte`; `src/App.svelte`; locales (new strings).

Custom backgrounds (localDB `custom-backgrounds`) currently hold images `{id, name, dataUrl, type}`. Extend to also hold videos `{id, name, kind:'video', path, focalX, focalY}`. Treat existing items (no `kind`) as images.

- [ ] **Step 1 — "Add video" button.** Next to the image upload `+`, add a video button (`IconVideo` or `IconMovie`) with `data-tooltip={$t.settings.background.add_video}`. On click, call an async `addVideo()`:
```ts
import { open } from "@tauri-apps/plugin-dialog";
async function addVideo() {
  const path = await open({ multiple: false, filters: [{ name: "Video", extensions: ["mp4", "webm", "mov", "m4v"] }] });
  if (typeof path !== "string") return;
  const name = path.split("/").pop() ?? "video";
  const item = { id: `video_${Date.now()}`, name, kind: "video", path, focalX: 50, focalY: 50 };
  customBackgrounds.push(item);
  saveCustomBackgrounds();
  buildAllBackgrounds();
  selectVideoBackground(item);
}
```
- [ ] **Step 2 — selecting a video** sets the live store + persists the choice:
```ts
function selectVideoBackground(item) {
  setVideoBg(item.path, item.focalX, item.focalY);     // from stores/background
  bgType = "custom"; customBgId = item.id;
  localStorage.setItem("bg-type", "custom");
  localStorage.setItem("custom-bg-id", item.id);
}
```
And selecting/applying an IMAGE must `clearVideoBg()` first (so the video layer disappears). Add `clearVideoBg()` to `applyBackground` for the default/image paths.
- [ ] **Step 3 — carousel preview = focal picker for videos.** When the current background item is a video, render the preview as a full-frame clickable picker instead of `<img>`:
```svelte
{#if currentBg.kind === "video"}
  <div class="video-preview" data-tooltip={$t.settings.background.focal_hint}
       style="aspect-ratio: {vidW}/{vidH}" on:click={onFocalClick} role="presentation">
    <video bind:this={previewEl} src={convertFileSrc(currentBg.path)}
           on:loadedmetadata={() => { vidW = previewEl.videoWidth; vidH = previewEl.videoHeight; }}
           autoplay loop muted playsinline></video>
    <span class="focal-marker" style="left: {currentBg.focalX}%; top: {currentBg.focalY}%"></span>
  </div>
{:else}
  ...existing <img> preview...
{/if}
```
`onFocalClick(e)`: compute `focalX = round(e.offsetX / el.clientWidth * 100)`, `focalY = round(e.offsetY / el.clientHeight * 100)` (clamp 0–100); update the item's focalX/Y, persist (`saveCustomBackgrounds()`), and call `setFocal(focalX, focalY)` so the REAL background re-centers live. The marker (a small ring) sits at `left:focalX% top:focalY%`. Because the preview box matches the video's aspect ratio, `object-fit:contain` fills it exactly so the click maps 1:1 to the video frame. CSS: `.video-preview{position:relative;width:200px;cursor:crosshair;border-radius:7px;overflow:hidden} .video-preview video{width:100%;height:100%;display:block;object-fit:contain} .focal-marker{position:absolute;width:18px;height:18px;border:2px solid #fff;border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 0 0 2px rgba(0,0,0,.4);pointer-events:none}`.
- [ ] **Step 4 — buildAllBackgrounds / delete** include video items (delete a video = remove from list + if it was current, `clearVideoBg()` + fall back to default bg1). `data-tooltip` on the delete button already exists.
- [ ] **Step 5 — App.svelte restore.** In `onMount`, the bg restore branch: if the restored custom item is a video (`kind === 'video'`), call `setVideoBg(path, focalX, focalY)` instead of setting `background-image`. (Read the saved item from localDB by `custom-bg-id`.)
- [ ] **Step 6 — locales.** Add to all 7 `settings.background`: `add_video` (en `'Add a video background'`, ru `'Добавить видео-фон'`), `focal_hint` (en `'Click where to keep centered when cropped to your screen'`, ru `'Кликни, где держать центр кадра при обрезке под экран'`).
- [ ] **Step 7 — verify green; Step 8 — commit:** `feat(bg): add-video + click-on-preview focal point + tooltips`.

---

### Task 3: Verify + docs

- [ ] Full gate: `pnpm test && pnpm check && pnpm build`.
- [ ] Browser smoke (limited — video/dialog need Tauri): confirm the Settings UI renders, the image flow still works, no console errors, the store wiring is sound.
- [ ] **Real-window (user):** `pnpm tauri:d` → Settings → Add video → pick the 4K mp4 → it plays as the background → click the preview where the girl is → background re-centers → resize/rotate to vertical keeps her centered → restart → it persists.
- [ ] README + handoff: add live video backgrounds (native, focal point) to features; mark the backlog item done.
- [ ] Commit: `docs: live video backgrounds shipped`.

---

## Self-review
- Native path (dialog→path→asset→`<video>`), focal via click-on-preview (full-frame, aspect-matched box → 1:1 click mapping), persists (path+focal in localDB), both orientations (cover + object-position). ✓
- Image backgrounds untouched; video layer is additive; `clearVideoBg()` on image-select prevents a stuck video. ✓
- Tauri-only pieces guarded; store logic unit-tested; real playback verified in the actual app. ✓
