const overlayStack: string[] = [];

/**
 * Pushes an overlay (Modal, Drawer, etc.) ID onto the top layer stack.
 */
export function pushOverlay(id: string): void {
  const index = overlayStack.indexOf(id);
  if (index !== -1) {
    overlayStack.splice(index, 1);
  }
  overlayStack.push(id);
}

/**
 * Removes an overlay ID from the top layer stack.
 */
export function popOverlay(id: string): void {
  const index = overlayStack.lastIndexOf(id);
  if (index !== -1) {
    overlayStack.splice(index, 1);
  }
}

/**
 * Returns true if the given overlay is currently the topmost layer or if the stack is empty.
 */
export function isTopOverlay(id: string): boolean {
  if (overlayStack.length === 0) return true;
  return overlayStack[overlayStack.length - 1] === id;
}

/**
 * Returns the currently active topmost overlay ID, or null if none.
 */
export function getTopOverlay(): string | null {
  if (overlayStack.length === 0) return null;
  return overlayStack[overlayStack.length - 1];
}
