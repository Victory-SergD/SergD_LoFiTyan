import { describe, it, expect } from "vitest";
import { isTypingTarget } from "./dom";

function evt(partial: Partial<KeyboardEvent>): KeyboardEvent {
  return partial as KeyboardEvent;
}

describe("isTypingTarget", () => {
  it("returns false for a plain keydown on the body", () => {
    const target = document.createElement("div");
    expect(isTypingTarget(evt({ target, ctrlKey: false, metaKey: false, altKey: false }))).toBe(false);
  });

  it("returns true when focus is in an <input>", () => {
    const target = document.createElement("input");
    expect(isTypingTarget(evt({ target }))).toBe(true);
  });

  it("returns true when focus is in a <textarea>", () => {
    const target = document.createElement("textarea");
    expect(isTypingTarget(evt({ target }))).toBe(true);
  });

  it("returns true when focus is in a contenteditable element", () => {
    const target = document.createElement("div");
    target.setAttribute("contenteditable", "true");
    Object.defineProperty(target, "isContentEditable", { value: true });
    expect(isTypingTarget(evt({ target }))).toBe(true);
  });

  it("returns true when a modifier key is held (ctrl)", () => {
    const target = document.createElement("div");
    expect(isTypingTarget(evt({ target, ctrlKey: true }))).toBe(true);
  });

  it("returns true when the meta (cmd) key is held", () => {
    const target = document.createElement("div");
    expect(isTypingTarget(evt({ target, metaKey: true }))).toBe(true);
  });

  it("returns true when the alt key is held", () => {
    const target = document.createElement("div");
    expect(isTypingTarget(evt({ target, altKey: true }))).toBe(true);
  });

  it("returns false when target is null and no modifiers", () => {
    expect(isTypingTarget(evt({ target: null }))).toBe(false);
  });
});
