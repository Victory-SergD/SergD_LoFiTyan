import { describe, it, expect, beforeEach, vi } from "vitest";

class FakeSource {
  buffer: unknown = null;
  loop = false;
  started = false;
  stopped = false;
  // source.connect(gain) must return gain (so gain.connect can be called next)
  connect(n: unknown) { return n; }
  start() { this.started = true; }
  stop() { this.stopped = true; }
  disconnect() {}
}

class FakeGain {
  gain = { value: 1 };
  // gain.connect(destination) must return something (the destination)
  connect(n: unknown) { return n; }
  disconnect() {}
}

class FakeCtx {
  state = "running";
  destination = {};
  sources: FakeSource[] = [];
  resume() { this.state = "running"; return Promise.resolve(); }
  decodeAudioData() { return Promise.resolve({} as AudioBuffer); }
  createGain() { return new FakeGain(); }
  createBufferSource() {
    const s = new FakeSource();
    this.sources.push(s);
    return s;
  }
}

let lastCtx: FakeCtx;

beforeEach(() => {
  vi.resetModules();
  lastCtx = new FakeCtx();
  vi.stubGlobal("AudioContext", function () { return lastCtx; } as unknown as typeof AudioContext);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) })
  );
});

describe("audioLoop concurrency", () => {
  it("two rapid play() calls create only one source", async () => {
    const { createLoop } = await import("./audioLoop");
    const loop = createLoop("x.mp3");
    await Promise.all([loop.play(), loop.play()]);
    expect(lastCtx.sources.length).toBe(1);
    expect(loop.isPlaying()).toBe(true);
  });

  it("stop() during an in-flight play() leaves it stopped (no source starts)", async () => {
    const { createLoop } = await import("./audioLoop");
    const loop = createLoop("x.mp3");
    const p = loop.play();  // don't await — fire and forget
    loop.stop();            // cancel before decode resolves
    await p;
    expect(loop.isPlaying()).toBe(false);
    expect(lastCtx.sources.every((s) => !s.started)).toBe(true);
  });

  it("play then stop tracks isPlaying correctly", async () => {
    const { createLoop } = await import("./audioLoop");
    const loop = createLoop("x.mp3");
    await loop.play();
    expect(loop.isPlaying()).toBe(true);
    loop.stop();
    expect(loop.isPlaying()).toBe(false);
  });
});
