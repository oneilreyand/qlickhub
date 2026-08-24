import React, { useState, useEffect } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { IconButton } from '../atoms/IconButton';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
  allowFullScreen?: boolean;
  defaultFullScreen?: boolean;
  isFullScreen?: boolean;
  onToggleFullScreen?: (fullScreen: boolean) => void;
  headerActions?: React.ReactNode;
  toolbar?: React.ReactNode;
  preserveAppHeader?: boolean;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'md',
  allowFullScreen = true,
  defaultFullScreen = false,
  isFullScreen: controlledFullScreen,
  onToggleFullScreen,
  headerActions,
  toolbar,
  preserveAppHeader = false,
}) => {
  const [internalFullScreen, setInternalFullScreen] = useState(defaultFullScreen);
  const isFullScreen =
    controlledFullScreen !== undefined ? controlledFullScreen : internalFullScreen;

  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  // Sync / Reset full page state and handle animated mount/unmount
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      setInternalFullScreen(defaultFullScreen);
    } else if (shouldRender) {
      setIsClosing(true);
      timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 250);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, defaultFullScreen, shouldRender]);

  const handleInitiateClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullScreen) {
          setInternalFullScreen(false);
          onToggleFullScreen?.(false);
        } else {
          handleInitiateClose();
        }
      }
    };
    if (shouldRender) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shouldRender, isFullScreen, isClosing, onClose, onToggleFullScreen]);

  if (!shouldRender) return null;

  const handleToggleFullScreen = () => {
    const nextState = !isFullScreen;
    setInternalFullScreen(nextState);
    onToggleFullScreen?.(nextState);
  };

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
    <div className={`fixed inset-0 overflow-hidden ${preserveAppHeader ? 'z-20' : 'z-50'}`}>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-[#22201F]/40 backdrop-blur-xs transition-opacity duration-250 ease-in-out dark:bg-black/70 ${
          isClosing ? 'animate-fadeOut' : 'animate-fadeIn'
        } ${isFullScreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        onClick={handleInitiateClose}
        aria-hidden="true"
      />

      {/* Container anchored to the right edge with justify-end so it extends strictly from right to left */}
      <div
        className={`fixed inset-y-0 right-0 flex justify-end max-w-full pointer-events-none transition-[padding] duration-300 ease-in-out ${
          isFullScreen ? 'pl-0' : 'pl-10'
        }`}
      >
        <div
          className={`pointer-events-auto origin-right w-screen ${
            isFullScreen ? 'max-w-full' : widthStyles[width]
          } bg-white shadow-2xl flex flex-col justify-between z-10 ${
            isClosing ? 'animate-slideOutRight' : 'animate-slideInRight'
          } transition-[max-width] duration-300 ease-in-out dark:bg-[#1C1A19] dark:border-l dark:border-stone-800 dark:text-stone-100`}
        >
          {/* Drawer Header */}
          <div
            className={`flex items-center justify-between border-b border-stone-200/80 py-4 dark:border-stone-800 shrink-0 ${
              isFullScreen ? 'px-4 sm:px-8' : 'px-6'
            }`}
          >
            <div className="min-w-0 pr-4">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-stone-500 mt-0.5 dark:text-stone-400 truncate">
                  {subtitle}
                </p>
              )}
            </div>

            {headerActions && (
              <div className="flex items-center gap-1.5 shrink-0">{headerActions}</div>
            )}
          </div>

          {/* Drawer Content */}
          <section
            aria-label={`${title} content`}
            className={`flex-1 overflow-y-auto text-sm text-stone-600 dark:text-stone-300 transition-all duration-300 ${
              isFullScreen ? 'w-full px-4 py-6 sm:px-8' : 'p-6'
            }`}
          >
            <div
              role="toolbar"
              aria-label={`${title} navigation and controls`}
              className="sticky top-0 z-20 -mt-2 mb-4 flex min-w-0 items-center gap-1.5 rounded-2xl border border-stone-200/80 bg-white/95 p-2 shadow-xs backdrop-blur-md dark:border-stone-800 dark:bg-[#1C1A19]/95"
            >
              {toolbar && <div className="min-w-0 flex-1 overflow-hidden">{toolbar}</div>}

              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                {/* Fullscreen Expand / Restore Toggle Button */}
                {allowFullScreen && (
                  <IconButton
                    onClick={handleToggleFullScreen}
                    label={isFullScreen ? 'Restore normal view' : 'Expand to full page'}
                    size="md"
                    variant="ghost"
                    className="text-stone-500 hover:text-[#22201F] dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-[#B1E743]"
                  >
                    {isFullScreen ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </IconButton>
                )}

                <IconButton
                  onClick={handleInitiateClose}
                  label="Close drawer"
                  size="md"
                  variant="ghost"
                  className="text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                >
                  <X className="h-5 w-5" />
                </IconButton>
              </div>
            </div>

            {children}
          </section>

          {/* Drawer Footer */}
          {footer && (
            <div
              className={`border-t border-stone-200/80 py-4 bg-stone-50 dark:border-stone-800 dark:bg-[#141413]/60 shrink-0 transition-all duration-300 ${
                isFullScreen ? 'px-4 sm:px-8' : 'px-4'
              }`}
            >
              <div className={isFullScreen ? 'w-full' : ''}>{footer}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
