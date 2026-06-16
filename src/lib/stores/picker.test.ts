import { describe, it, expect, beforeEach } from "vitest";
import { get } from "svelte/store";
import { pickerOpen, openPicker, closePicker, togglePicker } from "./picker";

describe("picker store", () => {
  beforeEach(() => pickerOpen.set(false));

  it("openPicker sets pickerOpen to true", () => {
    expect(get(pickerOpen)).toBe(false);
    openPicker();
    expect(get(pickerOpen)).toBe(true);
  });

  it("closePicker sets pickerOpen to false", () => {
    pickerOpen.set(true);
    expect(get(pickerOpen)).toBe(true);
    closePicker();
    expect(get(pickerOpen)).toBe(false);
  });

  it("togglePicker flips both ways", () => {
    expect(get(pickerOpen)).toBe(false);
    togglePicker();
    expect(get(pickerOpen)).toBe(true);
    togglePicker();
    expect(get(pickerOpen)).toBe(false);
  });
});
