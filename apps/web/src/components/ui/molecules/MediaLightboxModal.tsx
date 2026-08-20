import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Film,
  ImageIcon,
} from 'lucide-react';
import { IconButton } from '../atoms/IconButton';

export type MediaLightboxType = 'image' | 'video_direct' | 'video_embed';

export interface MediaLightboxModalProps {
  isOpen: boolean;
  src: string;
  type?: MediaLightboxType;
  alt?: string;
  onClose: () => void;
}

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({
  isOpen,
  src,
  type = 'image',
  alt = 'Media Preview',
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Reset zoom & rotation on open/source change
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
    }
  }, [isOpen, src]);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle keyboard shortcuts (ESC to close)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (type === 'image') {
        if (e.key === '+' || e.key === '=') {
          setScale((prev) => Math.min(prev + 0.25, 4));
        } else if (e.key === '-') {
          setScale((prev) => Math.max(prev - 0.25, 0.5));
        } else if (e.key === '0') {
          setScale(1);
          setRotation(0);
        }
      }
    },
    [isOpen, onClose, type]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen || !src) return null;

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setScale(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const isVideo = type === 'video_direct' || type === 'video_embed';

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-stone-950/92 backdrop-blur-md transition-opacity duration-200 animate-fadeIn"
      onClick={onClose}
    >
      {/* Header Toolbar */}
      <div
        className="absolute top-4 inset-x-4 flex items-center justify-between z-10 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 max-w-[60%]">
          <span className="px-3 py-1.5 rounded-xl bg-stone-900/95 text-stone-100 text-xs font-bold truncate border border-stone-700/60 shadow-lg flex items-center gap-1.5">
            {isVideo ? (
              <Film className="h-3.5 w-3.5 text-[#B1E743]" />
            ) : (
              <ImageIcon className="h-3.5 w-3.5 text-stone-300" />
            )}
            <span>{alt || (isVideo ? 'Video Player' : 'Image Preview')}</span>
          </span>
          {!isVideo && (
            <span className="px-2 py-1 rounded-lg bg-stone-800 text-stone-400 text-[11px] font-mono border border-stone-700/50">
              {Math.round(scale * 100)}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-stone-900/95 border border-stone-700/60 shadow-lg">
          {!isVideo && (
            <>
              <IconButton
                label="Zoom In"
                size="sm"
                variant="ghost"
                onClick={handleZoomIn}
                className="text-stone-300 hover:text-white hover:bg-stone-800"
              >
                <ZoomIn className="h-4 w-4" />
              </IconButton>
              <IconButton
                label="Zoom Out"
                size="sm"
                variant="ghost"
                onClick={handleZoomOut}
                className="text-stone-300 hover:text-white hover:bg-stone-800"
              >
                <ZoomOut className="h-4 w-4" />
              </IconButton>
              <IconButton
                label="Reset Zoom"
                size="sm"
                variant="ghost"
                onClick={handleResetZoom}
                className="text-stone-300 hover:text-white hover:bg-stone-800"
              >
                <Maximize2 className="h-4 w-4" />
              </IconButton>
              <IconButton
                label="Rotate"
                size="sm"
                variant="ghost"
                onClick={handleRotate}
                className="text-stone-300 hover:text-white hover:bg-stone-800"
              >
                <RotateCcw className="h-4 w-4" />
              </IconButton>
              <div className="h-4 w-px bg-stone-700 mx-1" />
            </>
          )}

          <IconButton
            label="Close preview (Esc)"
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl"
          >
            <X className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      {/* Main Content Container */}
      <div
        className="relative max-h-[88vh] max-w-[92vw] overflow-hidden flex items-center justify-center p-2 cursor-default select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {type === 'video_direct' ? (
          <video
            controls
            autoPlay
            playsInline
            src={src}
            className="max-h-[82vh] max-w-[88vw] rounded-2xl shadow-2xl bg-black border border-stone-800"
          >
            Browser Anda tidak mendukung pemutar video ini.
          </video>
        ) : type === 'video_embed' ? (
          <div className="w-[88vw] max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl border border-stone-800 bg-black">
            <iframe
              src={src}
              title={alt || 'In-App Video'}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <img
            src={src}
            alt={alt}
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              transition: 'transform 0.15s ease-out',
            }}
            className="max-h-[80vh] max-w-[85vw] object-contain rounded-xl shadow-2xl transition-transform"
          />
        )}
      </div>

      {/* Footer Instructions */}
      <div className="absolute bottom-4 text-center text-[11px] text-stone-400 select-none pointer-events-none">
        Tekan <kbd className="px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-300 font-mono">ESC</kbd> untuk menutup &bull; Video berjalan langsung di dalam aplikasi
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
