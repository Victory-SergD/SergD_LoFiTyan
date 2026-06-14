// src/lib/stores/atmosphere.ts
import { writable, get } from "svelte/store";

export interface AtmoLayer {
  id: string;
  name: string;
  src: string;
  isPlaying: boolean;
  volume: number;
}

// The ambient layers, migrated from TrackList/index.svelte's `tracks` array.
// Real ids/files come straight from that component; names are human-readable
// labels derived from each file (the component had no display names of its own).
const TRACK_FILES: { name: string; file: string }[] = [
  { name: "Wind", file: "Wind-Mark_DiAngelo-1940285615.mp3" },
  { name: "Waves", file: "small-waves-onto-the-sand-143040.mp3" },
  { name: "Night Ambience", file: "night-ambience-17064.mp3" },
  { name: "Seagulls", file: "urban-seagulls-30068.mp3" },
  { name: "Office", file: "office-ambience-6322.mp3" },
  { name: "City", file: "city-ambience-9272.mp3" },
  { name: "Old Server", file: "old-server-turning-on-and-off-24540.mp3" },
  { name: "Train", file: "train-to-munich-germany.mp3" },
  { name: "Underwater", file: "underwater-white-noise-46423.mp3" },
];

const initialLayers: AtmoLayer[] = TRACK_FILES.map(({ name, file }, i) => ({
  id: String(i + 1),
  name,
  src: `assets/engine/tracks/${file}`,
  isPlaying: false,
  volume: 0.5,
}));

export const atmosphere = writable<AtmoLayer[]>(initialLayers);

// ---- pure reducer (unit-tested in isolation) ----
export function reduceToggle(layers: AtmoLayer[], id: string): AtmoLayer[] {
  return layers.map((l) => (l.id === id ? { ...l, isPlaying: !l.isPlaying } : l));
}

// ---- audio side-effect (injectable for tests) ----
type AudioFactory = (src: string) => HTMLAudioElement;
let audioFactory: AudioFactory = (src) => new Audio(src);
export function setAudioFactory(fn: AudioFactory): void {
  audioFactory = fn;
}

// Single owner of the live HTMLAudioElement instances, keyed by layer id.
const elements = new Map<string, HTMLAudioElement>();

function startLayer(layer: AtmoLayer): void {
  // Guard: never create a second element for an id already playing.
  if (elements.has(layer.id)) {
    const existing = elements.get(layer.id)!;
    existing.play();
    return;
  }
  const audio = audioFactory(layer.src);
  audio.loop = true;
  audio.volume = layer.volume;
  audio.play();
  elements.set(layer.id, audio);
}

function stopLayer(id: string): void {
  const audio = elements.get(id);
  if (audio) {
    audio.pause();
  }
}

export function toggleLayer(id: string): void {
  const layers = get(atmosphere);
  const target = layers.find((l) => l.id === id);
  if (!target) return;
  if (target.isPlaying) {
    stopLayer(id);
  } else {
    startLayer(target);
  }
  atmosphere.set(reduceToggle(layers, id));
}

export function stopAll(): void {
  for (const audio of elements.values()) {
    audio.pause();
  }
  atmosphere.update((layers) => layers.map((l) => ({ ...l, isPlaying: false })));
}

export function setLayerVolume(id: string, v: number): void {
  const audio = elements.get(id);
  if (audio) {
    audio.volume = v;
  }
  atmosphere.update((layers) =>
    layers.map((l) => (l.id === id ? { ...l, volume: v } : l))
  );
}
