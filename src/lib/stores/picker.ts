import { writable } from "svelte/store";

/** Writable: true = the station-picker bottom sheet is open. */
export const pickerOpen = writable<boolean>(false);
export function openPicker(): void { pickerOpen.set(true); }
export function closePicker(): void { pickerOpen.set(false); }
export function togglePicker(): void { pickerOpen.update((v) => !v); }
