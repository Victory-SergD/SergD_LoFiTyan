// src/lib/stores/volume.ts
import { writable } from "svelte/store";

export interface Volumes {
  master: number;
  effects: Record<string, number>;
}

const STORAGE_KEY = "lofityan.volumes";
const LEGACY_KEY = "Volumes";

const DEFAULT: Volumes = { master: 1, effects: {} };

function load(): Volumes {
  // Prefer the new key.
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<Volumes>;
      return {
        master: typeof parsed.master === "number" ? parsed.master : 1,
        effects: parsed.effects ?? {},
      };
    } catch {
      return { ...DEFAULT };
    }
  }
  // One-time migration from the legacy { rain, thunder, campfire, jungle, main_track } shape.
  const legacyRaw = localStorage.getItem(LEGACY_KEY);
  if (legacyRaw) {
    try {
      const legacy = JSON.parse(legacyRaw) as Record<string, number>;
      const { main_track, ...effects } = legacy;
      return {
        master: typeof main_track === "number" ? main_track : 1,
        effects,
      };
    } catch {
      return { ...DEFAULT };
    }
  }
  return { ...DEFAULT };
}

function persist(v: Volumes): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
}

export const volumes = writable<Volumes>(load());

export function setMaster(v: number): void {
  volumes.update((cur) => {
    const next = { ...cur, master: v };
    persist(next);
    return next;
  });
}

export function setEffectVolume(id: string, v: number): void {
  volumes.update((cur) => {
    const next = { ...cur, effects: { ...cur.effects, [id]: v } };
    persist(next);
    return next;
  });
}
