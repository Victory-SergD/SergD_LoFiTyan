# Background Zoom + Unified Transform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Let the user zoom (scale) AND set the focal point of ANY background — default scene images, custom images, and videos — via a click-on-preview focal point + a zoom slider, clamped so zoom never reveals past the media edges.

**Architecture:** Unify all background rendering into ONE reactive cover layer in Canvas (an `<img>` for images, `<video>` for videos) driven by a `bgMedia` store `{ kind, src, focalX, focalY, scale }`, styled `object-fit: cover; object-position: focalX% focalY%; transform: scale(scale); transform-origin: focalX% focalY%`. `scale` is clamped to `[1, 3]` (1 = cover baseline → always fills → no empty edges). This replaces the old imperative `#bg.style.backgroundImage` writes. Per-background focal+scale persists in a localStorage map keyed by bg id.

**Tech:** Svelte 3, TS, Vitest, Tauri `convertFileSrc` (videos only).

**Baseline:** 77 tests, 0 errors / 0 warnings, build OK, single `main` (`3582148`). Branch: `feat-bg-zoom`.

**Locked with user:** zoom = **slider under the preview**; focal = click-on-preview (already for video → extend to images); applies to video + default + custom images; clamp ≥ cover (no edges).

---

### Task 1: `bgMedia` store + Canvas unified layer + transforms persistence

**Files:** rewrite `src/lib/stores/background.ts` + `background.test.ts`; modify `src/lib/components/Canvas/index.svelte`.

- [ ] **Step 1 — failing tests** for the new store API (below).
- [ ] **Step 2 — `background.ts`:**
```ts
import { writable, get } from "svelte/store";

export type BgKind = "image" | "video";
export interface BgMedia { kind: BgKind; src: string; focalX: number; focalY: number; scale: number; }

export const bgMedia = writable<BgMedia | null>(null);

export const MIN_SCALE = 1;
export const MAX_SCALE = 3;
const clampPct = (n: number) => Math.max(0, Math.min(100, n));
const clampScale = (n: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, n));

/** Show an image or video background. `src` = image URL/dataURL, or (for video) the
 * already-convertFileSrc'd URL — Canvas just sets it on the element. */
export function setBgMedia(kind: BgKind, src: string, focalX = 50, focalY = 50, scale = 1): void {
  bgMedia.set({ kind, src, focalX: clampPct(focalX), focalY: clampPct(focalY), scale: clampScale(scale) });
}
export function setFocal(focalX: number, focalY: number): void {
  const cur = get(bgMedia); if (!cur) return;
  bgMedia.set({ ...cur, focalX: clampPct(focalX), focalY: clampPct(focalY) });
}
export function setScale(scale: number): void {
  const cur = get(bgMedia); if (!cur) return;
  bgMedia.set({ ...cur, scale: clampScale(scale) });
}

// ---- per-background transform persistence (focal + scale by bg id) ----
const TKEY = "lofityan.bg-transforms";
export interface Transform { focalX: number; focalY: number; scale: number; }
type TMap = Record<string, Transform>;
function loadMap(): TMap { try { return JSON.parse(localStorage.getItem(TKEY) || "{}"); } catch { return {}; } }
export function getTransform(id: string): Transform { return loadMap()[id] ?? { focalX: 50, focalY: 50, scale: 1 }; }
export function saveTransform(id: string, t: Transform): void {
  const m = loadMap();
  m[id] = { focalX: clampPct(t.focalX), focalY: clampPct(t.focalY), scale: clampScale(t.scale) };
  localStorage.setItem(TKEY, JSON.stringify(m));
}
```
Tests: `bgMedia` starts null; `setBgMedia("image","u")` → `{kind:"image",src:"u",focalX:50,focalY:50,scale:1}`; `setBgMedia("video","p",10,90,5)` clamps scale to 3; `setFocal(120,-1)` clamps to 100/0 (keeps kind/src/scale); `setScale(0.2)` clamps to 1, `setScale(9)` clamps to 3, no-op when null; `saveTransform("x",{focalX:10,focalY:20,scale:2})` then `getTransform("x")` returns it, `getTransform("absent")` returns 50/50/1.
- [ ] **Step 3 — Canvas:** render the unified layer. In `Canvas/index.svelte`, import `bgMedia`. Inside `#bg`, before `<slot/>`:
```svelte
  {#if $bgMedia}
    {#if $bgMedia.kind === "video"}
      <video class="bg-media" src={$bgMedia.src}
        style="object-position:{$bgMedia.focalX}% {$bgMedia.focalY}%; transform:scale({$bgMedia.scale}); transform-origin:{$bgMedia.focalX}% {$bgMedia.focalY}%"
        autoplay loop muted playsinline></video>
    {:else}
      <img class="bg-media" src={$bgMedia.src} alt=""
        style="object-position:{$bgMedia.focalX}% {$bgMedia.focalY}%; transform:scale({$bgMedia.scale}); transform-origin:{$bgMedia.focalX}% {$bgMedia.focalY}%" />
    {/if}
  {/if}
```
CSS: `.bg-media{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}`. (The `#bg` div stays as the container; its old `background-image` is no longer used once everything routes through `bgMedia`, but leave the `#bg` element + `background-color` fallback.) Keep the existing `<video class="bg-video">` block ONLY if needed — actually REMOVE the old `videoBg`/`bg-video` block; this replaces it.

> NOTE: this Task removes `videoBg`/`setVideoBg`/`clearVideoBg`. Task 2 updates all callers (Background.svelte, App.svelte) to the new API. Between tasks `pnpm check` may show errors in those two files — that's the Task 2 to-do; keep Task 1's own files green and note it.

- [ ] **Step 4 — commit:** `feat(bg): unified bgMedia store (image+video) with focal + scale + Canvas layer`.

---

### Task 2: Route all backgrounds through the store + zoom slider + focal-click for all

**Files:** `src/lib/components/Controls/Settings/Background.svelte`, `src/App.svelte`, locales.

- [ ] **Step 1 — apply via store.** Replace every `#bg.style.backgroundImage = ...` and the old `setVideoBg/clearVideoBg` usage with `setBgMedia(...)`:
  - default image id N: `const t = getTransform("default_"+N); setBgMedia("image", "assets/background/bg"+N+".webp", t.focalX, t.focalY, t.scale);`
  - custom image item: `const t = getTransform(item.id); setBgMedia("image", item.dataUrl, t.focalX, t.focalY, t.scale);`
  - video item: `const t = getTransform(item.id); setBgMedia("video", convertFileSrc(item.path), t.focalX, t.focalY, t.scale);` (apply `convertFileSrc` here; or pass path and convert in Canvas — pick one and be consistent; applying here keeps Canvas dumb).
  Update `applyBackground`, `applyCurrentBackground`, `nextBg`, `prevBg`, `selectCustomBackground`, `addVideo`, delete-fallback, and App.svelte onMount restore to use this. There is no more `clearVideoBg()` — setting a new `bgMedia` replaces whatever was shown.
- [ ] **Step 2 — bg id helper.** Use a stable id per background: `default_${N}` for defaults, the item `id` for customs/videos. Persist focal+scale under that id via `saveTransform`.
- [ ] **Step 3 — preview = focal picker for ALL backgrounds.** The carousel preview becomes a clickable focal picker for images too (not just videos). For images use the `<img>` (natural box); for videos the aspect-matched `<video>` (as before). On click compute focal % from the rect, `saveTransform(curId, {...})`, and `setFocal(fx,fy)` for live update. Show the focal `.focal-marker`.
- [ ] **Step 4 — zoom slider.** Under the preview, add `<input type="range" min={MIN_SCALE} max={MAX_SCALE} step="0.05" value={curScale} on:input={onZoom}>` with a `data-tooltip={$t.settings.background.zoom_hint}`. `onZoom`: `setScale(v); saveTransform(curId, {focalX,focalY,scale:v})`. Show the slider for both images and videos.
- [ ] **Step 5 — locales:** add `zoom_hint` to all 7 `settings.background` (en `'Zoom the background (it stays edge-to-edge)'`, ru `'Масштаб фона (без пустых полей по краям)'`).
- [ ] **Step 6 — verify green; commit:** `feat(bg): zoom slider + focal-click for all backgrounds (unified transform)`.

---

### Task 3: Verify + docs + merge
- [ ] Full gate (test/check/build). Browser regression smoke: default bg switching still works, custom image still works, zoom slider + focal click update the live bg, no console errors. Code review (opus) of the diff. Real-window by user (video zoom + image zoom + persistence + orientation). README + handoff. Merge to `main`, delete branch.

---

## Self-review
- Zoom works on video + default + custom images (unified layer). Clamp `[1,3]` → never reveals edges. ✓
- Focal-click + zoom-slider persist per bg id (localStorage map). ✓
- Old `videoBg` fully replaced by `bgMedia`; all callers updated (Task 2) so no dangling refs. ✓
- Image flow not lost — routed through the same store; verified by browser regression + review. ✓
