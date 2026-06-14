import { writable } from "svelte/store";

export const IMMERSION_IDLE_MS = 3000;

/** Writable: true = chrome hidden / immersive canvas. */
export const immersive = writable<boolean>(false);

export function toggleImmersive(): void {
  immersive.update((v) => !v);
}

// setTimeout returns `number` in the DOM lib and `Timeout` under @types/node;
// accept either so injected timers (tests) and the browser default both type-check.
type TimeoutId = ReturnType<typeof setTimeout> | number;

interface IdleTimerOptions {
  idleMs: number;
  onIdle: () => void;
  onActive: () => void;
  setTimeoutFn?: (fn: () => void, ms: number) => TimeoutId;
  clearTimeoutFn?: (id: TimeoutId) => void;
}

export interface IdleTimer {
  start(): void;
  stop(): void;
  activity(): void;
}

/**
 * Pure-ish idle timer. Injectable setTimeout/clearTimeout for fake-timer tests.
 * - start(): begin the idle countdown
 * - activity(): user did something -> if we were idle, fire onActive; reset countdown
 * - after idleMs of no activity -> fire onIdle (and remember we are idle)
 * - stop(): cancel any pending countdown
 */
export function createIdleTimer(opts: IdleTimerOptions): IdleTimer {
  const setT = opts.setTimeoutFn ?? setTimeout;
  const clearT = opts.clearTimeoutFn ?? clearTimeout;
  let handle: TimeoutId | null = null;
  let isIdle = false;

  function arm() {
    if (handle !== null) clearT(handle);
    handle = setT(() => {
      isIdle = true;
      opts.onIdle();
    }, opts.idleMs);
  }

  return {
    start() {
      isIdle = false;
      arm();
    },
    activity() {
      if (isIdle) {
        isIdle = false;
        opts.onActive();
      }
      arm();
    },
    stop() {
      if (handle !== null) {
        clearT(handle);
        handle = null;
      }
    },
  };
}

/**
 * Registers global mousemove/keydown listeners. After IMMERSION_IDLE_MS of no
 * activity -> immersive=true; on activity -> immersive=false. Returns a cleanup fn.
 */
export function initIdleWatch(): () => void {
  const timer = createIdleTimer({
    idleMs: IMMERSION_IDLE_MS,
    onIdle: () => immersive.set(true),
    onActive: () => immersive.set(false),
  });

  const onActivity = () => timer.activity();

  window.addEventListener("mousemove", onActivity);
  window.addEventListener("keydown", onActivity);
  timer.start();

  return () => {
    window.removeEventListener("mousemove", onActivity);
    window.removeEventListener("keydown", onActivity);
    timer.stop();
  };
}
