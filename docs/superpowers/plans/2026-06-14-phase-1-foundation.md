# LoFiTyan — Фаза 1 «Фундамент»: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Стабилизировать LoFiTyan (30 исправлений из аудита), добавить вертикальный/портретный режим (вариант B) с авто-скрытием управления («просторный режим») и честный UX «Атмосферы» — через целевой рефактор аудио/состояния в Svelte-сторы.

**Architecture:** Единый источник правды — Svelte-сторы (`volume`, `atmosphere`, `autodj`, `immersion`) в `src/lib/stores/`; новый слой `Canvas` (фон + визуализатор, готов под будущие видео/персонажа); адаптивная вёрстка через `@media (orientation: portrait)`. Бэкенд: регистрация shell-плагина, явный CSP, грейсфул-старт.

**Tech Stack:** Tauri 2 (Rust) · Svelte 3 · TypeScript · Vite 4 · Tone.js · pnpm · Vitest (новое — юнит-тесты сторов/логики).

**Спец:** [`docs/superpowers/specs/2026-06-14-lofi-engine-phase-1-foundation-design.md`](../specs/2026-06-14-lofi-engine-phase-1-foundation-design.md)

---

## Порядок выполнения и соглашения

- **Порядок:** `Task 0 (тесты)` → **Блок A (сторы/движок)** → **Блок B (раскладка/просторный режим)** → **Блок C (кнопки/UX)** → **Блок D (бэкенд/i18n)** → `Task E1 (финальный QA)`. Блок A первый: его сторы потребляют остальные блоки.
- **TDD** для чистой логики (сторы, редьюсеры, idle-таймер, persistence, locale→dir, guard `isTypingTarget`). Для `.svelte` / CSS / Tauri-конфигов — точные диффы + **ручная проверка** в `pnpm tauri:d` (юнит-тесты неприменимы).
- Частые коммиты (минимум один на задачу), conventional commits.
- **Без дублирования стора Auto-DJ:** стор `autodj` создаётся в **A2**, потребляется в **A5** (PlayButton) и **D5** (AutoDJ.svelte). Guard `isTypingTarget` создаётся в **C4**, используется в **C5** и может переиспользоваться клавиатурным обработчиком из **A4**.

---

### Task 0: Настройка Vitest (инфраструктура тестов)

**Files:**
- Modify: `package.json` (devDeps + scripts)
- Create: `vitest.config.ts`
- Create: `src/lib/stores/smoke.test.ts`

- [ ] **Step 1: Установить зависимости**

Run: `pnpm add -D vitest@^1.6.0 jsdom@^24`
(Vitest 1.x совместим с Vite 4 в проекте. Если на Node 26 установка ругается на версии — попробуй `vitest@^1 jsdom@^23`.)

- [ ] **Step 2: Создать `vitest.config.ts`**

```ts
/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte({ hot: false })],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Добавить скрипты в `package.json`**

В блок `"scripts"` добавь:
```json
    "test": "vitest run",
    "test:watch": "vitest"
```
(Так `pnpm test -- <файл>` превращается в `vitest run <файл>`, как во всех задачах ниже.)

- [ ] **Step 4: Smoke-тест**

```ts
// src/lib/stores/smoke.test.ts
import { describe, it, expect } from "vitest";
import { get, writable } from "svelte/store";

describe("vitest setup", () => {
  it("runs and svelte stores work", () => {
    const s = writable(1);
    expect(get(s)).toBe(1);
    s.set(2);
    expect(get(s)).toBe(2);
  });
  it("has jsdom localStorage", () => {
    localStorage.setItem("k", "v");
    expect(localStorage.getItem("k")).toBe("v");
  });
});
```
Run: `pnpm test -- src/lib/stores/smoke.test.ts`
Expected: PASS (2 теста).

- [ ] **Step 5: Commit**

```bash
git add package.json vitest.config.ts src/lib/stores/smoke.test.ts && git commit -m "test: set up vitest + jsdom for unit tests"
```

---

## Блок A — Сторы и движок

### Task A1: `volume` store (kills the 100ms localStorage-polling setInterval — audio-5)

**Files:**
- Create: `src/lib/stores/volume.ts`
- Create: `src/lib/stores/volume.test.ts`

This store replaces the `STORAGE_KEY = "Volumes"` shape `{ rain, thunder, campfire, jungle, main_track }` that today lives inline in `PlayButton.svelte:22-32`, `Controls/index.svelte:7-18`, `Settings/Volume.svelte:3-13`. The contract shape is `{ master: number; effects: Record<string, number> }` where `master` maps to the old `main_track` and `effects` holds `rain/thunder/campfire/jungle`. Persisted to the NEW key `lofityan.volumes`, with a one-time read of the legacy `"Volumes"` key so existing users keep their levels.

- [ ] **Step 1: Write the failing test**
```ts
// src/lib/stores/volume.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { get } from "svelte/store";

const STORAGE_KEY = "lofityan.volumes";
const LEGACY_KEY = "Volumes";

beforeEach(() => {
  localStorage.clear();
  // re-import a fresh module instance per test
  vi.resetModules();
});

import { vi } from "vitest";

describe("volume store", () => {
  it("defaults to master=1 and empty effects when no storage", async () => {
    const { volumes } = await import("./volume");
    expect(get(volumes)).toEqual({ master: 1, effects: {} });
  });

  it("migrates the legacy Volumes key on first load", async () => {
    localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify({ rain: 0.5, thunder: 0.2, campfire: 1, jungle: 0.8, main_track: 0.3 })
    );
    const { volumes } = await import("./volume");
    const v = get(volumes);
    expect(v.master).toBe(0.3);
    expect(v.effects).toEqual({ rain: 0.5, thunder: 0.2, campfire: 1, jungle: 0.8 });
  });

  it("setMaster updates the store and persists", async () => {
    const { volumes, setMaster } = await import("./volume");
    setMaster(0.42);
    expect(get(volumes).master).toBe(0.42);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).master).toBe(0.42);
  });

  it("setEffectVolume updates one effect without touching others", async () => {
    const { volumes, setEffectVolume } = await import("./volume");
    setEffectVolume("rain", 0.7);
    setEffectVolume("thunder", 0.1);
    const v = get(volumes);
    expect(v.effects.rain).toBe(0.7);
    expect(v.effects.thunder).toBe(0.1);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).effects.rain).toBe(0.7);
  });

  it("reads back persisted lofityan.volumes over the legacy key", async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify({ main_track: 0.9, rain: 0.9 }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ master: 0.25, effects: { rain: 0.25 } }));
    const { volumes } = await import("./volume");
    expect(get(volumes)).toEqual({ master: 0.25, effects: { rain: 0.25 } });
  });
});
```
- [ ] **Step 2: Run test, verify it fails**
Run: `pnpm test -- src/lib/stores/volume.test.ts`
Expected: FAIL with `Cannot find module './volume'` (file not created yet).
- [ ] **Step 3: Implement**
```ts
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
```
- [ ] **Step 4: Run test, verify pass**
Run: `pnpm test -- src/lib/stores/volume.test.ts`
Expected: PASS (5 tests).
- [ ] **Step 5: Commit**
```bash
git add src/lib/stores/volume.ts src/lib/stores/volume.test.ts && git commit -m "feat(stores): add volumes store with legacy migration (audio-5)"
```

---

### Task A2: `autodj` store (single owner, sync init kills default flash — state-7, enables audio-7)

**Files:**
- Create: `src/lib/stores/autodj.ts`
- Create: `src/lib/stores/autodj.test.ts`

Today the Auto-DJ mode exists in THREE places reading `localStorage.getItem("AutoDJMode")`: `PlayButton.svelte:72` (`autoDJMode = "MUSIC"`) + `:172`, and `AutoDJ.svelte:5` + `:15`. Each reads in `onMount`, causing the "default then stored" flash. The store reads SYNCHRONOUSLY at module init from the NEW key `lofityan.autoDjMode`, falling back to the legacy `"AutoDJMode"` key so existing users keep their mode.

- [ ] **Step 1: Write the failing test**
```ts
// src/lib/stores/autodj.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";

const KEY = "lofityan.autoDjMode";
const LEGACY = "AutoDJMode";

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe("autodj store", () => {
  it("defaults to MUSIC with no storage", async () => {
    const { autoDjMode } = await import("./autodj");
    expect(get(autoDjMode)).toBe("MUSIC");
  });

  it("reads the new key synchronously at init", async () => {
    localStorage.setItem(KEY, "WORLD");
    const { autoDjMode } = await import("./autodj");
    expect(get(autoDjMode)).toBe("WORLD");
  });

  it("falls back to the legacy AutoDJMode key", async () => {
    localStorage.setItem(LEGACY, "ATMOSPHERE");
    const { autoDjMode } = await import("./autodj");
    expect(get(autoDjMode)).toBe("ATMOSPHERE");
  });

  it("ignores an invalid stored value and defaults to MUSIC", async () => {
    localStorage.setItem(KEY, "GARBAGE");
    const { autoDjMode } = await import("./autodj");
    expect(get(autoDjMode)).toBe("MUSIC");
  });

  it("setAutoDjMode updates the store and persists to the new key", async () => {
    const { autoDjMode, setAutoDjMode } = await import("./autodj");
    setAutoDjMode("MANUAL");
    expect(get(autoDjMode)).toBe("MANUAL");
    expect(localStorage.getItem(KEY)).toBe("MANUAL");
  });
});
```
- [ ] **Step 2: Run test, verify it fails**
Run: `pnpm test -- src/lib/stores/autodj.test.ts`
Expected: FAIL with `Cannot find module './autodj'`.
- [ ] **Step 3: Implement**
```ts
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
```
- [ ] **Step 4: Run test, verify pass**
Run: `pnpm test -- src/lib/stores/autodj.test.ts`
Expected: PASS (5 tests).
- [ ] **Step 5: Commit**
```bash
git add src/lib/stores/autodj.ts src/lib/stores/autodj.test.ts && git commit -m "feat(stores): add autoDjMode store with sync init (state-7)"
```

---

### Task A3: `atmosphere` store — pure reducer + injectable audio factory (audio-3, audio-4, state-2)

**Files:**
- Create: `src/lib/stores/atmosphere.ts`
- Create: `src/lib/stores/atmosphere.test.ts`

This is the single owner of the ambient-sound layers, replacing the duplicated `tracks` array + in-place `activeAudios.push()` mutation in `TrackList/index.svelte:54,83-86,146-149` and `TrackListItem.svelte:50-53,58-65`. The pure `reduceToggle(layers, id)` is tested in isolation; the audio side-effect uses an injectable factory (`setAudioFactory`) so tests pass a fake `Audio`. The store owns a module-private `Map<id, HTMLAudioElement>` so no component constructs `Audio` directly anymore. The `reduceToggle` guard (flipping `isPlaying` only on the matching layer) is what kills the audio-3 double-trigger.

- [ ] **Step 1: Write the failing test**
```ts
// src/lib/stores/atmosphere.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

class FakeAudio {
  src: string;
  loop = false;
  volume = 1;
  played = 0;
  paused = true;
  constructor(src: string) {
    this.src = src;
  }
  play() {
    this.played++;
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

describe("reduceToggle (pure)", () => {
  it("flips only the matching layer's isPlaying", async () => {
    const { reduceToggle } = await import("./atmosphere");
    const layers = [
      { id: "1", name: "Wind", src: "a.mp3", isPlaying: false, volume: 0.5 },
      { id: "2", name: "Waves", src: "b.mp3", isPlaying: false, volume: 0.5 },
    ];
    const next = reduceToggle(layers, "1");
    expect(next[0].isPlaying).toBe(true);
    expect(next[1].isPlaying).toBe(false);
  });

  it("toggling the same id twice returns to original state (no double-trigger)", async () => {
    const { reduceToggle } = await import("./atmosphere");
    const layers = [{ id: "1", name: "Wind", src: "a.mp3", isPlaying: false, volume: 0.5 }];
    const once = reduceToggle(layers, "1");
    const twice = reduceToggle(once, "1");
    expect(once[0].isPlaying).toBe(true);
    expect(twice[0].isPlaying).toBe(false);
  });

  it("returns a NEW array (immutable, supports Svelte reassignment)", async () => {
    const { reduceToggle } = await import("./atmosphere");
    const layers = [{ id: "1", name: "Wind", src: "a.mp3", isPlaying: false, volume: 0.5 }];
    const next = reduceToggle(layers, "1");
    expect(next).not.toBe(layers);
    expect(layers[0].isPlaying).toBe(false); // original untouched
  });

  it("unknown id leaves all layers unchanged", async () => {
    const { reduceToggle } = await import("./atmosphere");
    const layers = [{ id: "1", name: "Wind", src: "a.mp3", isPlaying: false, volume: 0.5 }];
    const next = reduceToggle(layers, "999");
    expect(next[0].isPlaying).toBe(false);
  });
});

describe("atmosphere audio side-effects", () => {
  it("toggleLayer starts audio exactly ONCE on first toggle", async () => {
    const created: FakeAudio[] = [];
    const { atmosphere, toggleLayer, setAudioFactory } = await import("./atmosphere");
    setAudioFactory((src) => {
      const a = new FakeAudio(src);
      created.push(a);
      return a as unknown as HTMLAudioElement;
    });
    const id = get(atmosphere)[0].id;
    toggleLayer(id);
    expect(created.length).toBe(1);
    expect(created[0].played).toBe(1);
    expect(created[0].loop).toBe(true);
    expect(get(atmosphere)[0].isPlaying).toBe(true);
  });

  it("a second toggle pauses and does not create a new element", async () => {
    const created: FakeAudio[] = [];
    const { atmosphere, toggleLayer, setAudioFactory } = await import("./atmosphere");
    setAudioFactory((src) => {
      const a = new FakeAudio(src);
      created.push(a);
      return a as unknown as HTMLAudioElement;
    });
    const id = get(atmosphere)[0].id;
    toggleLayer(id);
    toggleLayer(id);
    expect(created.length).toBe(1);
    expect(created[0].paused).toBe(true);
    expect(get(atmosphere)[0].isPlaying).toBe(false);
  });

  it("stopAll pauses every element and clears isPlaying", async () => {
    const created: FakeAudio[] = [];
    const { atmosphere, toggleLayer, stopAll, setAudioFactory } = await import("./atmosphere");
    setAudioFactory((src) => {
      const a = new FakeAudio(src);
      created.push(a);
      return a as unknown as HTMLAudioElement;
    });
    const ids = get(atmosphere).map((l) => l.id);
    toggleLayer(ids[0]);
    toggleLayer(ids[1]);
    stopAll();
    expect(created.every((a) => a.paused)).toBe(true);
    expect(get(atmosphere).every((l) => !l.isPlaying)).toBe(true);
  });

  it("setLayerVolume updates the live element and the store", async () => {
    const created: FakeAudio[] = [];
    const { atmosphere, toggleLayer, setLayerVolume, setAudioFactory } = await import("./atmosphere");
    setAudioFactory((src) => {
      const a = new FakeAudio(src);
      created.push(a);
      return a as unknown as HTMLAudioElement;
    });
    const id = get(atmosphere)[0].id;
    toggleLayer(id);
    setLayerVolume(id, 0.3);
    expect(created[0].volume).toBe(0.3);
    expect(get(atmosphere)[0].volume).toBe(0.3);
  });
});
```
- [ ] **Step 2: Run test, verify it fails**
Run: `pnpm test -- src/lib/stores/atmosphere.test.ts`
Expected: FAIL with `Cannot find module './atmosphere'`.
- [ ] **Step 3: Implement**
```ts
// src/lib/stores/atmosphere.ts
import { writable, get } from "svelte/store";

export interface AtmoLayer {
  id: string;
  name: string;
  src: string;
  isPlaying: boolean;
  volume: number;
}

// The 9 ambient layers, migrated from TrackList/index.svelte's `tracks` array.
const TRACK_FILES = [
  "Wind-Mark_DiAngelo-1940285615.mp3",
  "small-waves-onto-the-sand-143040.mp3",
  "night-ambience-17064.mp3",
  "urban-seagulls-30068.mp3",
  "office-ambience-6322.mp3",
  "city-ambience-9272.mp3",
  "old-server-turning-on-and-off-24540.mp3",
  "train-to-munich-germany.mp3",
  "underwater-white-noise-46423.mp3",
];

const initialLayers: AtmoLayer[] = TRACK_FILES.map((file, i) => ({
  id: String(i + 1),
  name: `Track ${i + 1}`,
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
```
- [ ] **Step 4: Run test, verify pass**
Run: `pnpm test -- src/lib/stores/atmosphere.test.ts`
Expected: PASS (8 tests).
- [ ] **Step 5: Commit**
```bash
git add src/lib/stores/atmosphere.ts src/lib/stores/atmosphere.test.ts && git commit -m "feat(stores): add atmosphere store owning audio lifecycle (audio-3, audio-4, state-2)"
```

---

### Task A4: Rewire TrackList + TrackListItem to atmosphere store; one keydown handler (audio-3, audio-4, state-2, state-4)

**Files:**
- Modify: `src/lib/components/TrackList/index.svelte:1-205`
- Modify: `src/lib/components/TrackListItem.svelte` (`src/lib/components/TrackList/TrackListItem.svelte:1-116`)

UI/wiring task — not unit-testable (the store logic it calls is covered by A3). This removes the local `tracks`/`activeAudios` arrays, the three module-level `window.addEventListener("keydown", ...)` registrations (the `"k"` listener at `:58`, the nine number-key listeners in the `for` loop at `:73-101`, and the arrow listener at `:105`), collapsing the digit listeners into ONE handler that parses the digit, all inside `onMount` with cleanup in the returned function. `TrackListItem` stops mutating `track.isPlaying` (it dispatches to the store) and stops constructing `Audio` (A3 owns it).

- [ ] **Step 1: Show the EXACT current code being replaced (TrackList/index.svelte)**
Current `src/lib/components/TrackList/index.svelte:1-101` declares the inline `tracks` array (`:6-52`), `let activeAudios = []` (`:54`), the module-level `"k"` stop-all listener (`:57-69`), and the nine-listener `for` loop (`:71-101`):
```ts
  let activeAudios = [];
  let isMobileHidden = false; // Used to hide track list on mobile due to tight space

  // Shortcut for stoping all effects with "k" key
  window.addEventListener("keydown", (e) => {
    if (e.key === "k") {
      activeAudios.forEach((item) => {
        item.audio.pause();
      });
      console.log("activeAudios", activeAudios);
      activeAudios = [];
      tracks.forEach((track) => {
        track.isPlaying = false;
      });
    }
  });

  // Add toggle for each track with number keys
  //  through (1-9) on keyboard
  for (let i = 1; i < 10; i++) {
    window.addEventListener("keydown", (e) => {
      if (e.key === i.toString()) {
        tracks[i - 1].isPlaying = !tracks[i - 1].isPlaying;
        // ... creates new Audio, activeAudios.push(...), etc.
      }
    });
  }
```
The arrow-key listener at `:105-115`, `toggleTrack` at `:140-163` (with `activeAudios.push` at `:146-149`), and the `onMount` at `:165-181` (which has NO cleanup for `settings-open-changed`, state-4) also change.
- [ ] **Step 2: Replace the `<script>` of TrackList/index.svelte with this EXACT code**
```svelte
<script lang="ts">
  import { IconChevronDown } from "@tabler/icons-svelte";
  import { onMount } from "svelte";
  import { atmosphere, toggleLayer, stopAll } from "../../stores/atmosphere";
  import TrackListItem from "./TrackListItem.svelte";

  let isMobileHidden = false; // Used to hide track list on mobile due to tight space
  let visibleTrackId = "1";

  function nextTrack() {
    const n = Number(visibleTrackId);
    visibleTrackId = String(n < 9 ? n + 1 : 1);
  }
  function prevTrack() {
    const n = Number(visibleTrackId);
    visibleTrackId = String(n > 1 ? n - 1 : 9);
  }

  let lastScrollTime = 0;
  const SCROLL_THROTTLE = 100; // ms

  function handleScroll(event: WheelEvent) {
    const currentTime = Date.now();
    if (currentTime - lastScrollTime < SCROLL_THROTTLE) return;
    if (event.deltaY > 0) {
      nextTrack();
      lastScrollTime = currentTime;
    } else if (event.deltaY < 0) {
      prevTrack();
      lastScrollTime = currentTime;
    }
  }

  function isTypingTarget(e: KeyboardEvent): boolean {
    const el = e.target as HTMLElement | null;
    return !!el && (el.closest("input") !== null || el.isContentEditable);
  }

  onMount(() => {
    // ONE keydown handler for digits, stop-all, and arrows (state-4).
    const handleKeydown = (e: KeyboardEvent) => {
      if (isTypingTarget(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key >= "1" && e.key <= "9") {
        toggleLayer(e.key);
        visibleTrackId = e.key;
        return;
      }
      if (e.key === "k") {
        stopAll();
        return;
      }
      if (e.key === "ArrowUp") prevTrack();
      if (e.key === "ArrowDown") nextTrack();
    };

    const handleToggleTrack = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.id !== undefined) {
        toggleLayer(String(detail.id));
        visibleTrackId = String(detail.id);
      }
    };

    const handleSettingsOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.isActive !== undefined) {
        isMobileHidden = detail.isActive;
      }
    };

    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("lofi-toggle-track", handleToggleTrack);
    window.addEventListener("settings-open-changed", handleSettingsOpen);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("lofi-toggle-track", handleToggleTrack);
      window.removeEventListener("settings-open-changed", handleSettingsOpen);
    };
  });
</script>

<div
  class={"track-list" + (isMobileHidden ? " mobile-hidden" : "")}
  on:wheel={handleScroll}
>
  <div class="wrapper">
    <div class="carousel">
      {#each $atmosphere as layer (layer.id)}
        <TrackListItem
          {layer}
          {visibleTrackId}
          setMeVisible={(id) => (visibleTrackId = id)}
        />
      {/each}
    </div>
  </div>
  <div id="btn-view">
    <button id="navigate-btn" class="glass" on:click={prevTrack}>
      <IconChevronDown />
    </button>
  </div>
</div>
```
(The `<style>` block at `:207-264` is unchanged.)
- [ ] **Step 3: Show the EXACT current TrackListItem code being replaced**
Current `src/lib/components/TrackList/TrackListItem.svelte:5-65` takes `activeAudios`/`track` props, constructs `Audio` in `playTrack` (`:45-56`, `activeAudios.push` at `:50-53`, `track.isPlaying = true` at `:54`), and mutates `track.isPlaying = false` in `pauseTrack` (`:64`) without removing from `activeAudios`.
- [ ] **Step 4: Replace the `<script>` and click handlers of TrackListItem.svelte with this EXACT code**
```svelte
<script lang="ts">
  import { afterUpdate } from "svelte";
  import { t } from "../../locales/store";
  import { toggleLayer, setLayerVolume } from "../../stores/atmosphere";
  import type { AtmoLayer } from "../../stores/atmosphere";

  export let setMeVisible: (id: string) => void;
  export let layer: AtmoLayer = {
    id: "-1",
    name: "none",
    src: "none",
    isPlaying: false,
    volume: 0.5,
  };
  export let visibleTrackId = "-1";

  let trackItemAnimationClass = "item-hidden";

  function updateAnimation() {
    const id = Number(layer.id);
    const vis = Number(visibleTrackId);
    if (id == vis) {
      trackItemAnimationClass = "item-visible";
    } else if (id + 1 == vis) {
      trackItemAnimationClass = "item-before-visible";
    } else if (id - 1 == vis) {
      trackItemAnimationClass = "item-after-visible";
    } else if (id == 9 && vis == 1) {
      trackItemAnimationClass = "item-before-visible";
    } else if (id == 1 && vis == 9) {
      trackItemAnimationClass = "item-after-visible";
    } else {
      trackItemAnimationClass = "item-hidden";
    }
  }

  function handleVolumeChange(event: Event) {
    const v = parseFloat((event.target as HTMLInputElement).value);
    setLayerVolume(layer.id, v);
  }

  function onCardClick() {
    // Dispatch to the store; never mutate the prop (state-2).
    toggleLayer(layer.id);
    if (!layer.isPlaying) setMeVisible(layer.id);
  }

  updateAnimation();
  afterUpdate(updateAnimation);
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  on:contextmenu={() => {
    if (!layer.isPlaying) setMeVisible(layer.id);
  }}
  on:click={onCardClick}
  class={"carousel__item " + trackItemAnimationClass}
>
  <div class={"carousel__item-body glass " + (layer.isPlaying ? "playing" : "")}>
    <img class="carousel__item-body__img" src="assets/images/{layer.id}.jpg" alt="" />
    <div>
      <p id="title">Track {layer.id}</p>
      <p id="info">{$t.tracks[layer.id].quote}</p>
      {#if layer.isPlaying}
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={layer.volume}
          on:input={handleVolumeChange}
          on:click={(e) => e.stopPropagation()}
          id="volume-slider"
          class="volume-slider"
        />
      {/if}
    </div>
  </div>
</div>
```
(The `<style>` block at `:118-205` is unchanged.)
- [ ] **Step 5: Manual verify**
Run `pnpm tauri:d`. Then: (a) click an atmosphere card and confirm exactly one ambient sound starts and the card shows the `.playing` highlight; click again to stop. (b) Press the matching number key (1-9) for that card and confirm it toggles the SAME sound (no second overlapping instance — audio-3). (c) With several layers playing, press `k` and confirm all stop and highlights clear (audio-4). (d) Drag a card's volume slider and confirm only that layer's volume changes. (e) Open Settings, type — confirm digits typed in inputs do NOT toggle layers (state-4 guard). (f) In DevTools, after toggling on/off several times, confirm no duplicate `<audio>`-driven playback (single owner).
- [ ] **Step 6: Commit**
```bash
git add src/lib/components/TrackList/index.svelte src/lib/components/TrackList/TrackListItem.svelte && git commit -m "refactor(atmosphere): route TrackList through store, single keydown handler (audio-3,audio-4,state-2,state-4)"
```

---

### Task A5: PlayButton — await Tone.start, volume store, WORLD via atmosphere, spacebar guard, rename + "Новая музыка" (audio-2, audio-5, audio-7, ui-1, audio-1)

**Files:**
- Modify: `src/lib/PlayButton.svelte:1-407`
- Modify: `src/lib/locales/en.ts:90-100`, `src/lib/locales/ru.ts` (add `regenerate` label key)

UI/engine task. Covers: **audio-2** (`toggle()` `:357-367` and `startAudioContext()` `:371-374` call `Tone.start()` without `await` → make both async, `await Tone.start()` before transport/sequence `.start(0)`); **audio-5** (remove the volume polling `setInterval` at `:379-385`, subscribe to the `volumes` store instead and clear subscription in `onDestroy`); **audio-7** (WORLD Auto-DJ at `:255-261` dispatches per-track events that desync → call `toggleLayer` through the atmosphere store directly); **ui-1** (spacebar at `:152-157` calls `toggle()` directly, bypassing the readiness guards in `handleButtonAction` `:392-406` → spacebar must call `handleButtonAction()`); **audio-1** (add explicit "Новая музыка" button calling `regenerate()` which wraps the existing `generateProgression()` and restarts sequences).

- [ ] **Step 1: Show the EXACT current code being replaced**
`src/lib/PlayButton.svelte:351-385` (the non-await `Tone.start()`, the unguarded spacebar via `:152-157`, and the polling interval):
```ts
  function toggle() {
    progress = 0;
    if (Tone.Transport.state === "started") {
      noise.stop();
      Tone.Transport.stop();
      isPlaying = false;
    } else {
      Tone.start();
      Tone.Transport.start();
      noise.start(0);
      chords.start(0);
      // ...
      isPlaying = true;
    }
    window.dispatchEvent(new CustomEvent("lofi-play-state-changed", { detail: { isPlaying } }));
  }

  function startAudioContext() {
    Tone.start();
    contextStarted = true;
  }

  // ... onMount(() => { setInterval(() => { vol.volume.value = linearToDb(updatedVol.main_track); }, 100); });
```
And `:255-261` (WORLD desync via dispatched events):
```ts
    if (autoDJMode === "WORLD") {
      if (Math.random() < 0.2) {
        const trackId = Math.floor(Math.random() * 9) + 1; // 1-9
        window.dispatchEvent(new CustomEvent("lofi-toggle-track", { detail: { id: trackId } }));
      }
    }
```
And `:152-157` (spacebar bypassing guards):
```ts
    const handleKeydown = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        toggle();
      }
    };
```
- [ ] **Step 2: Apply the imports + volume-store edits (top of `<script>`)**
Replace the inline volume block at `src/lib/PlayButton.svelte:22-35` with a subscription to the store. Add imports after line 20:
```ts
  import { get } from "svelte/store";
  import { volumes } from "../lib/stores/volume";
  import { autoDjMode } from "../lib/stores/autodj";
  import { toggleLayer } from "../lib/stores/atmosphere";
```
Replace lines `:22-35` (the `STORAGE_KEY`/`DEFFAULT_VOLUMES`/`volumes` localStorage read + `linearToDb`) with:
```ts
  // Convert linear volume (0 to 1) to dB
  const linearToDb = (value: number) =>
    value === 0 ? -Infinity : 20 * Math.log10(value);
```
Replace line `:45` (`const vol = new Tone.Volume(linearToDb(volumes.main_track));`) with:
```ts
  const vol = new Tone.Volume(linearToDb(get(volumes).master));
```
- [ ] **Step 3: Replace the polling `onMount` (`:379-385`) with a store subscription cleared in onDestroy**
```ts
  // Live master volume from the store — no polling (audio-5).
  const unsubVolume = volumes.subscribe((v) => {
    vol.volume.value = linearToDb(v.master);
  });
  onDestroy(() => {
    unsubVolume();
  });
```
Delete the entire `onMount(() => { setInterval(...) }, 100); })` block at `:379-385`.
- [ ] **Step 4: Make `toggle()` and `startAudioContext()` async with `await Tone.start()` (audio-2)**
```ts
  let isStarting = false;

  async function toggle() {
    progress = 0;
    if (Tone.Transport.state === "started") {
      noise.stop();
      Tone.Transport.stop();
      isPlaying = false;
    } else {
      await Tone.start();
      Tone.Transport.start();
      noise.start(0);
      chords.start(0);
      melody.start(0);
      kickLoop.start(0);
      snareLoop.start(0);
      hatLoop.start(0);
      isPlaying = true;
    }
    window.dispatchEvent(
      new CustomEvent("lofi-play-state-changed", { detail: { isPlaying } })
    );
  }

  async function startAudioContext() {
    await Tone.start();
    contextStarted = true;
  }
```
- [ ] **Step 5: Spacebar via `handleButtonAction`, WORLD via store, async-aware autoDJ source (ui-1, audio-7, state-7)**
Replace the spacebar handler (`:152-157`) so it routes through the guarded action and cannot double-fire while starting:
```ts
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (isStarting) return;
        handleButtonAction();
      }
    };
```
Replace the WORLD block (`:255-261`) to call the store directly (audio-7):
```ts
    // Smart layers: toggle an atmosphere layer via the store (no desync). WORLD only.
    if ($autoDjMode === "WORLD") {
      if (Math.random() < 0.2) {
        const layerId = String(Math.floor(Math.random() * 9) + 1); // "1".."9"
        toggleLayer(layerId);
      }
    }
```
Remove the local `let autoDJMode = "MUSIC";` (`:72`), its `onMount` init (`:172`), and the `auto-dj-mode-changed` listener registration + cleanup (`:163-169,177`). PlayButton is a Svelte component, so it auto-subscribes to the imported store — reference `$autoDjMode` directly (NO manual `.subscribe`, NO `unsub`; you cannot declare a `$`-prefixed `let`). Replace every remaining reference to `autoDJMode` in `autoDJTransition` (`:227,244,255`) with `$autoDjMode`, and delete the `handleAutoDJModeChange` listener registration/cleanup.

> Cross-task note: the `autoDjMode` store is created in **Task A2**, and the AutoDJ settings panel (`AutoDJ.svelte`) is wired in **Task D5**. This task only CONSUMES `$autoDjMode` inside PlayButton — do not recreate the store or edit `AutoDJ.svelte` here.
- [ ] **Step 6: Make `handleButtonAction` await-aware and add `regenerate()` (audio-2, audio-1)**
```ts
  async function handleButtonAction() {
    if (!allSamplesLoaded) {
      return;
    } else if (!contextStarted) {
      isStarting = true;
      await startAudioContext();
      isStarting = false;
    } else if (!genChordsOnce) {
      return;
    } else {
      isStarting = true;
      await toggle();
      isStarting = false;
    }
  }

  // Explicit "new music": regenerate the progression and restart sequences if playing.
  function regenerate() {
    generateProgression();
    if (Tone.Transport.state === "started") {
      progress = 0;
      chords.start(0);
      melody.start(0);
      kickLoop.start(0);
      snareLoop.start(0);
      hatLoop.start(0);
    }
  }
```
- [ ] **Step 7: Rename the refresh button to "Новая музыка" via i18n (audio-1)**
In `src/lib/locales/en.ts`, inside `settings.autodj` (after line 38's closing `},`) is not the place — add a top-level `player` key. Insert before the closing `tracks` object at `:90`, add:
```ts
    player: {
        regenerate: "New music",
    },
```
In `src/lib/locales/ru.ts` add the matching:
```ts
    player: {
        regenerate: "Новая музыка",
    },
```
Then replace the generate button markup at `src/lib/PlayButton.svelte:428-430`:
```svelte
    <button class="generateBtn glass" on:click={regenerate} title={$t.player.regenerate}>
      <IconRefresh size={16} />
      <span class="generate-label">{$t.player.regenerate}</span>
    </button>
```
Add `import { t } from "../lib/locales/store";` to the script imports, and this CSS to the `<style>` block:
```css
  .generateBtn {
    display: flex;
    align-items: center;
    gap: 6px;
    width: auto;
    padding: 0 12px;
    border-radius: 20px;
  }
  .generate-label {
    font-size: 12px;
    color: white;
  }
```
- [ ] **Step 8: Manual verify**
Run `pnpm tauri:d`. Then: (a) Click play and confirm audio starts on the FIRST click/press, not the second (audio-2). (b) Press spacebar before samples load and confirm nothing breaks; after load it starts/pauses identically to the on-screen button (ui-1). (c) Open Settings → Volume, drag Main Track, and confirm playback volume tracks the slider with no lag-then-jump and that exactly zero `setInterval` polls run (DevTools → Performance, or `grep -rn "setInterval" src/lib/PlayButton.svelte` returns nothing) (audio-5). (d) Set Auto-DJ to WORLD, wait for a section transition, and confirm an atmosphere card lights up/clears consistently with its sound (audio-7). (e) Click the "Новая музыка" button and confirm a new chord progression appears and music continues without a stuck/dead state (audio-1). (f) Reload the app with WORLD set and confirm the mode does not flash MUSIC first (state-7).
- [ ] **Step 9: Commit**
```bash
git add src/lib/PlayButton.svelte src/lib/locales/en.ts src/lib/locales/ru.ts && git commit -m "fix(player): await Tone.start, volume store, WORLD via store, spacebar guard, Новая музыка (audio-2,audio-5,audio-7,ui-1,audio-1)"
```

---

### Task A6: Migrate Rain control + Controls index off volume polling onto the volumes store (audio-5)

**Files:**
- Modify: `src/lib/components/Controls/Rain/index.svelte:1-53`
- Modify: `src/lib/components/Controls/index.svelte:1-25`

UI task completing audio-5: two more `setInterval(..., 100/200)` volume polls live in `Rain/index.svelte:33-35` and `Controls/index.svelte:20-23`. Replace both with subscriptions to the `volumes` store. (The other three effect controls — Thunder/Jungle/CampFire — follow the identical pattern in Block where applicable; this task does Rain as the representative effect plus the Controls container that fans volumes out.)

- [ ] **Step 1: Show the EXACT current Rain code being replaced**
`src/lib/components/Controls/Rain/index.svelte:6-40`:
```ts
  export let volume: number;
  let rain = new Audio("assets/engine/effects/rain.mp3");
  // ...
  onMount(() => {
    window.addEventListener("lofi-toggle-rain", toggleRain);
    setInterval(() => {
      rain.volume = volume;
    },100);
    return () => {
      window.removeEventListener("lofi-toggle-rain", toggleRain);
    };
  });
```
- [ ] **Step 2: Replace the Rain `<script>` with this EXACT code**
```svelte
<script lang="ts">
  import { IconCloudRain } from "@tabler/icons-svelte";
  import { onDestroy, onMount } from "svelte";
  import { volumes } from "../../../stores/volume";
  import RainAnimation from "./RainAnimation.svelte";

  let rain = new Audio("assets/engine/effects/rain.mp3");
  let isRaining = false;
  let currentVolume = 1;

  // Live volume from the store — no polling (audio-5).
  const unsub = volumes.subscribe((v) => {
    currentVolume = v.effects.rain ?? 1;
    rain.volume = currentVolume;
  });
  onDestroy(() => unsub());

  function toggleRain() {
    if (isRaining) {
      rain.pause();
    } else {
      rain.loop = true;
      rain.volume = currentVolume;
      rain.play();
    }
    isRaining = !isRaining;
  }

  onMount(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && el.closest("input")) return;
      if (e.key === "a") toggleRain();
    };
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("lofi-toggle-rain", toggleRain);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("lofi-toggle-rain", toggleRain);
    };
  });
</script>
```
(The `<div>` markup and `<style>` at `:43-61` are unchanged; the `export let volume` prop is removed — the button no longer needs it.)
- [ ] **Step 3: Show the EXACT current Controls/index.svelte code being replaced**
`src/lib/components/Controls/index.svelte:7-31`:
```ts
  const STORAGE_KEY = "Volumes";
  const DEFFAULT_VOLUMES = { rain: 1, thunder: 1, campfire: 1, jungle: 1, main_track: 1 };
  let volumes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFFAULT_VOLUMES;
  setInterval(() => {
    volumes = volumes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFFAULT_VOLUMES;
  }, 200);
```
- [ ] **Step 4: Replace the Controls/index.svelte `<script>` and child props with this EXACT code**
```svelte
<script lang="ts">
  import CampFire from "./CampFire/index.svelte";
  import Jungle from "./Jungle/index.svelte";
  import Rain from "./Rain/index.svelte";
  import Settings from "./Settings/index.svelte";
  import Thunder from "./Thunder/index.svelte";
  import { volumes } from "../../stores/volume";

  // Effect children read their own volume from the store; no polling here (audio-5).
  $: fx = $volumes.effects;
</script>

<div class="controls glass">
  <Rain />
  <Thunder volume={fx.thunder ?? 1} />
  <Jungle volume={fx.jungle ?? 1} />
  <CampFire volume={fx.campfire ?? 1} />
  <Settings />
</div>
```
(The `<style>` block at `:36-54` is unchanged. Rain no longer takes a `volume` prop since it subscribes directly; Thunder/Jungle/CampFire keep their prop until their own Block-B migration.)
- [ ] **Step 5: Manual verify**
Run `pnpm tauri:d`. Then: (a) Toggle rain (click the cloud button or press `a`) and confirm it loops. (b) Open Settings → Volume, drag the Rain slider while rain is playing, and confirm the rain volume changes live with no 100ms lag-jump (audio-5). (c) Press `a` while focused in a text input (e.g. a future search field / the language area) and confirm rain does NOT toggle (input guard). (d) `grep -rn "setInterval" src/lib/components/Controls/Rain/index.svelte src/lib/components/Controls/index.svelte` returns nothing.
- [ ] **Step 6: Commit**
```bash
git add src/lib/components/Controls/Rain/index.svelte src/lib/components/Controls/index.svelte && git commit -m "refactor(controls): rain + controls read volumes store, drop polling (audio-5)"
```

## Блок B — Раскладка и просторный режим


These tasks assume **Task 0 (vitest + jsdom setup)** is already done by the assembler, so `pnpm test` runs Vitest. Pure logic (the immersion idle store) gets real TDD unit tests; `.svelte`/CSS/Tauri config changes get exact diffs plus a concrete manual-verify step run under `pnpm tauri:d`.

---

### Task B1: Portrait-friendly Tauri window (layout-1)

**Files:**
- Modify: `src-tauri/tauri.conf.json:27-38`

- [ ] **Step 1: Show the EXACT current code**
Current `src-tauri/tauri.conf.json` lines 27-38:
```json
    "windows": [
      {
        "fullscreen": false,
        "title": "Lofi Engine",
        "width": 980,
        "height": 580,
        "minWidth": 930,
        "minHeight": 530,
        "decorations": false,
        "transparent": true
      }
    ],
```

- [ ] **Step 2: Apply the EXACT new code**
Replace lines 27-38 with (default size becomes portrait 480×900, min relaxed to 360×560, `resizable: true` added, no `maxWidth`/`maxHeight`):
```json
    "windows": [
      {
        "fullscreen": false,
        "title": "Lofi Engine",
        "width": 480,
        "height": 900,
        "minWidth": 360,
        "minHeight": 560,
        "resizable": true,
        "decorations": false,
        "transparent": true
      }
    ],
```

- [ ] **Step 3: Manual verify**
Run: `pnpm tauri:d`
Observe: the app launches in a tall portrait window (~480×900). Grab a corner and drag — the window resizes freely. Drag it narrow to ~360 wide / 560 tall — it stops at those minimums and does not collapse further. There is no maximum cap (you can stretch it large).

- [ ] **Step 4: Commit**
```bash
git add src-tauri/tauri.conf.json && git commit -m "feat(window): portrait-friendly resizable window (min 360x560, default 480x900)"
```

---

### Task B2: Create the Canvas layer component

**Files:**
- Create: `src/lib/components/Canvas/index.svelte`

- [ ] **Step 1: Create the component**
This is a full-area layer that renders the background image (id `bg`, the same id `App.svelte`'s `onMount` already targets to set `backgroundImage`) plus the existing `Visualizer`, and exposes a `<slot/>` for future content (videos, mascot). The Visualizer needs a `Tone.Master` audio source, matching `PlayButton.svelte:447`.
Create `src/lib/components/Canvas/index.svelte`:
```svelte
<script lang="ts">
  // @ts-ignore
  import * as Tone from "tone";
  import Visualizer from "../Visualizer/index.svelte";
</script>

<div id="bg" class="canvas">
  <div class="canvas-visualizer">
    <Visualizer audio={Tone.Master} />
  </div>
  <slot />
</div>

<style>
  .canvas {
    position: absolute;
    inset: 0;
    z-index: 0;
    background-color: #0a0a0a;
    background-repeat: no-repeat;
    background-size: cover;
    background-position: center;
    transition: background-image 0.3s ease;
  }

  .canvas-visualizer {
    position: absolute;
    left: clamp(12px, 3vw, 30px);
    bottom: clamp(12px, 3vh, 30px);
    height: clamp(90px, 18vh, 180px);
    width: clamp(160px, 40vw, 320px);
    overflow: hidden;
    z-index: 1;
  }

  @media (orientation: portrait) {
    .canvas-visualizer {
      left: 50%;
      transform: translateX(-50%);
      bottom: clamp(8px, 2vh, 16px);
      width: min(80vw, 320px);
    }
  }
</style>
```

- [ ] **Step 2: Manual verify (deferred to B3)**
The component is wired into `App.svelte` in Task B3; verify there.

- [ ] **Step 3: Commit**
```bash
git add src/lib/components/Canvas/index.svelte && git commit -m "feat(canvas): add full-area Canvas layer (bg + visualizer + slot)"
```

---

### Task B3: Refactor App.svelte to use Canvas (layout-2)

**Files:**
- Modify: `src/App.svelte:60-71` (markup)
- Modify: `src/App.svelte:73-95` (styles)

Note: the background `id="bg"` moves from `<main>` into `Canvas`. `App.svelte`'s `onMount` does `document.getElementById("bg")` and sets `bgEl.style.backgroundImage` — that lookup still resolves because `Canvas` renders the `#bg` element, so no script change is needed.

- [ ] **Step 1: Show the EXACT current markup**
Current `src/App.svelte` lines 60-71:
```svelte
<main id="bg" class="container">
  <Config />
  <TopBar />
  <section class="content">
    <TrackList />
    <Controls />
    <Info />
  </section>
  <PlayButton />
  <ContextMenu />
  <Tooltip />
</main>
```

- [ ] **Step 2: Apply the EXACT new markup**
Replace lines 60-71 with (remove `id="bg"` from `<main>`, add `<Canvas />` as the background layer):
```svelte
<main class="container">
  <Canvas />
  <Config />
  <TopBar />
  <section class="content">
    <TrackList />
    <Controls />
    <Info />
  </section>
  <PlayButton />
  <ContextMenu />
  <Tooltip />
</main>
```

- [ ] **Step 3: Add the Canvas import**
Current `src/App.svelte` line 5:
```svelte
  import TrackList from "./lib/components/TrackList/index.svelte";
```
Replace with:
```svelte
  import TrackList from "./lib/components/TrackList/index.svelte";
  import Canvas from "./lib/components/Canvas/index.svelte";
```

- [ ] **Step 4: Update the styles for portrait reflow**
Current `src/App.svelte` lines 73-96:
```svelte
<style>
  .container {
    max-width: 100vw;
    max-height: 100vh;
    height: 100vh;
    position: relative;
    overflow: hidden;
    background-color: #0a0a0a;
    background-repeat: no-repeat;
    background-size: cover;
    background-position: center;
    transition: background-image 0.3s ease;
  }

  .content {
    padding: 24px;
    padding-top: 30px;
    height: 100vh;
    z-index: 20;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }
</style>
```
Replace with (background styling now lives in Canvas; `.content` reflows to a column in portrait; `min-height` instead of fixed `height` so portrait content can grow):
```svelte
<style>
  .container {
    max-width: 100vw;
    min-height: 100vh;
    height: 100vh;
    position: relative;
    overflow: hidden;
  }

  .content {
    padding: 24px;
    padding-top: 30px;
    height: 100vh;
    position: relative;
    z-index: 20;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  @media (orientation: portrait) {
    .content {
      flex-direction: column;
      justify-content: flex-end;
      align-items: stretch;
      gap: 16px;
      height: auto;
      min-height: 100vh;
    }
  }
</style>
```

- [ ] **Step 5: Manual verify**
Run: `pnpm tauri:d`
Observe (portrait, the default 480×900 window): the background image still loads and fills the whole area (confirms `#bg` lookup still works from Canvas), the visualizer shows centered near the bottom of the canvas, and the `.content` children (TrackList / Controls / Info) stack **vertically** at the bottom rather than spreading left-to-right. Then drag the window wide (landscape, e.g. 1000×580): `.content` returns to a horizontal `row` layout with items spread across.

- [ ] **Step 6: Commit**
```bash
git add src/App.svelte && git commit -m "refactor(app): mount Canvas layer and reflow content to column in portrait"
```

---

### Task B4: Controls breakpoint → orientation query (layout-3)

**Files:**
- Modify: `src/lib/components/Controls/index.svelte:47-54`

The existing mobile rule uses `@media only screen and (max-width: 600px)`, but the window `minWidth` was 930 (and is now 360 but the dock should activate by *orientation*, not pixel width), so the mobile CSS never fired. Switch the trigger to portrait orientation so the already-written mobile layout activates in the portrait dock.

- [ ] **Step 1: Show the EXACT current code**
Current `src/lib/components/Controls/index.svelte` lines 47-54:
```css
  @media only screen and (max-width: 600px) {
    .controls {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      width: 85vw;
    }
  }
```

- [ ] **Step 2: Apply the EXACT new code**
Replace lines 47-54 with (orientation-portrait trigger; drop `position:absolute` so it flows inside the column dock, and widen to fill the dock):
```css
  @media (orientation: portrait) {
    .controls {
      width: min(85vw, 420px);
      margin: 0 auto;
    }
  }
```

- [ ] **Step 3: Manual verify**
Run: `pnpm tauri:d`
Observe (portrait default window): the atmosphere/effects control bar (`.controls`) is centered horizontally and stretches close to the window width (`min(85vw, 420px)`) instead of being a fixed 340px pill stuck to one side. Resize to landscape: it returns to the fixed 340px pill.

- [ ] **Step 4: Commit**
```bash
git add src/lib/components/Controls/index.svelte && git commit -m "fix(controls): activate dock layout via orientation query (was dead max-width:600)"
```

---

### Task B5: PlayButton visualizer → clamp + portrait rules (layout-5)

**Files:**
- Modify: `src/lib/PlayButton.svelte:523-545`

The `.visualizer-container` (used at `PlayButton.svelte:446-447`) is `position:absolute` with a fixed `height:180px` tuned for landscape, and the mobile rule (`display:none` at `max-width:600px`) never fired. Make it responsive with `clamp()` and add a portrait override.

- [ ] **Step 1: Show the EXACT current code**
Current `src/lib/PlayButton.svelte` lines 523-545:
```css
  .visualizer-container {
    position: absolute;
    left: 30px;
    bottom: 30px;
    height: 180px;
    overflow: hidden;
    margin-top: 10px;
  }

  @media only screen and (max-width: 600px) {
    .play-button {
      margin-bottom: 40px;
    }
    .progressionList {
      bottom: 0;
      left: 0;
      width: 100vw;
      transform: scale(0.8);
    }
    .visualizer-container {
      display: none;
    }
  }
```

- [ ] **Step 2: Apply the EXACT new code**
Replace lines 523-545 with (fluid size via `clamp()`; portrait moves the play button up off the dock and hides this duplicate visualizer since Canvas already shows one in portrait):
```css
  .visualizer-container {
    position: absolute;
    left: clamp(12px, 3vw, 30px);
    bottom: clamp(12px, 3vh, 30px);
    height: clamp(90px, 18vh, 180px);
    overflow: hidden;
    margin-top: 10px;
  }

  @media (orientation: portrait) {
    .play-button {
      margin-bottom: clamp(16px, 5vh, 40px);
    }
    .progressionList {
      bottom: 0;
      left: 0;
      width: 100vw;
      transform: scale(0.8);
    }
    .visualizer-container {
      display: none;
    }
  }
```

- [ ] **Step 3: Manual verify**
Run: `pnpm tauri:d`
Observe (portrait): the bottom-left visualizer inside PlayButton is **hidden** (the Canvas visualizer from B2/B3 is the one shown), and the play button sits with breathing room above the dock. Resize to landscape: the PlayButton visualizer reappears in the bottom-left and scales smoothly (it is no longer a hard 180px — shrink the window height and it gets shorter down to ~90px).

- [ ] **Step 4: Commit**
```bash
git add src/lib/PlayButton.svelte && git commit -m "fix(playbutton): fluid visualizer via clamp() and portrait overrides"
```

---

### Task B6: TrackList portrait overrides (layout-7)

**Files:**
- Modify: `src/lib/components/TrackList/index.svelte:208-214` (`.track-list` base)
- Modify: `src/lib/components/TrackList/index.svelte:251-263` (media query)

`.track-list` is sized `28vw × 65vh` for landscape; the mobile rule at `max-width:600px` never fired. Add portrait overrides with `min()`/`clamp()`.

- [ ] **Step 1: Show the EXACT current code (base + media query)**
Current `src/lib/components/TrackList/index.svelte` lines 208-214:
```css
  .track-list {
    width: 28vw;
    height: 65vh;
    padding: 20px 10px;
    border-radius: 20px;
    z-index: 20;
  }
```
Current lines 251-263:
```css
  @media only screen and (max-width: 600px) {
    .track-list {
      width: 100vw;
      margin-top: 40px;
      height: 45vh;
    }
    #btn-view {
      width: 100%;
    }
    .mobile-hidden {
      display: none;
    }
  }
```

- [ ] **Step 2: Apply the EXACT new base code**
Replace lines 208-214 with (clamp landscape width so it never gets absurdly narrow/wide):
```css
  .track-list {
    width: clamp(220px, 28vw, 420px);
    height: 65vh;
    padding: 20px 10px;
    border-radius: 20px;
    z-index: 20;
  }
```

- [ ] **Step 3: Apply the EXACT new media query**
Replace lines 251-263 with (orientation-portrait trigger; full-width capped, shorter height tuned for the portrait dock):
```css
  @media (orientation: portrait) {
    .track-list {
      width: 100%;
      max-width: min(92vw, 520px);
      margin: 0 auto;
      height: clamp(180px, 40vh, 420px);
    }
    #btn-view {
      width: 100%;
    }
    .mobile-hidden {
      display: none;
    }
  }
```

- [ ] **Step 4: Manual verify**
Run: `pnpm tauri:d`
Observe (portrait): the track list (atmosphere carousel) spans nearly the full window width (`min(92vw, 520px)`), is centered, and is a moderate height (~40vh) that fits within the stacked column dock without overflowing the screen. Resize to landscape: it returns to the ~28vw column on the side, and never shrinks below 220px even on a narrow landscape window.

- [ ] **Step 5: Commit**
```bash
git add src/lib/components/TrackList/index.svelte && git commit -m "fix(tracklist): portrait width/height overrides via min()/clamp()"
```

---

### Task B7: Portrait scroll — overflow-y:auto (layout-8)

**Files:**
- Modify: `src/styles.css:1-12` (`:root`)
- Modify: `src/styles.css:15-24` (`body`)

Global `overflow:hidden` on `:root` and `body` clips portrait content that now stacks taller than the viewport. Allow vertical scrolling in portrait only (landscape keeps `hidden`).

- [ ] **Step 1: Show the EXACT current `:root` and `body`**
Current `src/styles.css` lines 1-12:
```css
:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
  overflow: hidden;
}
```
Current lines 15-24:
```css
body {
  margin: 0;
  padding: 0;
  border-radius: 10px;
  background-color: transparent;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  user-select: none;
}
```

- [ ] **Step 2: Apply the EXACT new code**
Replace `:root` (lines 1-12) with (remove the unconditional `overflow:hidden` from `:root` and keep it scoped on `body`):
```css
:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
  overflow: hidden;
}
```
(`:root` is left as-is — landscape still clips.) Replace `body` (lines 15-24) with (`height:auto`-capable + scroll in portrait):
```css
body {
  margin: 0;
  padding: 0;
  border-radius: 10px;
  background-color: transparent;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  user-select: none;
}
```
Then add this portrait override block immediately after the closing `}` of the `.glass, #glass` rule (after `src/styles.css` line 101, before the existing `@media screen and (max-width: 600px)` block at line 104):
```css
@media (orientation: portrait) {
  :root,
  body {
    overflow-x: hidden;
    overflow-y: auto;
    height: auto;
    min-height: 100vh;
  }
}
```

- [ ] **Step 3: Manual verify**
Run: `pnpm tauri:d`
Observe (portrait, drag the window shorter than the stacked content, e.g. 480×560): the page now **scrolls vertically** — you can scroll the dock/atmosphere into view, nothing is clipped off-screen. Resize to landscape: scrolling is disabled again (content fits, `overflow:hidden` restored, no scrollbar).

- [ ] **Step 4: Commit**
```bash
git add src/styles.css && git commit -m "fix(styles): allow vertical scroll in portrait (overflow-y:auto)"
```

---

### Task B8: Immersion store — idle logic (TDD, pure)

**Files:**
- Create: `src/lib/stores/immersion.test.ts`
- Create: `src/lib/stores/immersion.ts`

Per the shared contract: writable `immersive` (default false), `export const IMMERSION_IDLE_MS = 3000`, `initIdleWatch(): () => void`, `toggleImmersive()`. The timer logic is factored into a pure-ish helper `createIdleTimer` that takes injectable `setTimeout`/`clearTimeout` and `onIdle`/`onActive` callbacks, so it is unit-testable with fake timers.

- [ ] **Step 1: Write the failing test**
Create `src/lib/stores/immersion.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { get } from "svelte/store";
import {
  immersive,
  toggleImmersive,
  IMMERSION_IDLE_MS,
  createIdleTimer,
} from "./immersion";

describe("immersion store", () => {
  beforeEach(() => {
    immersive.set(false);
  });

  it("exposes a 3000ms idle threshold", () => {
    expect(IMMERSION_IDLE_MS).toBe(3000);
  });

  it("toggleImmersive flips the boolean", () => {
    expect(get(immersive)).toBe(false);
    toggleImmersive();
    expect(get(immersive)).toBe(true);
    toggleImmersive();
    expect(get(immersive)).toBe(false);
  });
});

describe("createIdleTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls onIdle after the idle window with no activity", () => {
    const onIdle = vi.fn();
    const onActive = vi.fn();
    const timer = createIdleTimer({
      idleMs: 3000,
      onIdle,
      onActive,
      setTimeoutFn: setTimeout,
      clearTimeoutFn: clearTimeout,
    });
    timer.start();
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    expect(onIdle).toHaveBeenCalledTimes(1);
    timer.stop();
  });

  it("activity before the window resets the timer and fires onActive", () => {
    const onIdle = vi.fn();
    const onActive = vi.fn();
    const timer = createIdleTimer({
      idleMs: 3000,
      onIdle,
      onActive,
      setTimeoutFn: setTimeout,
      clearTimeoutFn: clearTimeout,
    });
    timer.start();
    vi.advanceTimersByTime(2000);
    timer.activity(); // user moved at 2s
    expect(onActive).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2000); // total 4s, but reset at 2s -> only 2s idle
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000); // now 3s since reset
    expect(onIdle).toHaveBeenCalledTimes(1);
    timer.stop();
  });

  it("onActive is not re-fired on every activity while already active", () => {
    const onIdle = vi.fn();
    const onActive = vi.fn();
    const timer = createIdleTimer({
      idleMs: 3000,
      onIdle,
      onActive,
      setTimeoutFn: setTimeout,
      clearTimeoutFn: clearTimeout,
    });
    timer.start();
    timer.activity();
    timer.activity();
    // still active, no idle reached -> onActive only fires when transitioning back from idle
    expect(onActive).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    expect(onIdle).toHaveBeenCalledTimes(1);
    timer.activity(); // transition idle -> active
    expect(onActive).toHaveBeenCalledTimes(1);
    timer.stop();
  });

  it("stop() cancels a pending idle callback", () => {
    const onIdle = vi.fn();
    const timer = createIdleTimer({
      idleMs: 3000,
      onIdle,
      onActive: vi.fn(),
      setTimeoutFn: setTimeout,
      clearTimeoutFn: clearTimeout,
    });
    timer.start();
    timer.stop();
    vi.advanceTimersByTime(5000);
    expect(onIdle).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**
Run: `pnpm test -- src/lib/stores/immersion.test.ts`
Expected: FAIL — `Failed to resolve import "./immersion"` (the module does not exist yet).

- [ ] **Step 3: Implement**
Create `src/lib/stores/immersion.ts`:
```ts
import { writable } from "svelte/store";

export const IMMERSION_IDLE_MS = 3000;

/** Writable: true = chrome hidden / immersive canvas. */
export const immersive = writable<boolean>(false);

export function toggleImmersive(): void {
  immersive.update((v) => !v);
}

type TimeoutId = ReturnType<typeof setTimeout>;

interface IdleTimerOptions {
  idleMs: number;
  onIdle: () => void;
  onActive: () => void;
  setTimeoutFn?: (fn: () => void, ms: number) => TimeoutId;
  clearTimeoutFn?: (id: TimeoutId) => void;
}

export interface IdleTimer {
  start(): void;
  stop(): void;
  activity(): void;
}

/**
 * Pure-ish idle timer. Injectable setTimeout/clearTimeout for fake-timer tests.
 * - start(): begin the idle countdown
 * - activity(): user did something -> if we were idle, fire onActive; reset countdown
 * - after idleMs of no activity -> fire onIdle (and remember we are idle)
 * - stop(): cancel any pending countdown
 */
export function createIdleTimer(opts: IdleTimerOptions): IdleTimer {
  const setT = opts.setTimeoutFn ?? setTimeout;
  const clearT = opts.clearTimeoutFn ?? clearTimeout;
  let handle: TimeoutId | null = null;
  let isIdle = false;

  function arm() {
    if (handle !== null) clearT(handle);
    handle = setT(() => {
      isIdle = true;
      opts.onIdle();
    }, opts.idleMs);
  }

  return {
    start() {
      isIdle = false;
      arm();
    },
    activity() {
      if (isIdle) {
        isIdle = false;
        opts.onActive();
      }
      arm();
    },
    stop() {
      if (handle !== null) {
        clearT(handle);
        handle = null;
      }
    },
  };
}

/**
 * Registers global mousemove/keydown listeners. After IMMERSION_IDLE_MS of no
 * activity -> immersive=true; on activity -> immersive=false. Returns a cleanup fn.
 */
export function initIdleWatch(): () => void {
  const timer = createIdleTimer({
    idleMs: IMMERSION_IDLE_MS,
    onIdle: () => immersive.set(true),
    onActive: () => immersive.set(false),
  });

  const onActivity = () => timer.activity();

  window.addEventListener("mousemove", onActivity);
  window.addEventListener("keydown", onActivity);
  timer.start();

  return () => {
    window.removeEventListener("mousemove", onActivity);
    window.removeEventListener("keydown", onActivity);
    timer.stop();
  };
}
```

- [ ] **Step 4: Run test, verify pass**
Run: `pnpm test -- src/lib/stores/immersion.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**
```bash
git add src/lib/stores/immersion.ts src/lib/stores/immersion.test.ts && git commit -m "feat(immersion): idle-watch store with unit-tested idle timer"
```

---

### Task B9: Wire .immersive class + toggle button + hotkey + idle watch into App.svelte

**Files:**
- Modify: `src/App.svelte:1-12` (imports)
- Modify: `src/App.svelte:13-50` (onMount — register idle watch + hotkey cleanup)
- Modify: `src/App.svelte:60-71` (markup — `.immersive` class + toggle button)
- Modify: `src/App.svelte:73-96` (styles — chrome fade)

Per contract: the root app element toggles a `.immersive` class bound to the `immersive` store that fades the chrome (TopBar + dock) via CSS transition; add a manual "Просторный режим" toggle button and a hotkey; register the idle watch in `onMount` and clean it up in `onDestroy`.

- [ ] **Step 1: Show the EXACT current imports + onMount head**
Current `src/App.svelte` lines 1-12:
```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { dir, locale } from "./lib/locales/store";
  import PlayButton from "./lib/PlayButton.svelte";
  import TrackList from "./lib/components/TrackList/index.svelte";
  import Controls from "./lib/components/Controls/index.svelte";
  import TopBar from "./lib/components/TopBar/TopBar.svelte";
  import Info from "./lib/components/InfoBox/Info.svelte";
  import Config from "./lib/Config.svelte";
  import ContextMenu from "./lib/components/ContextMenu/ContextMenu.svelte";
  import Tooltip from "./lib/components/Tooltip.svelte";
```

- [ ] **Step 2: Apply the new imports**
Replace lines 1-12 with (add `onDestroy`, the `Canvas` import from B3 if not already present, the immersion store, and `IconArrowsMaximize` for the toggle button — Tabler icons are already used across the app):
```svelte
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { IconArrowsMaximize } from "@tabler/icons-svelte";
  import { dir, locale } from "./lib/locales/store";
  import { immersive, initIdleWatch, toggleImmersive } from "./lib/stores/immersion";
  import PlayButton from "./lib/PlayButton.svelte";
  import TrackList from "./lib/components/TrackList/index.svelte";
  import Canvas from "./lib/components/Canvas/index.svelte";
  import Controls from "./lib/components/Controls/index.svelte";
  import TopBar from "./lib/components/TopBar/TopBar.svelte";
  import Info from "./lib/components/InfoBox/Info.svelte";
  import Config from "./lib/Config.svelte";
  import ContextMenu from "./lib/components/ContextMenu/ContextMenu.svelte";
  import Tooltip from "./lib/components/Tooltip.svelte";
```
(If Task B3 already added the `Canvas` import, do not duplicate it — keep a single import line.)

- [ ] **Step 3: Show the EXACT current onMount opening**
Current `src/App.svelte` line 13:
```svelte
  onMount(() => {
```
This `onMount` currently `return`s nothing (the bg-loading block has no return). Add the idle watch + hotkey registration with cleanup. Replace line 13:
```svelte
  onMount(() => {
```
with:
```svelte
  let cleanupIdle: (() => void) | null = null;

  function onImmersionHotkey(e: KeyboardEvent) {
    // Ctrl/Cmd + I toggles immersive mode; ignore while typing in inputs
    const t = e.target as HTMLElement | null;
    if (t && t.closest("input, textarea, select")) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      toggleImmersive();
    }
  }

  onMount(() => {
    cleanupIdle = initIdleWatch();
    window.addEventListener("keydown", onImmersionHotkey);
```
Then add the matching cleanup. Current `src/App.svelte` line 50 is the closing `});` of `onMount`. Immediately AFTER that closing `});` add:
```svelte
  onDestroy(() => {
    if (cleanupIdle) cleanupIdle();
    window.removeEventListener("keydown", onImmersionHotkey);
  });
```

- [ ] **Step 4: Show + update the markup**
Current `src/App.svelte` markup (after B3 it looks like this — lines 60-71):
```svelte
<main class="container">
  <Canvas />
  <Config />
  <TopBar />
  <section class="content">
    <TrackList />
    <Controls />
    <Info />
  </section>
  <PlayButton />
  <ContextMenu />
  <Tooltip />
</main>
```
Replace with (bind `.immersive` to the store; add the "Просторный режим" toggle button; wrap chrome elements so the fade targets them):
```svelte
<main class="container" class:immersive={$immersive}>
  <Canvas />
  <div class="chrome">
    <Config />
    <TopBar />
    <button
      class="immersion-toggle glass"
      class:active={$immersive}
      title="Просторный режим (Ctrl/Cmd+I)"
      aria-label="Просторный режим"
      on:click={toggleImmersive}
    >
      <IconArrowsMaximize size={18} />
    </button>
    <section class="content">
      <TrackList />
      <Controls />
      <Info />
    </section>
  </div>
  <PlayButton />
  <ContextMenu />
  <Tooltip />
</main>
```

- [ ] **Step 5: Update the styles for the chrome fade**
After B3 the `<style>` block ends with the `@media (orientation: portrait)` rule for `.content`. Add these rules inside `<style>` (before its closing `</style>`):
```css
  .chrome {
    transition: opacity 0.4s ease;
  }

  .container.immersive .chrome {
    opacity: 0;
    pointer-events: none;
  }

  .immersion-toggle {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 40;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .immersion-toggle.active {
    color: #9ad0ff;
  }
```
Note: the `.immersion-toggle` lives inside `.chrome`, so it also fades out when immersive is active. That is intended — the manual exit path while immersed is the **hotkey (Ctrl/Cmd+I)** or any mouse movement (the idle watch sets immersive=false on activity).

- [ ] **Step 6: Manual verify**
Run: `pnpm tauri:d`
Observe:
  1. Click the round arrows button (top-right): the TopBar and the dock (TrackList + Controls + Info) **fade out** smoothly, leaving the canvas; the button itself fades with them.
  2. Move the mouse: the chrome **fades back in** immediately (idle watch `onActive`).
  3. Stop touching the mouse/keyboard for ~3 seconds: the chrome **auto-fades out** (idle → immersive=true).
  4. Press `Ctrl+I` (or `Cmd+I` on macOS) while focus is not in a text input: it toggles immersive on/off.
  5. Type in a settings text field and press `Cmd/Ctrl+I`: nothing toggles (the input guard works).
  6. Close and reopen the app (or trigger an HMR reload): no duplicate listeners accumulate (the `onDestroy` cleanup removed the idle watch + hotkey).

- [ ] **Step 7: Commit**
```bash
git add src/App.svelte && git commit -m "feat(immersion): immersive mode (auto-hide chrome, toggle button, Ctrl/Cmd+I hotkey)"
```


## Блок C — Кнопки и UX


> Scope: honest button state, window-control wiring, keyboard-shortcut guards, info-box eye toggle, settings mount flash + click-outside leak. Most changes are `.svelte` markup/logic with a concrete manual-verify step under `pnpm tauri:d`. The one piece of pure, reusable logic — the "is the user typing?" guard — is extracted into `src/lib/utils/dom.ts` and gets a real Vitest unit test (used by C4).

---

### Task C1: Effect toggles set highlight only after play() succeeds (ui-3)

Fixes `ui-3`: Rain/Thunder/Jungle/CampFire flip their `isRaining`/`isStorming`/`isActive`/`isFire` flag **before** `play()` resolves, so the button highlights even if audio never starts. Set state inside `play().then()`, reset in `.catch()`, and set `loop`/`volume` **before** calling `play()`.

**Files:**
- Modify: `src/lib/components/Controls/Rain/index.svelte:11-21`
- Modify: `src/lib/components/Controls/Thunder/index.svelte:10-20`
- Modify: `src/lib/components/Controls/Jungle/index.svelte:10-20`
- Modify: `src/lib/components/Controls/CampFire/index.svelte:10-20`

- [ ] **Step 1: Show EXACT current code — Rain (`src/lib/components/Controls/Rain/index.svelte:11-21`)**
```svelte
  function toggleRain() {
    if (isRaining) {
      rain.pause();
    } else {
      rain.play();
      rain.loop = true;
      rain.volume = volume;
    }

    isRaining = !isRaining;
  }
```
Problem: `rain.play()` is fired before `loop`/`volume` are set, and `isRaining = !isRaining` flips unconditionally even if `play()` rejects (autoplay blocked) or the file 404s — the button lies.

- [ ] **Step 2: Show EXACT new code — Rain (`src/lib/components/Controls/Rain/index.svelte:11-21`)**
```svelte
  function toggleRain() {
    if (isRaining) {
      rain.pause();
      isRaining = false;
    } else {
      rain.loop = true;
      rain.volume = volume;
      rain
        .play()
        .then(() => {
          isRaining = true;
        })
        .catch(() => {
          isRaining = false;
        });
    }
  }
```

- [ ] **Step 3: Show EXACT new code — Thunder (`src/lib/components/Controls/Thunder/index.svelte:10-20`)**
Replace:
```svelte
  function toggleThunder() {
    if (isStorming) {
      storm.pause();
    } else {
      storm.play();
      storm.loop = true;
      storm.volume = volume;
    }

    isStorming = !isStorming;
  }
```
with:
```svelte
  function toggleThunder() {
    if (isStorming) {
      storm.pause();
      isStorming = false;
    } else {
      storm.loop = true;
      storm.volume = volume;
      storm
        .play()
        .then(() => {
          isStorming = true;
        })
        .catch(() => {
          isStorming = false;
        });
    }
  }
```

- [ ] **Step 4: Show EXACT new code — Jungle (`src/lib/components/Controls/Jungle/index.svelte:10-20`)**
Replace:
```svelte
  function toggleJungle() {
    if (isActive) {
      jungle.pause();
    } else {
      jungle.play();
      jungle.loop = true;
      jungle.volume = volume;
    }

    isActive = !isActive;
  }
```
with:
```svelte
  function toggleJungle() {
    if (isActive) {
      jungle.pause();
      isActive = false;
    } else {
      jungle.loop = true;
      jungle.volume = volume;
      jungle
        .play()
        .then(() => {
          isActive = true;
        })
        .catch(() => {
          isActive = false;
        });
    }
  }
```

- [ ] **Step 5: Show EXACT new code — CampFire (`src/lib/components/Controls/CampFire/index.svelte:10-20`)**
Replace:
```svelte
  function toggleFire() {
    if (isFire) {
      fire.pause();
    } else {
      fire.play();
      fire.loop = true;
      fire.volume = volume;
    }

    isFire = !isFire;
  }
```
with:
```svelte
  function toggleFire() {
    if (isFire) {
      fire.pause();
      isFire = false;
    } else {
      fire.loop = true;
      fire.volume = volume;
      fire
        .play()
        .then(() => {
          isFire = true;
        })
        .catch(() => {
          isFire = false;
        });
    }
  }
```

- [ ] **Step 6: Manual verify**
Run: `pnpm tauri:d`. Click the Rain button: it should highlight (white bg, black icon) only once rain audio is actually playing; click again, audio stops and highlight clears. Repeat for Thunder, Jungle, CampFire. To prove the `.catch()` path: temporarily rename `assets/engine/effects/rain.mp3` so the file 404s, reload, click Rain — the button must NOT highlight (previously it would). Restore the file afterward.

- [ ] **Step 7: Commit**
```bash
git add src/lib/components/Controls/Rain/index.svelte src/lib/components/Controls/Thunder/index.svelte src/lib/components/Controls/Jungle/index.svelte src/lib/components/Controls/CampFire/index.svelte && git commit -m "fix(ui-3): highlight effect buttons only after play() resolves"
```

---

### Task C2: Window controls work before async appWindow import resolves (ui-2)

Fixes `ui-2`: in `TopBar.svelte` the dynamic `import("@tauri-apps/api/webviewWindow")` is fired and forgotten; `appWindow` is replaced asynchronously, and the `try { import(...).then() } catch {}` only catches synchronous throws, never a rejected promise. Before it resolves, the child controls hold the no-op stub, so close/min/max are dead on first click. Fix: `await` the import inside an async `onMount` and add a `.catch`, and gate `barType` so the real platform bar only renders after `appWindow` is ready.

**Files:**
- Modify: `src/lib/components/TopBar/TopBar.svelte:6-12`
- Modify: `src/lib/components/TopBar/TopBar.svelte:17-45`
- Modify: `src/lib/components/TopBar/TopBar.svelte:48-60`

- [ ] **Step 1: Show EXACT current code (`src/lib/components/TopBar/TopBar.svelte:6-45`)**
```svelte
  let appWindow = {
    close: () => {},
    minimize: () => {},
    maximize: () => {},
    unmaximize: () => {},
    isMaximized: async () => false,
  };

  let barType = "generic" as "mac" | "generic" | "hidden";
  let noSideEffect = false; // Disable app controls changes side effects

  onMount(() => {
    const userAgent = navigator.userAgent || "";
    const platform = navigator.platform || "";

    const isTauri = "__TAURI_INTERNALS__" in window;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(userAgent);
    noSideEffect = isMobile || !isTauri;

    if (!isTauri) {
      barType = "hidden";
      return;
    }

    if (isTauri) {
      try {
        import("@tauri-apps/api/webviewWindow").then(
          ({ getCurrentWebviewWindow }) => {
            appWindow = getCurrentWebviewWindow();
          }
        );
      } catch (_e) {}
    }

    if (platform.includes("Mac")) {
      barType = "mac";
    } else {
      barType = "generic";
    }
  });
```
Problems: (a) `barType` is set to mac/generic synchronously while `appWindow` is still the stub, so the child mounts and binds its click handlers to no-ops; (b) a rejected import promise is unhandled — no `.catch`.

- [ ] **Step 2: Show EXACT new code (`src/lib/components/TopBar/TopBar.svelte:6-45`)**
```svelte
  let appWindow = {
    close: () => {},
    minimize: () => {},
    maximize: () => {},
    unmaximize: () => {},
    isMaximized: async () => false,
  };

  let barType = "hidden" as "mac" | "generic" | "hidden";
  let ready = false; // true once a real appWindow is bound
  let noSideEffect = false; // Disable app controls changes side effects

  onMount(async () => {
    const userAgent = navigator.userAgent || "";
    const platform = navigator.platform || "";

    const isTauri = "__TAURI_INTERNALS__" in window;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(userAgent);
    noSideEffect = isMobile || !isTauri;

    if (!isTauri) {
      barType = "hidden";
      return;
    }

    try {
      const { getCurrentWebviewWindow } = await import(
        "@tauri-apps/api/webviewWindow"
      );
      appWindow = getCurrentWebviewWindow();
      ready = true;
    } catch (_e) {
      ready = false;
    }

    barType = platform.includes("Mac") ? "mac" : "generic";
  });
```
Note: `barType` starts `"hidden"` and is only promoted to mac/generic **after** `await import(...)` has assigned the real `appWindow`, so the control buttons are never rendered against the stub.

- [ ] **Step 3: Show EXACT current markup (`src/lib/components/TopBar/TopBar.svelte:48-60`)**
```svelte
{#if barType !== "hidden"}
  <div class="titlebar glass" data-tauri-drag-region>
    {#if barType == "mac"}
      <MacControls {noSideEffect} {appWindow} />
    {/if}
    <div class="drag" data-tauri-drag-region>
      <img src="assets/dots.svg" alt="logo" width="18" />
    </div>
    {#if barType == "generic"}
      <GenericControls {noSideEffect} {appWindow} />
    {/if}
  </div>
{/if}
```

- [ ] **Step 4: Show EXACT new markup (`src/lib/components/TopBar/TopBar.svelte:48-60`)**
```svelte
{#if barType !== "hidden"}
  <div class="titlebar glass" data-tauri-drag-region>
    {#if barType == "mac" && ready}
      <MacControls {noSideEffect} {appWindow} />
    {/if}
    <div class="drag" data-tauri-drag-region>
      <img src="assets/dots.svg" alt="logo" width="18" />
    </div>
    {#if barType == "generic" && ready}
      <GenericControls {noSideEffect} {appWindow} />
    {/if}
  </div>
{/if}
```
The `&& ready` gate guarantees the controls mount only once a real `appWindow` exists, so the very first click on close/minimize/maximize hits the real window API.

- [ ] **Step 5: Manual verify**
Run: `pnpm tauri:d`. As soon as the window appears, immediately click the close/minimize/maximize button (do not wait). It must respond on the first click. Repeat several times with quick reloads (Cmd-R) and immediate clicks — the previously-flaky "dead until loaded" behaviour should be gone. On a non-mac platform the generic controls behave identically.

- [ ] **Step 6: Commit**
```bash
git add src/lib/components/TopBar/TopBar.svelte && git commit -m "fix(ui-2): await appWindow import and gate window controls behind ready flag"
```

---

### Task C3: Mac maximize button reflects the real window state (ui-7)

Fixes `ui-7`: in `MacControls.svelte` the maximize handler toggles a local `isMaximized` boolean it owns, which drifts from the real window state, and the corner-radius polling `setInterval` is never cleared (state-4 leak). Drive the button from `appWindow.isMaximized()` and clean up the interval on destroy.

**Files:**
- Modify: `src/lib/components/TopBar/MacControls.svelte:1-44`

- [ ] **Step 1: Show EXACT current code (`src/lib/components/TopBar/MacControls.svelte:1-44`)**
```svelte
<script lang="ts">
  import { onMount } from "svelte";

  let isMaximized = false;
  export let appWindow;
  export let noSideEffect = false;

  onMount(() => {
    const close = document.getElementById("close-mac");
    const minimize = document.getElementById("minimize-mac");
    const maximize = document.getElementById("maximize-mac");

    close.addEventListener("click", () => {
      appWindow.close();
    });

    minimize.addEventListener("click", () => {
      appWindow.minimize();
    });

    maximize.addEventListener("click", () => {
      if (isMaximized) {
        appWindow.unmaximize();
        isMaximized = false;
      } else {
        appWindow.maximize();
        isMaximized = true;
      }
    });

    // watch if window is maximized
    // from other sources apart from top bar
    !noSideEffect && setInterval(() => {
      appWindow.isMaximized().then((maximized) => {
        isMaximized = maximized;
        // Remove the rounded corners when maximized
        if (isMaximized) {
          document.body.style.borderRadius = "0px";
        } else {
          document.body.style.borderRadius = "10px";
        }
      });
    }, 300);
  });
</script>
```
Problems: the maximize click sets `isMaximized` optimistically (it can desync if the window is resized/maximized elsewhere before the next poll), and the `setInterval` handle is discarded — it keeps firing after the component is destroyed.

- [ ] **Step 2: Show EXACT new code (`src/lib/components/TopBar/MacControls.svelte:1-44`)**
```svelte
<script lang="ts">
  import { onMount } from "svelte";

  let isMaximized = false;
  export let appWindow;
  export let noSideEffect = false;

  async function syncMaximized() {
    const maximized = await appWindow.isMaximized();
    isMaximized = maximized;
    // Remove the rounded corners when maximized
    document.body.style.borderRadius = maximized ? "0px" : "10px";
  }

  onMount(() => {
    const close = document.getElementById("close-mac");
    const minimize = document.getElementById("minimize-mac");
    const maximize = document.getElementById("maximize-mac");

    const onClose = () => appWindow.close();
    const onMinimize = () => appWindow.minimize();
    const onMaximize = async () => {
      const maximized = await appWindow.isMaximized();
      if (maximized) {
        await appWindow.unmaximize();
      } else {
        await appWindow.maximize();
      }
      await syncMaximized();
    };

    close.addEventListener("click", onClose);
    minimize.addEventListener("click", onMinimize);
    maximize.addEventListener("click", onMaximize);

    // initial state + watch for changes from other sources (resize, OS)
    let interval: ReturnType<typeof setInterval> | undefined;
    if (!noSideEffect) {
      syncMaximized();
      interval = setInterval(syncMaximized, 300);
    }

    return () => {
      close.removeEventListener("click", onClose);
      minimize.removeEventListener("click", onMinimize);
      maximize.removeEventListener("click", onMaximize);
      if (interval) clearInterval(interval);
    };
  });
</script>
```
Now the button reads the real state via `appWindow.isMaximized()` on every click and on every 300 ms poll, the corner radius derives from that same source of truth, and the interval + click listeners are cleaned up on destroy.

- [ ] **Step 3: Manual verify**
Run: `pnpm tauri:d` on macOS. Click the green maximize dot — window maximizes and corners square off. Click it again — restores. Now maximize the window by **double-clicking the OS titlebar / dragging to top** instead of the dot; within ~300 ms the green dot's behaviour and the body corner radius must match the real state (clicking the dot once should restore, not re-maximize). The `isMaximized` flag should never desync.

- [ ] **Step 4: Commit**
```bash
git add src/lib/components/TopBar/MacControls.svelte && git commit -m "fix(ui-7): drive mac maximize button from appWindow.isMaximized and clean up interval"
```

---

### Task C4: Extract `isTypingTarget` guard + unit test (ui-4, part 1)

`ui-4`: letter shortcuts (`a`/`s`/`d`/`f`/`j`) fire while the user is typing in an input/textarea/contenteditable, and while modifier keys are held. The decision "should this keydown be ignored?" is pure logic, so extract it into a tested helper before wiring it into the effect components (C5).

**Files:**
- Create: `src/lib/utils/dom.ts`
- Test: `src/lib/utils/dom.test.ts`

- [ ] **Step 1: Write the failing test (`src/lib/utils/dom.test.ts`)**
```ts
import { describe, it, expect } from "vitest";
import { isTypingTarget } from "./dom";

function evt(partial: Partial<KeyboardEvent>): KeyboardEvent {
  return partial as KeyboardEvent;
}

describe("isTypingTarget", () => {
  it("returns false for a plain keydown on the body", () => {
    const target = document.createElement("div");
    expect(isTypingTarget(evt({ target, ctrlKey: false, metaKey: false, altKey: false }))).toBe(false);
  });

  it("returns true when focus is in an <input>", () => {
    const target = document.createElement("input");
    expect(isTypingTarget(evt({ target }))).toBe(true);
  });

  it("returns true when focus is in a <textarea>", () => {
    const target = document.createElement("textarea");
    expect(isTypingTarget(evt({ target }))).toBe(true);
  });

  it("returns true when focus is in a contenteditable element", () => {
    const target = document.createElement("div");
    target.setAttribute("contenteditable", "true");
    Object.defineProperty(target, "isContentEditable", { value: true });
    expect(isTypingTarget(evt({ target }))).toBe(true);
  });

  it("returns true when a modifier key is held (ctrl)", () => {
    const target = document.createElement("div");
    expect(isTypingTarget(evt({ target, ctrlKey: true }))).toBe(true);
  });

  it("returns true when the meta (cmd) key is held", () => {
    const target = document.createElement("div");
    expect(isTypingTarget(evt({ target, metaKey: true }))).toBe(true);
  });

  it("returns true when the alt key is held", () => {
    const target = document.createElement("div");
    expect(isTypingTarget(evt({ target, altKey: true }))).toBe(true);
  });

  it("returns false when target is null and no modifiers", () => {
    expect(isTypingTarget(evt({ target: null }))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**
Run: `pnpm test -- src/lib/utils/dom.test.ts`
Expected: FAIL — `Failed to resolve import "./dom"` / `isTypingTarget is not a function` (file does not exist yet).

- [ ] **Step 3: Implement (`src/lib/utils/dom.ts`)**
```ts
/**
 * Returns true when a keyboard event should NOT trigger a global single-letter
 * shortcut: focus is inside an editable field, or a modifier key is held.
 */
export function isTypingTarget(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) {
    return true;
  }

  const target = e.target;
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
```

- [ ] **Step 4: Run test, verify pass**
Run: `pnpm test -- src/lib/utils/dom.test.ts`
Expected: PASS (8 passing).

- [ ] **Step 5: Commit**
```bash
git add src/lib/utils/dom.ts src/lib/utils/dom.test.ts && git commit -m "feat(ui-4): add tested isTypingTarget keyboard-shortcut guard"
```

---

### Task C5: Wire `isTypingTarget` into effect-key shortcuts + move keydown into onMount (ui-4, part 2)

`ui-4`: apply the C4 guard to the four effect components so `a`/`s`/`d`/`f` no longer fire while typing or with modifiers, and move the keydown registration (currently at `<script>` top-level, never removed — a state-4 leak) into `onMount` with cleanup.

**Files:**
- Modify: `src/lib/components/Controls/Rain/index.svelte:1-3,23-40`
- Modify: `src/lib/components/Controls/Thunder/index.svelte:1-3,22-39`
- Modify: `src/lib/components/Controls/Jungle/index.svelte:1-3,22-38`
- Modify: `src/lib/components/Controls/CampFire/index.svelte:1-3,22-39`

- [ ] **Step 1: Show EXACT current code — Rain (`src/lib/components/Controls/Rain/index.svelte:1-3,23-40`)**
```svelte
<script lang="ts">
  import { IconCloudRain } from "@tabler/icons-svelte";
  import { onMount } from "svelte";
```
```svelte
  // Shortuct to toggle rain with "A" key
  window.addEventListener("keydown", (e) => {
    if (e.key === "a") {
      toggleRain();
    }
  });

  onMount(() => {
    window.addEventListener("lofi-toggle-rain", toggleRain);
    
    setInterval(() => {
      rain.volume = volume;
    },100);

    return () => {
      window.removeEventListener("lofi-toggle-rain", toggleRain);
    };
  });
```
Problems: keydown is registered at module-body time (fires for every component instance, never removed), fires while typing, and `setInterval` is not cleared.

- [ ] **Step 2: Show EXACT new code — Rain (`src/lib/components/Controls/Rain/index.svelte:1-3,23-40`)**
Imports become:
```svelte
<script lang="ts">
  import { IconCloudRain } from "@tabler/icons-svelte";
  import { onMount } from "svelte";
  import { isTypingTarget } from "../../../utils/dom";
```
Replace the top-level keydown block + `onMount` with:
```svelte
  // Shortcut to toggle rain with "A" key
  function onKeydown(e: KeyboardEvent) {
    if (isTypingTarget(e)) return;
    if (e.key === "a") {
      toggleRain();
    }
  }

  onMount(() => {
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("lofi-toggle-rain", toggleRain);

    const volumeTimer = setInterval(() => {
      rain.volume = volume;
    }, 100);

    return () => {
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("lofi-toggle-rain", toggleRain);
      clearInterval(volumeTimer);
    };
  });
```

- [ ] **Step 3: Show EXACT new code — Thunder (`src/lib/components/Controls/Thunder/index.svelte:1-3,22-39`)**
Add import after `import { onMount } from "svelte";`:
```svelte
  import { isTypingTarget } from "../../../utils/dom";
```
Replace:
```svelte
  // Shortuct to toggle storm with "S" key
  window.addEventListener("keydown", (e) => {
    if (e.key === "s") {
      toggleThunder();
    }
  });

  // Update volume
  onMount(() => {
    window.addEventListener("lofi-toggle-thunder", toggleThunder);
    setInterval(() => {
      storm.volume = volume;
    }, 100);

    return () => {
      window.removeEventListener("lofi-toggle-thunder", toggleThunder);
    };
  });
```
with:
```svelte
  // Shortcut to toggle storm with "S" key
  function onKeydown(e: KeyboardEvent) {
    if (isTypingTarget(e)) return;
    if (e.key === "s") {
      toggleThunder();
    }
  }

  onMount(() => {
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("lofi-toggle-thunder", toggleThunder);
    const volumeTimer = setInterval(() => {
      storm.volume = volume;
    }, 100);

    return () => {
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("lofi-toggle-thunder", toggleThunder);
      clearInterval(volumeTimer);
    };
  });
```

- [ ] **Step 4: Show EXACT new code — Jungle (`src/lib/components/Controls/Jungle/index.svelte:1-3,22-38`)**
Add import after `import { onMount } from "svelte";`:
```svelte
  import { isTypingTarget } from "../../../utils/dom";
```
Replace:
```svelte
  // Shortuct to toggle jungle with "D" key
  window.addEventListener("keydown", (e) => {
    if (e.key === "d") {
      toggleJungle();
    }
  });
  // Update volume
  onMount(() => {
    window.addEventListener("lofi-toggle-jungle", toggleJungle);
    setInterval(() => {
      jungle.volume = volume;
    },100);

    return () => {
      window.removeEventListener("lofi-toggle-jungle", toggleJungle);
    };
  });
```
with:
```svelte
  // Shortcut to toggle jungle with "D" key
  function onKeydown(e: KeyboardEvent) {
    if (isTypingTarget(e)) return;
    if (e.key === "d") {
      toggleJungle();
    }
  }

  onMount(() => {
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("lofi-toggle-jungle", toggleJungle);
    const volumeTimer = setInterval(() => {
      jungle.volume = volume;
    }, 100);

    return () => {
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("lofi-toggle-jungle", toggleJungle);
      clearInterval(volumeTimer);
    };
  });
```

- [ ] **Step 5: Show EXACT new code — CampFire (`src/lib/components/Controls/CampFire/index.svelte:1-3,22-39`)**
Add import after `import { onMount } from "svelte";`:
```svelte
  import { isTypingTarget } from "../../../utils/dom";
```
Replace:
```svelte
  // Shortuct to toggle fire with "F" key
  window.addEventListener("keydown", (e) => {
    if (e.key === "f") {
      toggleFire();
    }
  });

  // Update volume
  onMount(() => {
    window.addEventListener("lofi-toggle-campfire", toggleFire);
    setInterval(() => {
      fire.volume = volume;
    },100);

    return () => {
      window.removeEventListener("lofi-toggle-campfire", toggleFire);
    };
  });
```
with:
```svelte
  // Shortcut to toggle fire with "F" key
  function onKeydown(e: KeyboardEvent) {
    if (isTypingTarget(e)) return;
    if (e.key === "f") {
      toggleFire();
    }
  }

  onMount(() => {
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("lofi-toggle-campfire", toggleFire);
    const volumeTimer = setInterval(() => {
      fire.volume = volume;
    }, 100);

    return () => {
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("lofi-toggle-campfire", toggleFire);
      clearInterval(volumeTimer);
    };
  });
```

- [ ] **Step 6: Manual verify**
Run: `pnpm tauri:d`. Open Settings (`j`) and click into a text input (e.g. focus a language button is not a field — instead use the search/any input; if none, focus the browser devtools is not valid). Concretely: open the Info box, then click into any focusable input on screen and type the word "fads" — none of Rain/Thunder/Jungle/CampFire should toggle while typing. Click on empty canvas (blur the field), press `a`/`s`/`d`/`f` — each effect toggles. Hold Cmd and press `a` (select-all) — Rain must NOT toggle.

- [ ] **Step 7: Commit**
```bash
git add src/lib/components/Controls/Rain/index.svelte src/lib/components/Controls/Thunder/index.svelte src/lib/components/Controls/Jungle/index.svelte src/lib/components/Controls/CampFire/index.svelte && git commit -m "fix(ui-4): guard effect shortcuts against typing/modifiers and clean up listeners"
```

---

### Task C6: Settings no longer double-toggles on mount (ui-5)

Fixes `ui-5`: `Settings/index.svelte` calls `toggle()` twice in `onMount` (open then close 10 ms later) purely to force child side-effects, which visibly flashes the panel and dispatches a misleading `settings-open-changed` at startup. Remove the mount-time toggling; keep `isActive` initialised to `false` so the panel starts closed and children mount only when the user opens it.

**Files:**
- Modify: `src/lib/components/Controls/Settings/index.svelte:24-31`

- [ ] **Step 1: Show EXACT current code (`src/lib/components/Controls/Settings/index.svelte:24-31`)**
```svelte
  // when mounted toggle settings
  // to excute settings of children (old saved)
  onMount(() => {
    toggle();
    setTimeout(() => {
      toggle();
    }, 10);
  });
```
Problems: opens then closes the panel on every boot (visible flash), and fires two `settings-open-changed` events (`true` then `false`) that other components may react to. The only reason it exists is to mount Background/Volume/AutoDJ once so their saved-settings side-effects run — that responsibility moves to the Block B stores which apply persisted state at import time.

- [ ] **Step 2: Show EXACT new code (`src/lib/components/Controls/Settings/index.svelte:24-31`)**
```svelte
  // Children apply their saved settings via stores at load time, so we no
  // longer force-open the panel on mount (which caused a visible flash).
  // isActive stays false -> panel starts closed, no settings-open-changed at boot.
```
(The `onMount(...)` block and its `toggle()`/`setTimeout(toggle, 10)` are deleted entirely. `isActive = false` at line 10 is unchanged.)

- [ ] **Step 3: Verify no remaining mount toggling**
Run: `grep -n "onMount\|setTimeout" src/lib/components/Controls/Settings/index.svelte`
Expected: no `onMount`/`setTimeout` referencing `toggle()` remains. (The `import { onMount } from "svelte";` line at the top may now be unused — remove it too if `svelte-check` warns: run `pnpm check` and delete the import if flagged.)

- [ ] **Step 4: Manual verify**
Run: `pnpm tauri:d`. On startup the Settings panel must stay closed with NO flash of the settings container appearing/disappearing. Add a temporary `window.addEventListener("settings-open-changed", e => console.log("settings-open-changed", e.detail))` in devtools before reload to confirm zero events fire at boot. Click the gear (or press `j`) — panel opens normally; click again — it closes. Remove the temporary listener.

- [ ] **Step 5: Commit**
```bash
git add src/lib/components/Controls/Settings/index.svelte && git commit -m "fix(ui-5): stop settings panel from double-toggling and flashing on mount"
```

---

### Task C7: Settings click-outside listener registered once + cleaned up (ui-6)

Fixes `ui-6`: `Settings/index.svelte` registers `document.addEventListener("click", handleClickOutside)` at `<script>` body time, so every component init adds another listener and none is ever removed (state-4 leak / duplicate handling). Move it into `onMount` with cleanup. Same applies to the top-level `j`-key keydown, which has the same leak and lacks a typing guard.

**Files:**
- Modify: `src/lib/components/Controls/Settings/index.svelte:1-3,17-22,33-42`

- [ ] **Step 1: Show EXACT current code (`src/lib/components/Controls/Settings/index.svelte:1-3,17-22,33-42`)**
Imports:
```svelte
<script lang="ts">
  import { IconSettings } from "@tabler/icons-svelte";
  import { onMount } from "svelte";
```
Keydown shortcut:
```svelte
  // Shortuct to toggle settings with "J" key
  window.addEventListener("keydown", (e) => {
    if (e.key === "j") {
      toggle();
    }
  });
```
Click-outside:
```svelte
  const handleClickOutside = (event: MouseEvent) => {
    if (
      isActive &&
      event.target instanceof HTMLElement &&
      !event.target.closest("#settings-box")
    ) {
      isActive = false;
    }
  };
  document.addEventListener("click", handleClickOutside);
```
Problems: both `window.addEventListener("keydown", ...)` and `document.addEventListener("click", handleClickOutside)` run at module-body time and are never removed.

- [ ] **Step 2: Show EXACT new code — imports (`src/lib/components/Controls/Settings/index.svelte:1-3`)**
```svelte
<script lang="ts">
  import { IconSettings } from "@tabler/icons-svelte";
  import { onMount } from "svelte";
  import { isTypingTarget } from "../../../utils/dom";
```

- [ ] **Step 3: Show EXACT new code — keydown (`src/lib/components/Controls/Settings/index.svelte:17-22`)**
Replace the top-level keydown block with a named handler (registration moves to onMount in Step 5):
```svelte
  // Shortcut to toggle settings with "J" key
  function onKeydown(e: KeyboardEvent) {
    if (isTypingTarget(e)) return;
    if (e.key === "j") {
      toggle();
    }
  }
```

- [ ] **Step 4: Show EXACT new code — click-outside handler (`src/lib/components/Controls/Settings/index.svelte:33-42`)**
Replace the handler definition + the inline `document.addEventListener(...)` with just the handler (registration moves to onMount):
```svelte
  const handleClickOutside = (event: MouseEvent) => {
    if (
      isActive &&
      event.target instanceof HTMLElement &&
      !event.target.closest("#settings-box")
    ) {
      isActive = false;
    }
  };
```
(The line `document.addEventListener("click", handleClickOutside);` is deleted here.)

- [ ] **Step 5: Show EXACT new code — single onMount with cleanup**
Add this `onMount` (place it where the C6-removed onMount was, i.e. right after `handleClickOutside`, before the `languages` array at line ~44):
```svelte
  onMount(() => {
    window.addEventListener("keydown", onKeydown);
    document.addEventListener("click", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", onKeydown);
      document.removeEventListener("click", handleClickOutside);
    };
  });
```

- [ ] **Step 6: Manual verify**
Run: `pnpm tauri:d`. Open Settings, click anywhere outside the panel — it closes (one close, not flicker). Open and close the panel ~10 times, then in devtools run `getEventListeners(document).click?.length` (Chromium) — the count must stay constant (single registration), proving no listener accumulation. Press `j` to toggle Settings; type a `j` inside a text field — Settings must NOT toggle.

- [ ] **Step 7: Commit**
```bash
git add src/lib/components/Controls/Settings/index.svelte && git commit -m "fix(ui-6): register settings click-outside and keydown once with cleanup"
```

---

### Task C8: Info-box eye button is a real toggle with icon + tooltip feedback (ui-8)

Fixes `ui-8`: in `InfoBox/Info.svelte` the eye button calls `showNextTime()` (removes the localStorage flag) but gives **no visual feedback** — the user can't tell whether the box will reappear next launch. Make it a real toggle backed by `localStorage["shownBefore-info"]`, swapping `IconEye` ↔ `IconEyeOff` and updating the tooltip to reflect the current state.

**Files:**
- Modify: `src/lib/components/InfoBox/Info.svelte:1-2,8-18,31-33,50-56`
- Modify: `src/lib/locales/en.ts:47-49`
- Modify: `src/lib/locales/ru.ts:47-49`

- [ ] **Step 1: Show EXACT current code (`src/lib/components/InfoBox/Info.svelte:1-2,8-18,31-33`)**
Imports:
```svelte
  import { IconEye, IconX } from "@tabler/icons-svelte";
```
State + first-time logic:
```svelte
  let visible = false;

  function toggleInfoBox() {
    visible = !visible;
  }

  // First time, show info box
  if (!localStorage.getItem("shownBefore-info")) {
    toggleInfoBox();
    localStorage.setItem("shownBefore-info", "true");
  }
```
`showNextTime`:
```svelte
  function showNextTime() {
    localStorage.removeItem("shownBefore-info");
  }
```
Markup (`:50-56`):
```svelte
        <button
          id="show-btn"
          data-tooltip={$t.info.buttons.show_next_time}
          on:click={showNextTime}
        >
          <IconEye color="white" size={17} />
        </button>
```
Problem: clicking the eye removes the flag but the icon/tooltip never change, so there is no confirmation, and clicking again does nothing visible.

- [ ] **Step 2: Show EXACT new code — imports (`src/lib/components/InfoBox/Info.svelte:1-2`)**
```svelte
  import { IconEye, IconEyeOff, IconX } from "@tabler/icons-svelte";
```

- [ ] **Step 3: Show EXACT new code — state + first-time logic (`src/lib/components/InfoBox/Info.svelte:8-18`)**
```svelte
  let visible = false;

  // Reflects "will the info box show on next launch?":
  // true when the shownBefore-info flag is ABSENT.
  let showOnStart = !localStorage.getItem("shownBefore-info");

  function toggleInfoBox() {
    visible = !visible;
  }

  // First time, show info box
  if (showOnStart) {
    toggleInfoBox();
    localStorage.setItem("shownBefore-info", "true");
    showOnStart = false;
  }
```

- [ ] **Step 4: Show EXACT new code — replace `showNextTime` (`src/lib/components/InfoBox/Info.svelte:31-33`)**
```svelte
  function toggleShowOnStart() {
    showOnStart = !showOnStart;
    if (showOnStart) {
      // box WILL show next launch -> remove the "already shown" flag
      localStorage.removeItem("shownBefore-info");
    } else {
      // box will NOT show next launch
      localStorage.setItem("shownBefore-info", "true");
    }
  }
```

- [ ] **Step 5: Show EXACT new code — markup (`src/lib/components/InfoBox/Info.svelte:50-56`)**
```svelte
        <button
          id="show-btn"
          class:active={showOnStart}
          data-tooltip={showOnStart
            ? $t.info.buttons.shown_next_time
            : $t.info.buttons.show_next_time}
          on:click={toggleShowOnStart}
        >
          {#if showOnStart}
            <IconEye color="white" size={17} />
          {:else}
            <IconEyeOff color="white" size={17} />
          {/if}
        </button>
```

- [ ] **Step 6: Add the new locale key — `en.ts` (`src/lib/locales/en.ts:47-49`)**
Current:
```ts
        buttons: {
            show_next_time: 'Show on start next time',
        },
```
New:
```ts
        buttons: {
            show_next_time: 'Show on start next time',
            shown_next_time: 'Will show on next start',
        },
```

- [ ] **Step 7: Add the new locale key — `ru.ts` (`src/lib/locales/ru.ts:47-49`)**
Current:
```ts
        buttons: {
            show_next_time: 'Показывать при запуске',
        },
```
New:
```ts
        buttons: {
            show_next_time: 'Показывать при запуске',
            shown_next_time: 'Будет показано при запуске',
        },
```
(Other locale files — `fr.ts`, `nl.ts`, `zh.ts`, `hi.ts`, `ja.ts` — fall back via the `$t` store's default; if `pnpm check` flags a missing key add `shown_next_time` mirroring `show_next_time` there too. The translation type lives in `src/lib/locales/en.ts` shape, so update the type source if `svelte-check` errors.)

- [ ] **Step 8: Manual verify**
Run: `pnpm tauri:d`. The info box shows on first launch. Click the eye button: icon toggles to `IconEyeOff` and tooltip reads "Show on start next time"; click again: icon returns to `IconEye`, tooltip reads "Will show on next start", and `localStorage.getItem("shownBefore-info")` (check in devtools) is `null` when the eye is "on" (will show) and `"true"` when off. Close and relaunch with the eye left "on" — the box reappears; relaunch with it "off" — it stays hidden.

- [ ] **Step 9: Commit**
```bash
git add src/lib/components/InfoBox/Info.svelte src/lib/locales/en.ts src/lib/locales/ru.ts && git commit -m "fix(ui-8): make info-box eye a real show-on-start toggle with icon and tooltip feedback"
```

## Блок D — Бэкенд и i18n

### Task D1: Register tauri-plugin-shell + graceful startup (backend-1, backend-5, backend-2)

**Files:**
- Modify: `src-tauri/src/lib.rs:1-6`

This is a Rust/config task (not Vitest-unit-testable). Verification is `cargo check` + a manual click. The shell plugin is already a Cargo dependency (`src-tauri/Cargo.toml:23`) and already granted in capabilities (`src-tauri/capabilities/migrated.json:43-44`) but is NEVER registered, so it is a dead dependency AND external links cannot open. We fix backend-1/backend-5 (register the plugin) and backend-2 (no panic on startup) in one file.

- [ ] **Step 1: Show EXACT current code**
Current `src-tauri/src/lib.rs` (lines 1-6, verbatim):
```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running the application");
}
```
Problems: (a) `tauri_plugin_shell::init()` is never added — `shell:allow-open` in `capabilities/migrated.json` and the `tauri-plugin-shell` crate are inert; (b) `.expect(...)` panics on any startup error.

- [ ] **Step 2: Show EXACT new code**
Replace the entire body of `src-tauri/src/lib.rs` (lines 1-6) with:
```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!());

    if let Err(error) = result {
        eprintln!("Lofi Engine failed to start: {error}");
        std::process::exit(1);
    }
}
```
Notes: `.plugin(tauri_plugin_shell::init())` activates the already-installed `tauri-plugin-shell` crate (resolves backend-1 + backend-5). The `if let Err` branch logs the error to stderr and exits with code 1 instead of panicking (resolves backend-2). `eprintln!` uses Rust's inline format-arg capture (`{error}`), which is valid on edition 2021.

- [ ] **Step 3: Compile-check (fast)**
Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: PASS with no errors. There must be NO `unused crate dependency: tauri-plugin-shell` warning anymore (that warning was the backend-5 smell). If `cargo` is not on PATH, run `pnpm tauri:b` instead and confirm the Rust compile phase succeeds.

- [ ] **Step 4: Manual verify (full build)**
Run: `pnpm tauri:b`
Expected: build completes; bundle is produced. Then run `pnpm tauri:d`, and observe the app window opens normally (the graceful-start path is exercised on every launch; a clean launch proves we didn't break the happy path).

- [ ] **Step 5: Commit**
```bash
git add src-tauri/src/lib.rs && git commit -m "fix(backend): register shell plugin and exit gracefully on startup error"
```

---

### Task D2: Open external links via the system browser (backend-4)

**Files:**
- Modify: `src/lib/components/InfoBox/SocialLinks.svelte:1-24`

UI/markup task — depends on D1 (the shell plugin must be registered for `open()` to work at runtime). Not Vitest-unit-testable; verified by clicking the GitHub icon. Currently the `<a target="_blank">` does nothing useful inside a Tauri webview (no system browser opens). We intercept the click and call `open(url)` from `@tauri-apps/plugin-shell` (already a JS dependency in `package.json`).

- [ ] **Step 1: Show EXACT current code**
Current `src/lib/components/InfoBox/SocialLinks.svelte` script block (lines 1-9) and the GitHub link (lines 21-23), verbatim:
```svelte
<script lang="ts">
  import {
    IconBrandGithub,
    // IconBrandInstagram,
    // IconBrandPatreon,
    // IconBrandTwitter,
    // IconLink,
  } from "@tabler/icons-svelte";
</script>
```
```svelte
  <a href="https://github.com/meel-hd/lofi-engine" target="_blank">
    <IconBrandGithub size={25} />
  </a>
```
Problem: in the Tauri webview, `target="_blank"` does not open the system browser, so the GitHub link is effectively dead (backend-4).

- [ ] **Step 2: Show EXACT new script block**
Replace lines 1-9 (the `<script>` block) with:
```svelte
<script lang="ts">
  import {
    IconBrandGithub,
    // IconBrandInstagram,
    // IconBrandPatreon,
    // IconBrandTwitter,
    // IconLink,
  } from "@tabler/icons-svelte";
  import { open } from "@tauri-apps/plugin-shell";

  async function openExternal(event: MouseEvent, url: string) {
    event.preventDefault();
    await open(url);
  }
</script>
```

- [ ] **Step 3: Show EXACT new GitHub link**
Replace the GitHub anchor (lines 21-23) with:
```svelte
  <a
    href="https://github.com/meel-hd/lofi-engine"
    target="_blank"
    on:click={(e) => openExternal(e, "https://github.com/meel-hd/lofi-engine")}
  >
    <IconBrandGithub size={25} />
  </a>
```
Note: `href`/`target` are kept for accessibility and middle-click, but `on:click` with `event.preventDefault()` (inside `openExternal`) routes the normal left-click through `open()` so it opens in the user's real browser via the shell plugin.

- [ ] **Step 4: Manual verify**
Run: `pnpm tauri:d`. Open the Info box, click the GitHub icon.
Expected: your DEFAULT system browser opens `https://github.com/meel-hd/lofi-engine` in a new tab. The webview itself does NOT navigate away. Open DevTools console — there must be NO `shell.open not allowed` / `command shell|open not found` error (that would mean D1 was skipped or capabilities are wrong).

- [ ] **Step 5: Commit**
```bash
git add src/lib/components/InfoBox/SocialLinks.svelte && git commit -m "fix(backend): open external links in system browser via shell plugin"
```

---

### Task D3: Enable an explicit CSP + document App Store note (backend-3, backend-6)

**Files:**
- Modify: `src-tauri/tauri.conf.json:39-41`
- Modify: `docs/superpowers/specs/2026-06-14-lofi-engine-phase-1-foundation-design.md:126` (DOC-ONLY note for backend-6)

Config task, not Vitest-unit-testable; verified by a clean styled render in `pnpm tauri:d`. `csp: null` disables Content-Security-Policy entirely. We scope a CSP to the app. backend-6 is DOC-ONLY: `macOSPrivateApi: true` blocks Mac App Store submission, but direct DMG distribution is fine — we add a note, no code change to that flag.

- [ ] **Step 1: Show EXACT current code**
Current `src-tauri/tauri.conf.json` security block (lines 39-41), verbatim:
```json
    "security": {
      "csp": null
    }
```
And the backend-6 spec line (`docs/.../...design.md:126`), verbatim:
```
- `backend-6` macOSPrivateApi (App Store) → задокументировать ограничение (без изменений кода).
```

- [ ] **Step 2: Show EXACT new CSP**
Replace lines 39-41 of `src-tauri/tauri.conf.json` with:
```json
    "security": {
      "csp": "default-src 'self'; img-src 'self' asset: https://asset.localhost data:; media-src 'self' asset: https://asset.localhost data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' ipc: http://ipc.localhost"
    }
```
Rationale (each directive matters here):
- `style-src 'self' 'unsafe-inline'` — REQUIRED: Svelte 3 injects per-component `<style>` tags at runtime; without `'unsafe-inline'` the app renders completely unstyled.
- `img-src ... asset: https://asset.localhost data:` — background images (`bg1-10.webp`) and any data-URI icons load via the Tauri asset protocol.
- `media-src ... blob:` — Tone.js / audio samples may be served as `blob:`/asset URLs.
- `connect-src 'self' ipc: http://ipc.localhost` — Tauri v2 IPC transport (needed so commands like shell `open` keep working).
- `script-src 'self'` — no inline scripts; safe for the Vite-bundled app.

- [ ] **Step 3: Add the backend-6 DOC note (no code change to the flag)**
In `docs/superpowers/specs/2026-06-14-lofi-engine-phase-1-foundation-design.md`, replace line 126:
```
- `backend-6` macOSPrivateApi (App Store) → задокументировать ограничение (без изменений кода).
```
with:
```
- `backend-6` macOSPrivateApi (App Store) → задокументировать ограничение (без изменений кода).
  > **Примечание о распространении (backend-6):** `macOSPrivateApi: true` в `tauri.conf.json` нужен для прозрачного окна без рамки. Это приватный API Apple, поэтому **сборка не пройдёт в Mac App Store**. Прямое распространение (`.dmg` / прямое скачивание) — допустимо и является целевым каналом Фазы 1. Флаг НЕ меняем; при необходимости публикации в App Store его придётся отключить и вернуть стандартную рамку окна.
```
This is the entire backend-6 deliverable — no change to the `macOSPrivateApi` value.

- [ ] **Step 4: Manual verify**
Run: `pnpm tauri:d`.
Expected: the app looks EXACTLY as before — fully styled (rounded play button, glass panels, background image visible). Open DevTools console: there must be NO `Refused to apply inline style` or `Refused to load` CSP violation messages. Click the GitHub link again (from D2) — it must still open, proving `connect-src ipc:` did not break the shell command. A blank/white window means the CSP is too strict — re-check `style-src 'unsafe-inline'`.

- [ ] **Step 5: Commit**
```bash
git add src-tauri/tauri.conf.json docs/superpowers/specs/2026-06-14-lofi-engine-phase-1-foundation-design.md && git commit -m "fix(backend): set explicit app-scoped CSP and document macOS App Store limitation"
```

---

### Task D4: Compute text direction from locale (state-6)

**Files:**
- Create: `src/lib/locales/store.test.ts`
- Modify: `src/lib/locales/store.ts:29-31,38`

Pure logic → real TDD. Currently `dir` is hard-coded `'ltr'` (line 30) and `setLocale` hard-codes `document.documentElement.dir = 'ltr'` (line 38). We derive direction from the locale via an RTL set. Shipped locales (en/ja/zh/hi/fr/nl/ru) are all LTR, so the test also asserts a synthetic RTL code (`ar`) to make the mapping meaningful and future-proof.

- [ ] **Step 1: Write the failing test**
```ts
// src/lib/locales/store.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// localStorage is read at module top-level in store.ts, so stub it before import.
beforeEach(() => {
  const mem: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (k in mem ? mem[k] : null),
    setItem: (k: string, v: string) => { mem[k] = v; },
    removeItem: (k: string) => { delete mem[k]; },
    clear: () => { for (const k of Object.keys(mem)) delete mem[k]; },
  });
});

describe('dirForLocale (locale -> text direction)', () => {
  it('returns ltr for shipped LTR locales', async () => {
    const { dirForLocale } = await import('./store');
    expect(dirForLocale('en')).toBe('ltr');
    expect(dirForLocale('ru')).toBe('ltr');
    expect(dirForLocale('ja')).toBe('ltr');
    expect(dirForLocale('fr')).toBe('ltr');
  });

  it('returns rtl for known RTL languages', async () => {
    const { dirForLocale } = await import('./store');
    expect(dirForLocale('ar')).toBe('rtl');
    expect(dirForLocale('he')).toBe('rtl');
    expect(dirForLocale('fa')).toBe('rtl');
    expect(dirForLocale('ur')).toBe('rtl');
  });

  it('matches RTL by primary subtag, ignoring region', async () => {
    const { dirForLocale } = await import('./store');
    expect(dirForLocale('ar-EG')).toBe('rtl');
    expect(dirForLocale('en-US')).toBe('ltr');
  });

  it('falls back to ltr for unknown locales', async () => {
    const { dirForLocale } = await import('./store');
    expect(dirForLocale('xx')).toBe('ltr');
    expect(dirForLocale('')).toBe('ltr');
  });

  it('dir store reflects the active locale', async () => {
    const { get } = await import('svelte/store');
    const { dir, setLocale } = await import('./store');
    // Only shipped locales are accepted by setLocale; ru is LTR.
    setLocale('ru');
    expect(get(dir)).toBe('ltr');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**
Run: `pnpm test -- src/lib/locales/store.test.ts`
Expected: FAIL — `dirForLocale` is not exported from `store.ts` (import resolves to `undefined`), so `dirForLocale('en')` throws "dirForLocale is not a function".

- [ ] **Step 3: Implement**
Replace lines 29-31 of `src/lib/locales/store.ts`:
```ts
export const dir = derived(locale, () => {
    return 'ltr';
});
```
with:
```ts
const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi']);

export const dirForLocale = (lang: string): 'ltr' | 'rtl' => {
    const primary = (lang || '').toLowerCase().split('-')[0];
    return RTL_LANGS.has(primary) ? 'rtl' : 'ltr';
};

export const dir = derived(locale, ($locale) => dirForLocale($locale));
```
Then replace line 38 of `src/lib/locales/store.ts`:
```ts
        document.documentElement.dir = 'ltr';
```
with:
```ts
        document.documentElement.dir = dirForLocale(lang);
```

- [ ] **Step 4: Run test, verify pass**
Run: `pnpm test -- src/lib/locales/store.test.ts`
Expected: PASS (all 5 cases green).

- [ ] **Step 5: Commit**
```bash
git add src/lib/locales/store.ts src/lib/locales/store.test.ts && git commit -m "fix(i18n): derive text direction from locale instead of hard-coded ltr"
```

---

### Task D5: Wire the Auto-DJ settings panel to the shared store (state-7)

> The `autodj` store is created in **Task A2**; PlayButton's consumption is handled in **Task A5**. This task ONLY rewires the settings panel `AutoDJ.svelte` to the shared store and removes its local `mode` + the `auto-dj-mode-changed` window event.

**Files:**
- Modify: `src/lib/components/Controls/Settings/AutoDJ.svelte:1-25,30-38`

- [ ] **Step 1: Show EXACT current `<script>` (lines 1-25)**

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../../../locales/store";

  let mode = "MUSIC";

  $: MODES = [
    { id: "MUSIC", label: $t.settings.autodj.modes.music.label, desc: $t.settings.autodj.modes.music.desc },
    { id: "ATMOSPHERE", label: $t.settings.autodj.modes.atmosphere.label, desc: $t.settings.autodj.modes.atmosphere.desc },
    { id: "WORLD", label: $t.settings.autodj.modes.world.label, desc: $t.settings.autodj.modes.world.desc },
    { id: "MANUAL", label: $t.settings.autodj.modes.manual.label, desc: $t.settings.autodj.modes.manual.desc },
  ];

  onMount(() => {
    mode = localStorage.getItem("AutoDJMode") || "MUSIC";
  });

  function updateMode(newMode) {
    mode = newMode;
    localStorage.setItem("AutoDJMode", mode);
    window.dispatchEvent(
      new CustomEvent("auto-dj-mode-changed", { detail: { mode } })
    );
  }
</script>
```

- [ ] **Step 2: Replace the `<script>` with the store-wired version**

```svelte
<script lang="ts">
  import { t } from "../../../locales/store";
  import { autoDjMode, setAutoDjMode } from "../../../stores/autodj";
  import type { AutoDjMode } from "../../../stores/autodj";

  $: MODES = [
    { id: "MUSIC", label: $t.settings.autodj.modes.music.label, desc: $t.settings.autodj.modes.music.desc },
    { id: "ATMOSPHERE", label: $t.settings.autodj.modes.atmosphere.label, desc: $t.settings.autodj.modes.atmosphere.desc },
    { id: "WORLD", label: $t.settings.autodj.modes.world.label, desc: $t.settings.autodj.modes.world.desc },
    { id: "MANUAL", label: $t.settings.autodj.modes.manual.label, desc: $t.settings.autodj.modes.manual.desc },
  ];

  function updateMode(newMode: AutoDjMode) {
    setAutoDjMode(newMode);
  }
</script>
```

- [ ] **Step 3: Bind the active state to the store (lines 30-38)**

Replace:
```svelte
    {#each MODES as m}
      <button
        class:active={mode === m.id}
        on:click={() => updateMode(m.id)}
        data-tooltip={m.desc}
      >
        {m.label}
      </button>
    {/each}
```
with:
```svelte
    {#each MODES as m}
      <button
        class:active={$autoDjMode === m.id}
        on:click={() => updateMode(m.id)}
        data-tooltip={m.desc}
      >
        {m.label}
      </button>
    {/each}
```

- [ ] **Step 4: Manual verify**

Run `pnpm tauri:d`. Open Settings → Auto-DJ:
1. Previously selected mode is highlighted IMMEDIATELY on open (no MUSIC→stored flash) — proves sync init from A2.
2. Click WORLD; reopen Settings — still WORLD; reload — persists under `lofityan.autoDjMode`.
3. With music playing, WORLD transitions still fire (PlayButton reads `$autoDjMode` from A5) — no broken `auto-dj-mode-changed` bridge.
4. DevTools console: no errors about `auto-dj-mode-changed` or undefined `autoDJMode`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/Controls/Settings/AutoDJ.svelte && git commit -m "refactor(state): wire AutoDJ panel to shared autodj store, drop window-event bridge"
```

---

## Финал

### Task E1: Финальный QA-проход (обе ориентации + просторный режим + все кнопки)

Не TDD — ручной чек-лист «UX-дизайнера». Запусти `pnpm tauri:d`, пройди весь список, затем собери `pnpm tauri:b`.

**Files:**
- Create: `docs/superpowers/qa/phase-1-checklist.md` (зафиксировать результат прогона)

- [ ] **Step 1: Автотесты**

Run: `pnpm test`
Expected: ВСЕ тесты зелёные (volume, autodj, atmosphere, immersion, locale-dir, isTypingTarget, smoke).

- [ ] **Step 2: Музыка / звук**

- Play стартует с ПЕРВОГО клика и с пробела одинаково (audio-2, ui-1).
- «Новая музыка» (🔄) меняет прогрессию, музыка не виснет (audio-1).
- Слои «Атмосферы» (дождь/гром/лес/огонь/волны): клик и цифры 1–9 — без задвоения; быстрый тык не плодит дубли; «k» останавливает всё (audio-3,4,7, state-2,4).
- Громкость из настроек применяется без лагов; `grep -rn "setInterval" src/lib` не находит volume-поллинга (audio-5).

- [ ] **Step 3: Кнопки / UX**

- Кнопки эффектов подсвечиваются только когда звук реально играет (ui-3).
- Кнопки окна (закрыть/свернуть/развернуть) реагируют с первого клика; mac-«развернуть» отражает состояние (ui-2, ui-7).
- Кнопка-«глаз» — видимый тумблер (ui-8); панель настроек не моргает (ui-5); клик-вне закрывает стабильно (ui-6); буквенные хоткеи не срабатывают при вводе (ui-4).

- [ ] **Step 4: Вертикальный / портретный + просторный режим**

- Узкое/высокое окно: раскладка перестраивается в колонку (холст сверху, панель снизу), ничего не обрезано, есть прокрутка (layout-1,2,3,7,8).
- Визуализатор корректно масштабируется (layout-5).
- Простой мыши ~3 сек → управление плавно скрывается; движение/клавиша → возвращается; кнопка/хоткей «Просторный режим» работают (immersion).
- Ландшафт (горизонталь) — всё по-прежнему работает.

- [ ] **Step 5: Бэкенд / безопасность**

- Ссылка на GitHub открывается в системном браузере (backend-1,4).
- Нет ошибок CSP в консоли, приложение полностью стилизовано (backend-3).
- `pnpm tauri:b` собирается без ошибок Rust (backend-1,2,5).

- [ ] **Step 6: Зафиксировать результат и закоммитить**

Запиши пройденный чек-лист в `docs/superpowers/qa/phase-1-checklist.md` (что зелёное, что требует доработки).
```bash
git add docs/superpowers/qa/phase-1-checklist.md && git commit -m "docs(qa): Phase 1 manual QA checklist results"
```

---

## Приложение: риски и заметки по блокам

### A-stores-engine
- atmosphere store becomes the single owner of HTMLAudioElement instances; the previous code created Audio elements in BOTH TrackList/index.svelte AND TrackListItem.svelte (two paths to the same track id) which is the source of audio-3 double-trigger. After A3/A4 all creation goes through the store's module-private Map keyed by id, so a guard (isPlaying check in reduceToggle) prevents double-start. Verify manually that clicking a card AND pressing its number key never stack two audio elements.
- audio-5 fix removes the 100ms localStorage-polling setInterval in THREE places (PlayButton main_track vol, Controls/index volumes, Rain volume). All three must subscribe to the volumes store instead. If any consumer is missed it will keep polling; grep for setInterval after the change to confirm none remain for volume.
- autodj.ts reads localStorage SYNCHRONOUSLY at module init (state-7) to kill the default->stored flash. PlayButton and AutoDJ.svelte currently read 'AutoDJMode' in onMount; the store uses key 'lofityan.autoDjMode'. A one-time migration read of the legacy 'AutoDJMode' key is included so existing users keep their mode. Confirm the legacy key is still honored on first load.
- audio-2: making toggle()/startAudioContext() async changes the spacebar/handleButtonAction call sites. ui-1 requires spacebar to route through handleButtonAction() (which is now async); ensure the keydown handler does not double-fire toggle while Tone.start() is awaiting (guard with a starting flag).
- Tone.js side-effects are not unit-tested (Tauri/audio not available in jsdom). Only the pure store reducers/persistence/idle-timer get Vitest coverage; PlayButton/TrackList markup changes rely on the manual pnpm tauri:d checklist.
- The number-key (1-9) and 'k' (stop all) shortcuts must keep working after collapsing nine listeners into one keydown handler (state-4). Verify each digit toggles the correct atmosphere layer and 'k' stops all, with input-field guard so typing digits in the (future) search/inputs does not trigger toggles.

### B-layout-immersive
- Transparent/decorationless Tauri window in portrait: custom titlebar drag region and resize handles may behave oddly at 480x900 - must verify drag/resize on a real vertical monitor (spec risk 8.3).
- Removing global overflow:hidden in portrait can expose layout overflow that was previously clipped; verify nothing scrolls unexpectedly in landscape (the orientation media query must scope the change to portrait only).
- immersion idle watch adds global mousemove/keydown listeners; if cleanup from initIdleWatch() is not called in onDestroy, listeners and timers leak (same class of bug as state-4). Tests cover the timer logic but the onMount/onDestroy wiring is manual-verify only.
- The .immersive fade hides the dock (controls + atmosphere + settings); if pointer-events are not also disabled while faded, invisible chrome could still intercept clicks on the canvas.
- layout-3 raises the Controls breakpoint to orientation-portrait: the existing mobile CSS (position:absolute, 85vw) was written assuming a narrow viewport and may need the portrait dock context to look right - verify it does not overlap the play button.

### C-buttons-ux
- Effect components (Rain/Thunder/Jungle/CampFire) duplicate the same broken pattern; C1 must touch all four files. The volume-polling setInterval inside each onMount is slated to be replaced by the volume store in Block B (audio-5) — C1 only fixes the isRaining-before-play ordering and the loop/volume-before-play ordering, and leaves the setInterval in place so as not to collide with Block B. Coordinate so the later Block B refactor removes the setInterval and wires setEffectVolume.
- Audio.play() returns a Promise that REJECTS if the browser blocks autoplay or the element is not yet allowed to play; the new code must set state only in .then() and reset in .catch(), so a blocked first play correctly leaves the button un-highlighted instead of lying. In a Tauri webview autoplay after a user gesture (click) is permitted, so .then() will normally resolve.
- MacControls C7 changes maximize state to be driven by appWindow.isMaximized(); appWindow is passed from TopBar where it is replaced asynchronously after the dynamic import resolves. The polling interval already calls appWindow.isMaximized(), but the initial fallback stub returns Promise.resolve(false), so before the real window loads the button reads 'not maximized' — acceptable. The interval added in onMount must be cleared in the returned cleanup to avoid the state-4 leak; C7 adds that cleanup.
- Settings C5 removes the mount-time double-toggle whose ONLY purpose was to force child components (Background/Volume/AutoDJ) to run their saved-settings side-effects. Those children currently rely on being mounted (inside {#if isActive}) at least once to apply saved settings. After C5 they will NOT be mounted at startup, so any saved background/volume/autoDJ applied via their onMount will no longer fire until the user opens Settings. This is acceptable per the spec (Background/Volume/AutoDJ logic moves into the new stores in Block B which apply persisted state synchronously at import time), but C5 alone could regress saved-settings-on-boot if Block B is not yet merged. Sequence C5 after the relevant Block B stores, or have children apply persisted state at module load rather than on mount.
- Each effect component registers window keydown via a top-level `window.addEventListener` at <script> body time (not in onMount) and never removes it (state-4 leak). C4 moves the keydown handler logic into a named function but the FULL leak fix (onMount + removeEventListener) is part of the broader state-4 work; C4 here adds the isTypingTarget/modifier guard and moves registration into onMount with cleanup for the files it touches.
- InfoBox C8: the current 'eye' button calls showNextTime() which removes the localStorage flag so the box reappears next launch. Renaming/retooling it into a real toggle changes semantics from a one-shot action to a persisted boolean; the localStorage key stays `shownBefore-info` so behaviour is backwards compatible (flag present = don't show; absent = show).

### D-backend-i18n
- backend-3 CSP: Svelte 3 injects component styles as inline <style> tags at runtime, so style-src MUST include 'unsafe-inline' or the whole app renders unstyled. Tone.js/WebAudio does not need extra CSP directives, but @tabler/icons-svelte renders inline SVG (no CSP impact). Verify visually after build — a too-strict CSP shows a blank/white window with console 'Refused to apply inline style' errors.
- backend-2 graceful start: tauri::Builder::run returns Err only on context-generation/build failures that are effectively unrecoverable; exiting with code 1 after logging is the honest behavior. Do not swallow the error silently or the app will appear to 'do nothing' on launch.
- backend-1: registering tauri_plugin_shell::init() is required for @tauri-apps/plugin-shell open() to work even though capabilities already grant shell:allow-open — the capability without the plugin is dead config and open() will reject at runtime.
- state-7: AutoDJ mode currently lives in 3 places (AutoDJ.svelte local `mode`, PlayButton.svelte local `autoDJMode`, and the localStorage 'AutoDJMode' read in onMount which causes the default-then-flash). The shared store uses a NEW localStorage key `lofityan.autoDjMode` per contract; the WORLD/ATMOSPHERE auto-transition logic in PlayButton (lines 244-261) must keep reading the same live mode value via $autoDjMode, otherwise auto-DJ silently stops reacting.
- state-7: removing the `auto-dj-mode-changed` window CustomEvent bridge means any OTHER listener of that event breaks. Grep confirmed only AutoDJ.svelte dispatches and PlayButton.svelte listens, so it is safe to remove — but re-grep before deleting in case other blocks added listeners.
- state-6 RTL: only Arabic/Hebrew/Persian/Urdu are RTL; the current locale set (en/ja/zh/hi/fr/nl/ru) has NO RTL members, so the mapping is forward-looking. The test must include at least one synthetic RTL code (e.g. 'ar') to be meaningful even though 'ar' is not yet a shipped locale.
- Rust changes are NOT unit-tested by Vitest; they MUST be verified with `cargo check` in src-tauri (fast) and a full `pnpm tauri:b` plus a manual GitHub-link click in `pnpm tauri:d`. Skipping the manual click means backend-1+backend-4 could regress silently (button looks fine, opens nothing).

