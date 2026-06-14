/**
 * Returns true when a keyboard event should NOT trigger a global single-letter
 * shortcut: focus is inside an editable field, or a modifier key is held.
 */
export function isTypingTarget(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) {
    return true;
  }

  const target = e.target;
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
