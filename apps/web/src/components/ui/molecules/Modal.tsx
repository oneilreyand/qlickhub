import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '../atoms/Button';
import { IconButton } from '../atoms/IconButton';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  isPrimaryLoading?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  isPrimaryLoading = false,
  size = 'md',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) {
        e.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      dialogRef.current
        ?.querySelector<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        )
        ?.focus();
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
      if (isOpen) previouslyFocusedRef.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeStyles: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-xl',
    xl: 'max-w-2xl',
    '2xl': 'max-w-3xl',
    '3xl': 'max-w-4xl',
    '4xl': 'max-w-5xl',
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#22201F]/40 backdrop-blur-xs transition-opacity dark:bg-black/70"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Box */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative w-full ${sizeStyles[size]} max-h-[90vh] flex flex-col rounded-[20px] sm:rounded-[24px] bg-white p-4 sm:p-6 shadow-2xl ring-1 ring-stone-900/5 transition-all z-10 dark:bg-[#1C1A19] dark:border dark:border-stone-800 dark:text-stone-100`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-3 sm:pb-4 dark:border-stone-800 shrink-0">
          <div>
            <h3
              id={titleId}
              className="text-base sm:text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100"
            >
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{description}</p>
            )}
          </div>
          <IconButton
            onClick={onClose}
            label="Close modal"
            size="sm"
            variant="ghost"
            className="dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200 shrink-0"
          >
            <X className="h-5 w-5" />
          </IconButton>
        </div>

        {/* Content Body */}
        <div className="py-3 sm:py-4 text-sm text-stone-600 dark:text-stone-300 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer Actions */}
        {(primaryActionLabel || secondaryActionLabel) && (
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 border-t border-stone-100 pt-3 sm:pt-4 dark:border-stone-800 shrink-0">
            {secondaryActionLabel && (
              <Button variant="outline" size="sm" onClick={onClose} className="w-full sm:w-auto">
                {secondaryActionLabel}
              </Button>
            )}
            {primaryActionLabel && (
              <Button
                variant="primary"
                size="sm"
                isLoading={isPrimaryLoading}
                onClick={onPrimaryAction}
                className="w-full sm:w-auto"
              >
                {primaryActionLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
