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

export type Genre = "Lo-Fi" | "Chillhop" | "Focus" | "Sleep";
export const GENRES: Genre[] = ["Lo-Fi", "Chillhop", "Focus", "Sleep"];
// radio-browser tag used for each genre's "More" tab
export const GENRE_TAG: Record<Genre, string> = {
  "Lo-Fi": "lofi",
  "Chillhop": "chillhop",
  "Focus": "study",
  "Sleep": "sleep",
};
// Curated, hand-verified HQ stations (alive + HTTPS on 2026-06-16). favicon ""
// -> the picker shows a default icon. These ship in-app, work even if the API is down.
export const SEED: Record<Genre, RadioStation[]> = {
  "Lo-Fi": [
    { id: "reyfm-lofi", name: "REYFM #LOFI", url: "https://listen.reyfm.de/lofi_320kbps.mp3", favicon: "", codec: "MP3", bitrate: 320, tags: "lofi" },
    { id: "ilm-chillhop", name: "I ♥ Chillhop", url: "https://ilm.stream35.radiohost.de/ilm_ilovechillhop_mp3-192", favicon: "", codec: "MP3", bitrate: 192, tags: "lofi,chillhop" },
    { id: "loficafe-chilling", name: "Lofi Cafe · Chilling", url: "https://radio.loficafe.net/listen/chilling/radio.mp3", favicon: "", codec: "MP3", bitrate: 192, tags: "lofi" },
    { id: "nia-lofi", name: "NIA Radio Lo-Fi", url: "https://radio.nia.nc/radio/8020/lofi-hq-stream.aac", favicon: "", codec: "AAC", bitrate: 128, tags: "lofi" },
    { id: "loficafe-gaming", name: "Lofi Cafe · Gaming", url: "https://radio.loficafe.net/listen/gaming/radio.mp3", favicon: "", codec: "MP3", bitrate: 192, tags: "lofi" },
  ],
  "Chillhop": [
    { id: "radio-acid", name: "Radio ACID · Chill", url: "https://stream.radioacid.com/stream", favicon: "", codec: "MP3", bitrate: 256, tags: "chillhop" },
    { id: "loficafe-working", name: "Lofi Cafe · Working", url: "https://radio.loficafe.net/listen/working/radio.mp3", favicon: "", codec: "MP3", bitrate: 192, tags: "chillhop" },
    { id: "fmv-fit-focus", name: "FMV FIT · Focus", url: "https://radio.webicdp.com/listen/fmvfitradiofocus/radio.mp3", favicon: "", codec: "MP3", bitrate: 192, tags: "chillhop" },
  ],
  "Focus": [
    { id: "loficafe-studying", name: "Lofi Cafe · Studying", url: "https://radio.loficafe.net/listen/studying/radio.mp3", favicon: "", codec: "MP3", bitrate: 192, tags: "study" },
    { id: "rautemusik-study", name: "rautemusik STUDY", url: "https://study-high.rautemusik.fm/", favicon: "", codec: "MP3", bitrate: 192, tags: "study" },
  ],
  "Sleep": [
    { id: "loficafe-sleeping", name: "Lofi Cafe · Sleeping", url: "https://radio.loficafe.net/listen/sleeping/radio.mp3", favicon: "", codec: "MP3", bitrate: 192, tags: "sleep" },
    { id: "asp", name: "Ambient Sleeping Pill", url: "https://radio.stereoscenic.com/asp-s", favicon: "", codec: "MP3", bitrate: 128, tags: "sleep,ambient" },
    { id: "spokoynoe", name: "Спокойное радио", url: "https://listen9.myradio24.com/6262", favicon: "", codec: "MP3", bitrate: 128, tags: "sleep,calm" },
    { id: "abc-lounge", name: "ABC Lounge", url: "https://eu1.fastcast4u.com/proxy/kpmxz?mp=/1", favicon: "", codec: "MP3", bitrate: 128, tags: "lounge,chill" },
  ],
};

// ---- queue source ----
export type QueueSource = "seed" | "favorites" | "more";
export const queueSource = writable<QueueSource>("seed");

// ---- public reactive state ----
export const stations = writable<RadioStation[]>([]);
export const current = writable<RadioStation | null>(null);
export const isPlaying = writable<boolean>(false);
export const error = writable<string | null>(null);
export const buffering = writable<boolean>(false);
// Station-list fetch state (radio-browser "More" tab). Separate from playback
// state so a slow/failed list fetch never clobbers the now-playing label.
export const listLoading = writable<boolean>(false);
export const listError = writable<string | null>(null);

// ---- favorites (persisted) ----
const FAV_KEY = "lofityan.favorites";
function loadFavorites(): RadioStation[] {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return raw ? (JSON.parse(raw) as RadioStation[]) : [];
  } catch {
    return [];
  }
}
export const favorites = writable<RadioStation[]>(loadFavorites());
export function isFavorite(id: string): boolean {
  return get(favorites).some((f) => f.id === id);
}
export function toggleFavorite(s: RadioStation): void {
  favorites.update((list) => {
    const next = list.some((f) => f.id === s.id)
      ? list.filter((f) => f.id !== s.id)
      : [...list, s];
    localStorage.setItem(FAV_KEY, JSON.stringify(next));
    return next;
  });
}

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

// Community API mirrors, tried in order until one answers. `all.api` round-robins
// the whole pool but can land on a dead/slow node; the named mirrors are stable
// fallbacks. Trying several means a single bad mirror or a transient blip at
// startup no longer leaves the app stuck on "Load failed". All hosts match the
// CSP wildcard `https://*.api.radio-browser.info`.
const API_MIRRORS = [
  "https://de1.api.radio-browser.info",
  "https://de2.api.radio-browser.info",
  "https://nl1.api.radio-browser.info",
  "https://at1.api.radio-browser.info",
  "https://all.api.radio-browser.info",
];

/**
 * Fetch lofi stations for `tag`, filter to playable/safe https streams, dedupe
 * by lowercased name, and store at most MAX_STATIONS of them. Tries each mirror
 * in turn and stops at the first success. Only if EVERY mirror fails are the
 * existing `stations` left untouched and the last error surfaced in `error`.
 */
export async function loadStations(tag = "lofi", bitrateMin = 0): Promise<void> {
  const seq = ++loadSeq;
  listLoading.set(true);
  listError.set(null);
  const path =
    `/json/stations/bytag/${encodeURIComponent(tag)}` +
    `?hidebroken=true&order=clickcount&reverse=true&limit=80` +
    (bitrateMin > 0 ? `&bitrateMin=${bitrateMin}` : "");
  let lastError: unknown = new Error("no radio mirror reachable");
  for (const base of API_MIRRORS) {
    try {
      // Plain GET, no custom headers: this stays a "simple" CORS request (the API
      // sends `Access-Control-Allow-Origin: *`), so the system webview never has
      // to deal with a preflight. A `User-Agent` header would be dropped by the
      // webview anyway, so it bought us nothing and only added risk.
      const res = await fetch(base + path);
      if (!res.ok) {
        lastError = new Error(`radio-browser responded ${res.status}`);
        continue;
      }
      const raw = (await res.json()) as ApiStation[];
      if (seq !== loadSeq) return; // superseded by a newer load
      stations.set(parseStations(raw));
      listLoading.set(false);
      return;
    } catch (e) {
      lastError = e;
      continue; // try the next mirror
    }
  }
  if (seq !== loadSeq) return;
  listError.set(lastError instanceof Error ? lastError.message : String(lastError));
  listLoading.set(false);
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
let loadSeq = 0;
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
      error.set("stream-failed");
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
    // Switching stations changes `el.src` mid-load, so the webview rejects the
    // previous in-flight play() with an AbortError ("The operation was aborted").
    // That's not a real failure — the newer station is the one playing — so we
    // ignore it instead of flashing a bogus error over music that's actually fine.
    // NB: a play() rejection is a DOMException, which is NOT `instanceof Error` in
    // every engine, so match on the `name`/message rather than the Error type.
    const name = (e as { name?: string } | null)?.name;
    const msg = e instanceof Error ? e.message : String(e);
    if (name === "AbortError" || /abort/i.test(msg)) {
      return;
    }
    isPlaying.set(false);
    buffering.set(false);
    error.set("stream-failed");
  }
}

const LAST_KEY = "lofityan.last-station";

/**
 * The list the current station belongs to, so ◀ ▶ step through it — a genre's
 * seed, the favorites, or the radio-browser "More" results, whichever the
 * station was picked from.
 */
export const queue = writable<RadioStation[]>([]);

// Find the seed-genre list that contains `s` (so restored/last stations get a
// sensible ◀ ▶ queue), or null if it's not a seed station.
function seedGenreOf(s: RadioStation): RadioStation[] | null {
  for (const g of GENRES) {
    if (SEED[g].some((x) => x.id === s.id)) return SEED[g];
  }
  return null;
}

/**
 * Play a station and remember it as the last-played for next launch. Pass the
 * `list` it was picked from to drive ◀ ▶ navigation; omit it to keep the
 * current queue (used by playNext/playPrev themselves).
 */
export function selectStation(s: RadioStation, list?: RadioStation[], source: QueueSource = "seed"): void {
  if (list && list.length) {
    queue.set(list);
    queueSource.set(source);
  }
  // Re-selecting the current station intentionally restarts playback — this is
  // the primary recovery path for a stalled stream. play() already swallows the
  // resulting AbortError so there is no bogus error flash.
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(s));
  } catch {
    /* ignore persistence failure */
  }
  void play(s);
}

/** Restore the last-played station (paused) on launch. No network, no autoplay. */
export function initRadio(): void {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    if (!raw) return;
    const s = JSON.parse(raw) as RadioStation;
    if (s && typeof s.url === "string" && s.url.startsWith("https://")) {
      current.set(s);
      // Seed the ◀ ▶ queue with the genre the restored station belongs to, so
      // the arrows work immediately on launch without opening the picker.
      queue.set(seedGenreOf(s) ?? [s]);
    }
  } catch {
    /* ignore */
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
    selectStation(list[0], list);
    return;
  }
  selectStation(SEED["Lo-Fi"][0], SEED["Lo-Fi"]);
}

// Resolve the index of `current` within `list`, or -1 if absent.
function currentIndex(list: RadioStation[]): number {
  const cur = get(current);
  if (!cur) return -1;
  return list.findIndex((s) => s.id === cur.id);
}

/** Advance to the next station within the active queue, wrapping around. */
export function playNext(): void {
  const list = get(queueSource) === "favorites" ? get(favorites) : get(queue);
  if (list.length === 0) return;
  const idx = currentIndex(list);
  selectStation(list[(idx + 1) % list.length]); // no list arg -> keeps the queue
}

/** Step to the previous station within the active queue, wrapping around. */
export function playPrev(): void {
  const list = get(queueSource) === "favorites" ? get(favorites) : get(queue);
  if (list.length === 0) return;
  const idx = currentIndex(list);
  // From "no current" (-1) prev should land on the last station.
  const base = idx < 0 ? 0 : idx;
  selectStation(list[(base - 1 + list.length) % list.length]); // keeps the queue
}
