import { describe, it, expect, beforeEach } from "vitest";
import { get } from "svelte/store";
import { videoBg, setVideoBg, setFocal, clearVideoBg } from "./background";

beforeEach(() => {
  clearVideoBg();
});

describe("videoBg store", () => {
  it("starts null", () => {
    expect(get(videoBg)).toBeNull();
  });

  it("setVideoBg sets path and focal", () => {
    setVideoBg("/a/b.mp4", 30, 70);
    expect(get(videoBg)).toEqual({ path: "/a/b.mp4", focalX: 30, focalY: 70 });
  });

  it("setVideoBg defaults focal to 50/50", () => {
    setVideoBg("/x.mp4");
    expect(get(videoBg)).toEqual({ path: "/x.mp4", focalX: 50, focalY: 50 });
  });

  it("setFocal clamps out-of-range values and keeps path", () => {
    setVideoBg("/x.mp4", 50, 50);
    setFocal(120, -5);
    expect(get(videoBg)).toEqual({ path: "/x.mp4", focalX: 100, focalY: 0 });
  });

  it("setFocal is a no-op when videoBg is null", () => {
    setFocal(50, 50);
    expect(get(videoBg)).toBeNull();
  });

  it("clearVideoBg sets store to null", () => {
    setVideoBg("/x.mp4");
    clearVideoBg();
    expect(get(videoBg)).toBeNull();
  });
});
