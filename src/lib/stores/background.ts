import { writable, get } from "svelte/store";

export type BgKind = "image" | "video";
export interface BgMedia { kind: BgKind; src: string; focalX: number; focalY: number; scale: number; }

/** The single source of truth for the background layer. `src` is the FINAL url the
 * element uses (an image URL/dataURL, or a video URL already passed through
 * convertFileSrc by the caller). */
export const bgMedia = writable<BgMedia | null>(null);

export const MIN_SCALE = 1;
export const MAX_SCALE = 3;
const clampPct = (n: number) => Math.max(0, Math.min(100, n));
const clampScale = (n: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, n));

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

// ---- per-background transform persistence (focal + scale, keyed by bg id) ----
const TKEY = "lofityan.bg-transforms";
export interface Transform { focalX: number; focalY: number; scale: number; }
function loadMap(): Record<string, Transform> {
  try { return JSON.parse(localStorage.getItem(TKEY) || "{}") as Record<string, Transform>; } catch { return {}; }
}
export function getTransform(id: string): Transform {
  return loadMap()[id] ?? { focalX: 50, focalY: 50, scale: 1 };
}
export function hasTransform(id: string): boolean { return id in loadMap(); }
export function saveTransform(id: string, t: Transform): void {
  const m = loadMap();
  m[id] = { focalX: clampPct(t.focalX), focalY: clampPct(t.focalY), scale: clampScale(t.scale) };
  localStorage.setItem(TKEY, JSON.stringify(m));
}
