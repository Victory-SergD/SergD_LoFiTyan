// Vitest setup file: patch Web Storage APIs from jsdom on Node 26+
// Node 26 defines `localStorage` as an experimental global name (evaluates to undefined),
// which causes vitest's jsdom environment to skip copying it from jsdom's window.
// We manually copy it here using the jsdom instance that vitest attaches to global.jsdom.
import { beforeAll } from "vitest";

beforeAll(() => {
  const g = globalThis as Record<string, unknown>;
  const jsdom = g["jsdom"] as { window: Window & typeof globalThis } | undefined;
  if (jsdom?.window) {
    const win = jsdom.window;
    if (typeof g["localStorage"] === "undefined" && win.localStorage) {
      Object.defineProperty(globalThis, "localStorage", {
        value: win.localStorage,
        configurable: true,
        writable: true,
      });
    }
    if (typeof g["sessionStorage"] === "undefined" && win.sessionStorage) {
      Object.defineProperty(globalThis, "sessionStorage", {
        value: win.sessionStorage,
        configurable: true,
        writable: true,
      });
    }
  }
});
