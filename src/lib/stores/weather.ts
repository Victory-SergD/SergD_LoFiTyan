import { writable } from "svelte/store";

/**
 * Shared weather-visual state. The effect BUTTON lives in the controls dock
 * (inside `.chrome`, fades with the chrome), but the full-screen weather VISUAL
 * is rendered as an ambiance layer OUTSIDE `.chrome` so it stays visible in
 * immersive mode — like the character/Canvas (BUG C). The Rain control writes
 * `rainActive`; the ambiance layer reads it.
 */
export const rainActive = writable<boolean>(false);
