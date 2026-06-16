import { describe, it, expect, beforeEach } from "vitest";
import { get } from "svelte/store";
import {
  bgMedia,
  setBgMedia,
  setFocal,
  setScale,
  getTransform,
  hasTransform,
  saveTransform,
} from "./background";

beforeEach(() => {
  bgMedia.set(null);
  localStorage.clear();
});

describe("bgMedia store", () => {
  it("starts null", () => {
    expect(get(bgMedia)).toBeNull();
  });

  it("setBgMedia sets kind, src, and defaults focal/scale", () => {
    setBgMedia("image", "u");
    expect(get(bgMedia)).toEqual({ kind: "image", src: "u", focalX: 50, focalY: 50, scale: 1 });
  });

  it("setBgMedia clamps scale to MAX_SCALE (3)", () => {
    setBgMedia("video", "p", 10, 90, 5);
    expect(get(bgMedia)).toEqual({ kind: "video", src: "p", focalX: 10, focalY: 90, scale: 3 });
  });

  it("setFocal clamps out-of-range values and keeps kind/src/scale", () => {
    setBgMedia("image", "u", 50, 50, 1);
    setFocal(120, -1);
    expect(get(bgMedia)).toEqual({ kind: "image", src: "u", focalX: 100, focalY: 0, scale: 1 });
  });

  it("setScale clamps to MIN_SCALE (1) when below", () => {
    setBgMedia("image", "u");
    setScale(0.2);
    expect(get(bgMedia)!.scale).toBe(1);
  });

  it("setScale clamps to MAX_SCALE (3) when above", () => {
    setBgMedia("image", "u");
    setScale(9);
    expect(get(bgMedia)!.scale).toBe(3);
  });

  it("setFocal is a no-op when bgMedia is null", () => {
    setFocal(50, 50);
    expect(get(bgMedia)).toBeNull();
  });

  it("setScale is a no-op when bgMedia is null", () => {
    setScale(2);
    expect(get(bgMedia)).toBeNull();
  });
});

describe("transform persistence", () => {
  it("saveTransform then getTransform returns saved values", () => {
    saveTransform("x", { focalX: 10, focalY: 20, scale: 2 });
    expect(getTransform("x")).toEqual({ focalX: 10, focalY: 20, scale: 2 });
  });

  it("getTransform returns defaults for unknown id", () => {
    expect(getTransform("absent")).toEqual({ focalX: 50, focalY: 50, scale: 1 });
  });

  it("hasTransform returns true for saved id", () => {
    saveTransform("x", { focalX: 10, focalY: 20, scale: 2 });
    expect(hasTransform("x")).toBe(true);
  });

  it("hasTransform returns false for absent id", () => {
    expect(hasTransform("absent")).toBe(false);
  });
});
