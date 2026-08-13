import { RefObject, useEffect } from 'react';

/** Closes a popover when focus moves outside through pointer or Escape. */
export const useDismissableLayer = <T extends HTMLElement>(
  ref: RefObject<T>,
  isOpen: boolean,
  onDismiss: () => void
) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onDismiss, ref]);
};
