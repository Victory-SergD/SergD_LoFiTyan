import { writable, get } from "svelte/store";

export const IMMERSION_IDLE_MS = 8000;

/** Writable: true = chrome hidden / immersive canvas. */
export const immersive = writable<boolean>(false);

// The currently-active idle timer (set by initIdleWatch). A manual toggle syncs
// this so the idle watcher doesn't immediately undo the user's choice.
let activeTimer: IdleTimer | null = null;

export function toggleImmersive(): void {
  const next = !get(immersive);
  immersive.set(next);
  // Sync the idle timer with this manual choice so the idle watcher doesn't
  // immediately undo it. A manual toggle counts as "user just acted", so we
  // clear the internal idle flag and re-arm a fresh countdown:
  // - manual ON  -> the next mousemove no longer fires onActive (it would only
  //   fire when transitioning *from* idle), so immersive stays ON through the
  //   next idle window instead of flickering off on the first cursor move.
  // - manual OFF after an auto-idle -> the stale pending idle tick is replaced
  //   by a fresh window, so immersive isn't re-set the instant the user opts out.
  if (activeTimer) {
    activeTimer.setIdle(false);
    activeTimer.reset();
  }
}

/**
 * Pause the auto-hide while the pointer is over the controls (BUG A). Ensures
 * the controls are shown (immersive=false) and freezes the idle countdown so
 * the chrome is never hidden out from under the cursor. No-op if no watch is
 * active.
 */
export function pauseIdleWatch(): void {
  if (get(immersive)) immersive.set(false);
  if (activeTimer) activeTimer.pause();
}

/**
 * Resume the auto-hide after the pointer leaves the controls (BUG A). Re-arms a
 * fresh idle countdown so the chrome hides ~IMMERSION_IDLE_MS later if the user
 * stays over the scene/away. No-op if no watch is active.
 */
export function resumeIdleWatch(): void {
  if (activeTimer) activeTimer.resume();
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
  /** Re-arm the idle countdown without changing the idle/active flag. */
  reset(): void;
  /** Force the internal idle/active flag (used to sync with a manual toggle). */
  setIdle(value: boolean): void;
  /**
   * Pause the countdown: cancel any pending onIdle and ignore activity/reset
   * until resume(). While paused the timer will NEVER fire onIdle, so the
   * chrome can't be hidden out from under the cursor (BUG A).
   */
  pause(): void;
  /** Resume after a pause and re-arm a fresh countdown. */
  resume(): void;
}

/**
 * Pure-ish idle timer. Injectable setTimeout/clearTimeout for fake-timer tests.
 * - start(): begin the idle countdown
 * - activity(): user did something -> if we were idle, fire onActive; reset countdown
 * - after idleMs of no activity -> fire onIdle (and remember we are idle)
 * - stop(): cancel any pending countdown
 * - pause()/resume(): freeze the countdown while the cursor is over the controls
 */
export function createIdleTimer(opts: IdleTimerOptions): IdleTimer {
  const setT = opts.setTimeoutFn ?? setTimeout;
  const clearT = opts.clearTimeoutFn ?? clearTimeout;
  let handle: TimeoutId | null = null;
  let isIdle = false;
  let paused = false;

  function clearPending() {
    if (handle !== null) {
      clearT(handle);
      handle = null;
    }
  }

  function arm() {
    if (paused) return; // never arm an idle countdown while paused
    clearPending();
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
      if (paused) return; // ignore activity while paused; resume() re-arms
      if (isIdle) {
        isIdle = false;
        opts.onActive();
      }
      arm();
    },
    stop() {
      clearPending();
    },
    reset() {
      arm();
    },
    setIdle(value: boolean) {
      isIdle = value;
    },
    pause() {
      paused = true;
      // Cancel any pending idle tick so it can't fire while the cursor is over
      // the controls. Treat the timer as "active" so chrome stays visible.
      isIdle = false;
      clearPending();
    },
    resume() {
      if (!paused) return;
      paused = false;
      arm(); // re-arm a fresh idle countdown
    },
  };
}

/**
 * Registers global activity listeners. After IMMERSION_IDLE_MS of no activity ->
 * immersive=true; on activity -> immersive=false. Returns a cleanup fn.
 * Listens to a broad set of interaction events (move/click/scroll/key/touch/pen)
 * so any real interaction re-arms the countdown and the chrome doesn't vanish
 * while the user is still using the app.
 */
export function initIdleWatch(): () => void {
  const timer = createIdleTimer({
    idleMs: IMMERSION_IDLE_MS,
    // Only write on a REAL state change so a manual toggle isn't re-fired /
    // undone (e.g. an idle tick won't re-set immersive=true when already true).
    onIdle: () => {
      if (!get(immersive)) immersive.set(true);
    },
    onActive: () => {
      if (get(immersive)) immersive.set(false);
    },
  });

  activeTimer = timer;

  const onActivity = () => timer.activity();

  // Any of these interactions counts as activity and re-arms the idle countdown.
  const activityEvents = [
    "mousemove",
    "mousedown",
    "wheel",
    "keydown",
    "touchstart",
    "pointerdown",
    "pointermove",
  ] as const;

  for (const evt of activityEvents) {
    window.addEventListener(evt, onActivity);
  }
  timer.start();

  return () => {
    for (const evt of activityEvents) {
      window.removeEventListener(evt, onActivity);
    }
    timer.stop();
    if (activeTimer === timer) activeTimer = null;
  };
}
