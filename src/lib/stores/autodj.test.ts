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
