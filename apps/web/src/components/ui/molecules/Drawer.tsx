import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { IconButton } from '../atoms/IconButton';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'md',
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

  const widthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-xl',
    xl: 'max-w-2xl',
    '2xl': 'max-w-3xl',
    '3xl': 'max-w-4xl',
    '4xl': 'max-w-5xl',
    full: 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#22201F]/40 backdrop-blur-xs transition-opacity dark:bg-black/70"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className={`w-screen ${widthStyles[width]} bg-white shadow-2xl flex flex-col justify-between z-10 dark:bg-[#1C1A19] dark:border-l dark:border-stone-800 dark:text-stone-100`}>
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-stone-200/80 px-6 py-4 dark:border-stone-800">
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">{title}</h3>
              {subtitle && <p className="text-xs text-stone-500 mt-0.5 dark:text-stone-400">{subtitle}</p>}
            </div>
            <IconButton
              onClick={onClose}
              label="Close drawer"
              size="sm"
              variant="ghost"
              className="dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
            >
              <X className="h-5 w-5" />
            </IconButton>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 text-sm text-stone-600 dark:text-stone-300">{children}</div>

          {/* Drawer Footer */}
          {footer && <div className="border-t border-stone-200/80 p-4 bg-stone-50 dark:border-stone-800 dark:bg-[#141413]/60">{footer}</div>}
        </div>
      </div>
    </div>
  );
};
