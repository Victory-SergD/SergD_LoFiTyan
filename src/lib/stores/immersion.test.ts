import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { get } from "svelte/store";
import {
  immersive,
  toggleImmersive,
  initIdleWatch,
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

  it("reset() re-arms the countdown without flipping the idle flag", () => {
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
    timer.reset(); // fresh 3s window, but no onActive (we were never idle)
    expect(onActive).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000); // 2s since reset
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000); // 3s since reset
    expect(onIdle).toHaveBeenCalledTimes(1);
    timer.stop();
  });

  it("setIdle(false) makes a later activity NOT fire onActive even after idle", () => {
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
    vi.advanceTimersByTime(3000); // goes idle
    expect(onIdle).toHaveBeenCalledTimes(1);
    timer.setIdle(false); // a manual toggle synced the flag to "active"
    timer.activity(); // would normally fire onActive, but flag is now false
    expect(onActive).not.toHaveBeenCalled();
    timer.stop();
  });
});

describe("immersion idle watch vs manual toggle (BUG 6)", () => {
  beforeEach(() => {
    immersive.set(false);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    immersive.set(false);
  });

  it("(a) a manual ON survives a subsequent mousemove for at least one idle window", () => {
    const cleanup = initIdleWatch();

    // User manually enters immersive mode.
    toggleImmersive();
    expect(get(immersive)).toBe(true);

    // The very next cursor move must NOT kick us out of immersive mode.
    window.dispatchEvent(new MouseEvent("mousemove"));
    expect(get(immersive)).toBe(true);

    // And it stays ON across a full idle window (onIdle is a guarded no-op).
    vi.advanceTimersByTime(IMMERSION_IDLE_MS);
    expect(get(immersive)).toBe(true);

    cleanup();
  });

  it("(b) a manual OFF after auto-idle is not immediately re-set on the next idle tick", () => {
    const cleanup = initIdleWatch();

    // Auto-idle kicks in -> immersive.
    vi.advanceTimersByTime(IMMERSION_IDLE_MS);
    expect(get(immersive)).toBe(true);

    // User opts back out manually.
    toggleImmersive();
    expect(get(immersive)).toBe(false);

    // The stale pending tick must not immediately flip it back on; the user
    // keeps a fresh non-immersive window.
    vi.advanceTimersByTime(IMMERSION_IDLE_MS - 1);
    expect(get(immersive)).toBe(false);

    cleanup();
  });

  it("idle does not re-fire immersive=true when already immersive", () => {
    const cleanup = initIdleWatch();
    const calls: boolean[] = [];
    const unsub = immersive.subscribe((v) => calls.push(v));
    calls.length = 0; // ignore the initial subscribe emit

    toggleImmersive(); // -> true (one write)
    vi.advanceTimersByTime(IMMERSION_IDLE_MS * 2); // idle ticks should be no-ops

    // Only the manual toggle wrote `true`; the guarded onIdle did not re-emit.
    expect(calls.filter((v) => v === true).length).toBe(1);

    unsub();
    cleanup();
  });
});
