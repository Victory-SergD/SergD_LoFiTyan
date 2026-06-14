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

  it("setLayer(on) starts once and setLayer(off) stops, idempotently (no double-trigger)", async () => {
    const created: FakeAudio[] = [];
    const { atmosphere, setLayer, setAudioFactory } = await import("./atmosphere");
    setAudioFactory((src) => {
      const a = new FakeAudio(src);
      created.push(a);
      return a as unknown as HTMLAudioElement;
    });
    const id = get(atmosphere)[0].id;

    // turning on twice must start audio exactly once
    setLayer(id, true);
    setLayer(id, true);
    expect(created.length).toBe(1);
    expect(created[0].played).toBe(1);
    expect(created[0].loop).toBe(true);
    expect(get(atmosphere)[0].isPlaying).toBe(true);

    // turning off twice must pause and stay off, no new element
    setLayer(id, false);
    setLayer(id, false);
    expect(created.length).toBe(1);
    expect(created[0].paused).toBe(true);
    expect(get(atmosphere)[0].isPlaying).toBe(false);
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

describe("atmosphere master volume (VOLUME-1)", () => {
  it("startLayer applies per-channel × master to the live element", async () => {
    const created: FakeAudio[] = [];
    const { atmosphere, toggleLayer, setLayerVolume, setAudioFactory } = await import("./atmosphere");
    const { setMaster } = await import("./volume");
    setAudioFactory((src) => {
      const a = new FakeAudio(src);
      created.push(a);
      return a as unknown as HTMLAudioElement;
    });
    const id = get(atmosphere)[0].id;
    setMaster(0.5);
    setLayerVolume(id, 0.8); // per-channel = 0.8
    toggleLayer(id); // start AFTER setting master + per-channel
    expect(created[0].volume).toBeCloseTo(0.8 * 0.5); // 0.4
    // the stored per-channel value stays untouched by master
    expect(get(atmosphere).find((l) => l.id === id)!.volume).toBe(0.8);
  });

  it("setLayerVolume applies per-channel × master to the live element", async () => {
    const created: FakeAudio[] = [];
    const { atmosphere, toggleLayer, setLayerVolume, setAudioFactory } = await import("./atmosphere");
    const { setMaster } = await import("./volume");
    setAudioFactory((src) => {
      const a = new FakeAudio(src);
      created.push(a);
      return a as unknown as HTMLAudioElement;
    });
    const id = get(atmosphere)[0].id;
    toggleLayer(id);
    setMaster(0.25);
    setLayerVolume(id, 0.6);
    expect(created[0].volume).toBeCloseTo(0.6 * 0.25); // 0.15
    expect(get(atmosphere).find((l) => l.id === id)!.volume).toBe(0.6);
  });

  it("changing master re-applies per-channel × master to all live elements", async () => {
    const created: FakeAudio[] = [];
    const { atmosphere, toggleLayer, setLayerVolume, setAudioFactory } = await import("./atmosphere");
    const { setMaster } = await import("./volume");
    setAudioFactory((src) => {
      const a = new FakeAudio(src);
      created.push(a);
      return a as unknown as HTMLAudioElement;
    });
    const ids = get(atmosphere).map((l) => l.id);
    toggleLayer(ids[0]);
    toggleLayer(ids[1]);
    setLayerVolume(ids[0], 0.4);
    setLayerVolume(ids[1], 0.9);
    // master starts at 1 → elements at their per-channel volumes
    expect(created[0].volume).toBeCloseTo(0.4);
    expect(created[1].volume).toBeCloseTo(0.9);
    // bump master and assert every live element re-attenuates
    setMaster(0.5);
    expect(created[0].volume).toBeCloseTo(0.4 * 0.5); // 0.2
    expect(created[1].volume).toBeCloseTo(0.9 * 0.5); // 0.45
    // stored per-channel values are unchanged
    expect(get(atmosphere).find((l) => l.id === ids[0])!.volume).toBe(0.4);
    expect(get(atmosphere).find((l) => l.id === ids[1])!.volume).toBe(0.9);
  });

  it("master = 1 is a no-op (effective volume equals per-channel)", async () => {
    const created: FakeAudio[] = [];
    const { atmosphere, toggleLayer, setLayerVolume, setAudioFactory } = await import("./atmosphere");
    const { setMaster } = await import("./volume");
    setAudioFactory((src) => {
      const a = new FakeAudio(src);
      created.push(a);
      return a as unknown as HTMLAudioElement;
    });
    const id = get(atmosphere)[0].id;
    setMaster(1);
    toggleLayer(id);
    setLayerVolume(id, 0.7);
    expect(created[0].volume).toBe(0.7);
  });
});
