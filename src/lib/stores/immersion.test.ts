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
    timer.activity(); // user moved at 2s — still active (never went idle), so no onActive
    expect(onActive).not.toHaveBeenCalled();
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
