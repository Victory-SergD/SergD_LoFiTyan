import { writable, get } from "svelte/store";

/** Writable: true = the window is in real (edge-to-edge) fullscreen. */
export const fullscreen = writable<boolean>(false);

// Only the real Tauri window can actually go fullscreen. In a plain browser
// (dev/tests) we just flip the store so styling/logic can be exercised.
function inTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function applyNative(value: boolean): Promise<boolean> {
  if (!inTauri()) return true; // nothing to do; treat as success
  try {
    const { getCurrentWebviewWindow } = await import(
      "@tauri-apps/api/webviewWindow"
    );
    await getCurrentWebviewWindow().setFullscreen(value);
    return true;
  } catch {
    return false; // leave the store unchanged on failure
  }
}

/** Toggle real fullscreen. The store only flips if the native call succeeds. */
export async function toggleFullscreen(): Promise<void> {
  const next = !get(fullscreen);
  if (await applyNative(next)) {
    fullscreen.set(next);
  }
}

/** Force-exit fullscreen (e.g. on Esc). No-op when already windowed. */
export async function exitFullscreen(): Promise<void> {
  if (!get(fullscreen)) return;
  if (await applyNative(false)) {
    fullscreen.set(false);
  }
}

/** Keep the `fullscreen` store in sync with OS-driven changes (native exit
 * gesture, etc.). Returns a cleanup fn. No-op outside Tauri. */
export async function initFullscreenSync(): Promise<() => void> {
  if (!inTauri()) return () => {};
  try {
    const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const win = getCurrentWebviewWindow();
    fullscreen.set(await win.isFullscreen());
    const unlisten = await win.onResized(async () => {
      try {
        fullscreen.set(await win.isFullscreen());
      } catch {
        /* ignore */
      }
    });
    return unlisten;
  } catch {
    return () => {};
  }
}
