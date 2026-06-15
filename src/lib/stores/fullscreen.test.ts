import { describe, it, expect, beforeEach } from "vitest";
import { get } from "svelte/store";
import { fullscreen, toggleFullscreen, exitFullscreen } from "./fullscreen";

// In jsdom there is no `__TAURI_INTERNALS__`, so the native call is skipped and
// the store flips directly — which is exactly the behaviour we assert here.
describe("fullscreen store (non-Tauri env)", () => {
  beforeEach(() => fullscreen.set(false));

  it("toggleFullscreen flips the store on and back off", async () => {
    expect(get(fullscreen)).toBe(false);
    await toggleFullscreen();
    expect(get(fullscreen)).toBe(true);
    await toggleFullscreen();
    expect(get(fullscreen)).toBe(false);
  });

  it("exitFullscreen forces false and is a no-op when already windowed", async () => {
    await toggleFullscreen(); // -> true
    expect(get(fullscreen)).toBe(true);
    await exitFullscreen();
    expect(get(fullscreen)).toBe(false);
    await exitFullscreen(); // already false -> stays false
    expect(get(fullscreen)).toBe(false);
  });
});
