// src/lib/stores/radio.ts
//
// The RADIO core for LoFiTyan. Single owner of ONE HTMLAudioElement, fetching
// real lofi stations from radio-browser.info and playing them. Mirrors the
// injectable-audio-factory pattern from ./atmosphere.ts so all state
// transitions are unit-testable without real network or audio.
import { writable, get } from "svelte/store";
import { volumes } from "./volume";

export interface RadioStation {
  id: string;
  name: string;
  url: string;
  favicon: string;
  codec: string;
  bitrate: number;
  tags: string;
}

// ---- public reactive state ----
export const stations = writable<RadioStation[]>([]);
export const current = writable<RadioStation | null>(null);
export const isPlaying = writable<boolean>(false);
export const loading = writable<boolean>(false);
export const error = writable<string | null>(null);
export const buffering = writable<boolean>(false);

// Keep at most this many stations after filtering.
const MAX_STATIONS = 40;

// Shape of a single station as returned by the radio-browser.info API. Only the
// fields we map are declared; the API returns many more.
interface ApiStation {
  stationuuid: string;
  name: string;
  url_resolved: string;
  favicon: string;
  codec: string;
  bitrate: number;
  tags: string;
}

/**
 * Fetch lofi stations for `tag`, filter to playable/safe https streams, dedupe
 * by lowercased name, and store at most MAX_STATIONS of them. On error the
 * existing `stations` are left untouched and the message is surfaced in `error`.
 */
export async function loadStations(tag = "lofi"): Promise<void> {
  loading.set(true);
  error.set(null);
  // `all.api.radio-browser.info` round-robins the community mirror pool, so we
  // don't pin a single (possibly down) server. The CSP wildcard
  // `https://*.api.radio-browser.info` covers whichever mirror it resolves to.
  const endpoint =
    `https://all.api.radio-browser.info/json/stations/bytag/${encodeURIComponent(tag)}` +
    `?hidebroken=true&order=clickcount&reverse=true&limit=80`;
  try {
    const res = await fetch(endpoint, {
      headers: { "User-Agent": "LoFiTyan/1.0" },
    });
    if (!res.ok) {
      throw new Error(`radio-browser responded ${res.status}`);
    }
    const raw = (await res.json()) as ApiStation[];
    stations.set(parseStations(raw));
  } catch (e) {
    error.set(e instanceof Error ? e.message : String(e));
  } finally {
    loading.set(false);
  }
}

/**
 * Pure mapper/filter (unit-tested in isolation). Keeps only stations whose
 * `url_resolved` is a non-empty https URL (http would be blocked as mixed
 * content in the Tauri webview), dedupes by lowercased name, and caps the count.
 */
export function parseStations(raw: ApiStation[]): RadioStation[] {
  const seen = new Set<string>();
  const out: RadioStation[] = [];
  for (const s of raw ?? []) {
    const url = (s?.url_resolved ?? "").trim();
    if (!url.toLowerCase().startsWith("https://")) continue;
    const name = (s?.name ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: s.stationuuid,
      name,
      url,
      favicon: s.favicon ?? "",
      codec: s.codec ?? "",
      bitrate: s.bitrate ?? 0,
      tags: s.tags ?? "",
    });
    if (out.length >= MAX_STATIONS) break;
  }
  return out;
}

// ---- audio side-effect (injectable for tests) ----
type AudioFactory = (url: string) => HTMLAudioElement;
let audioFactory: AudioFactory = (url) => new Audio(url);
export function setAudioFactory(fn: AudioFactory): void {
  audioFactory = fn;
}

// Single owner of the live HTMLAudioElement. There is at most one radio stream
// playing at any time, so one element is created lazily and reused.
let audio: HTMLAudioElement | null = null;

// Live master volume from the volume store — mirrors how the weather effects
// read `volumes.master`. The current value is cached so playback started before
// the first subscription tick still applies the right level, and the live
// audio element is updated whenever master changes.
let masterVolume = get(volumes).master ?? 1;
volumes.subscribe((v) => {
  masterVolume = v.master ?? 1;
  if (audio) {
    audio.volume = masterVolume;
  }
});

function ensureAudio(): HTMLAudioElement {
  if (!audio) {
    audio = audioFactory("");
    audio.volume = masterVolume;
    audio.addEventListener("error", () => {
      // A station that fails to load/decode. Keep it simple: surface the error
      // and stop, without auto-advancing.
      error.set("Stream failed to play");
      isPlaying.set(false);
      buffering.set(false);
    });
    audio.addEventListener("waiting", () => buffering.set(true));
    audio.addEventListener("playing", () => buffering.set(false));
    audio.addEventListener("canplay", () => buffering.set(false));
  }
  return audio;
}

/**
 * Point the single audio element at `station`, start playback, and reflect the
 * result in `current` / `isPlaying`. `isPlaying` flips true only once play()
 * resolves; a rejected play() leaves it false and records the error.
 */
export async function play(station: RadioStation): Promise<void> {
  const el = ensureAudio();
  current.set(station);
  error.set(null);
  buffering.set(true);
  el.src = station.url;
  el.volume = masterVolume;
  try {
    await el.play();
    isPlaying.set(true);
  } catch (e) {
    isPlaying.set(false);
    buffering.set(false);
    error.set(e instanceof Error ? e.message : String(e));
  }
}

/** Pause the current stream. Leaves `current` intact so it can be resumed. */
export function pause(): void {
  if (audio) {
    audio.pause();
  }
  isPlaying.set(false);
  buffering.set(false);
}

/**
 * Toggle playback. With a current station, pause/resume it. With no current
 * station, start the first available station (or do nothing if none loaded).
 */
export function togglePlay(): void {
  const cur = get(current);
  if (cur) {
    if (get(isPlaying)) {
      pause();
    } else {
      void play(cur);
    }
    return;
  }
  const list = get(stations);
  if (list.length > 0) {
    void play(list[0]);
  }
}

// Resolve the index of `current` within `stations`, or -1 if absent.
function currentIndex(list: RadioStation[]): number {
  const cur = get(current);
  if (!cur) return -1;
  return list.findIndex((s) => s.id === cur.id);
}

/** Advance to the next station, wrapping around. No-op with no stations. */
export function playNext(): void {
  const list = get(stations);
  if (list.length === 0) return;
  const idx = currentIndex(list);
  const next = list[(idx + 1) % list.length];
  void play(next);
}

/** Step to the previous station, wrapping around. No-op with no stations. */
export function playPrev(): void {
  const list = get(stations);
  if (list.length === 0) return;
  const idx = currentIndex(list);
  // From "no current" (-1) prev should land on the last station.
  const base = idx < 0 ? 0 : idx;
  const prev = list[(base - 1 + list.length) % list.length];
  void play(prev);
}
