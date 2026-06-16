import { writable, get } from "svelte/store";

export interface VideoBg {
  path: string;
  focalX: number;
  focalY: number;
}

/** When set, a local video plays as the full-screen background. null = image bg. */
export const videoBg = writable<VideoBg | null>(null);

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function setVideoBg(path: string, focalX = 50, focalY = 50): void {
  videoBg.set({ path, focalX: clamp(focalX), focalY: clamp(focalY) });
}

/** Update only the focal point of the current video (no-op if no video). */
export function setFocal(focalX: number, focalY: number): void {
  const cur = get(videoBg);
  if (!cur) return;
  videoBg.set({ ...cur, focalX: clamp(focalX), focalY: clamp(focalY) });
}

export function clearVideoBg(): void {
  videoBg.set(null);
}
