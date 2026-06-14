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
