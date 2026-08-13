import React, { useEffect } from 'react';
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
  size?: 'sm' | 'md' | 'lg';
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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-xl',
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative w-full ${sizeStyles[size]} rounded-[24px] bg-white p-6 shadow-2xl ring-1 ring-stone-900/5 transition-all z-10 dark:bg-[#1C1A19] dark:border dark:border-stone-800 dark:text-stone-100`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4 dark:border-stone-800">
          <div>
            <h3 id="modal-title" className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {title}
            </h3>
            {description && <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{description}</p>}
          </div>
          <IconButton
            onClick={onClose}
            label="Close modal"
            size="sm"
            variant="ghost"
            className="dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          >
            <X className="h-5 w-5" />
          </IconButton>
        </div>

        {/* Content Body */}
        <div className="py-4 text-sm text-stone-600 dark:text-stone-300">{children}</div>

        {/* Footer Actions */}
        {(primaryActionLabel || secondaryActionLabel) && (
          <div className="flex items-center justify-end gap-3 border-t border-stone-100 pt-4 dark:border-stone-800">
            {secondaryActionLabel && (
              <Button variant="outline" size="sm" onClick={onClose}>
                {secondaryActionLabel}
              </Button>
            )}
            {primaryActionLabel && (
              <Button variant="primary" size="sm" isLoading={isPrimaryLoading} onClick={onPrimaryAction}>
                {primaryActionLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
