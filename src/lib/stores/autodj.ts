// src/lib/stores/autodj.ts
import { writable } from "svelte/store";

export type AutoDjMode = "MUSIC" | "ATMOSPHERE" | "WORLD" | "MANUAL";

const KEY = "lofityan.autoDjMode";
const LEGACY_KEY = "AutoDJMode";
const VALID: AutoDjMode[] = ["MUSIC", "ATMOSPHERE", "WORLD", "MANUAL"];

function isValid(v: string | null): v is AutoDjMode {
  return v !== null && (VALID as string[]).includes(v);
}

function loadInitial(): AutoDjMode {
  const fromNew = localStorage.getItem(KEY);
  if (isValid(fromNew)) return fromNew;
  const fromLegacy = localStorage.getItem(LEGACY_KEY);
  if (isValid(fromLegacy)) return fromLegacy;
  return "MUSIC";
}

export const autoDjMode = writable<AutoDjMode>(loadInitial());

export function setAutoDjMode(m: AutoDjMode): void {
  autoDjMode.set(m);
  localStorage.setItem(KEY, m);
}
