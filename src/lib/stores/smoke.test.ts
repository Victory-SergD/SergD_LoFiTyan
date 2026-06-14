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
