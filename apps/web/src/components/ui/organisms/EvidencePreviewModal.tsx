import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { EvidencePreviewStatus } from '@qlick/contracts';

export interface EvidencePreviewItem {
  url: string;
  normalizedUrl: string;
  provider: string;
  mediaKind: string;
  label?: string | null;
  previewStatus: EvidencePreviewStatus;
}

export interface EvidencePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: EvidencePreviewItem | null;
}

export const EvidencePreviewModal: React.FC<EvidencePreviewModalProps> = ({
  isOpen,
  onClose,
  evidence,
}) => {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!isOpen || !evidence) return null;

  const isImage = evidence.mediaKind === 'image' || evidence.provider === 'direct_image';
  const isDirectVideo =
    evidence.provider === 'direct_video' ||
    (evidence.mediaKind === 'video' && /\.(mp4|webm|ogg|mov)$/i.test(evidence.url));
  const isEmbedVideo = ['youtube', 'loom', 'vimeo', 'google_drive'].includes(evidence.provider);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-preview-title"
    >
      <div
        className={`relative flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${
          isFullscreen ? 'w-[98vw] h-[96vh]' : 'w-full max-w-4xl max-h-[90vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 flex-shrink-0">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
                {evidence.provider.replace('_', ' ')}
              </span>
              <h2
                id="evidence-preview-title"
                className="text-base font-semibold text-slate-100 truncate"
              >
                {evidence.label || 'Evidence Preview'}
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-mono truncate mt-0.5">{evidence.url}</p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isImage && (
              <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700 mr-2">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono text-slate-300 px-1">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  title="Zoom In"
                  className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="Reset Zoom"
                  className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors ml-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <a
              href={evidence.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open Original in New Tab"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={onClose}
              title="Close"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-slate-950/60 min-h-[300px]">
          {isImage ? (
            <div className="flex items-center justify-center overflow-auto max-w-full max-h-full">
              <img
                src={evidence.url}
                alt={evidence.label || 'Evidence preview'}
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-h-[75vh] max-w-full object-contain rounded-lg select-none shadow-lg"
              />
            </div>
          ) : isDirectVideo ? (
            <div className="w-full flex items-center justify-center">
              <video
                src={evidence.url}
                controls
                autoPlay
                className="max-h-[75vh] max-w-full rounded-xl bg-black shadow-xl"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          ) : isEmbedVideo ? (
            <div className="w-full h-full flex items-center justify-center">
              <iframe
                src={evidence.normalizedUrl}
                title={evidence.label || 'Video Evidence'}
                sandbox="allow-scripts allow-same-origin allow-presentation"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full aspect-video rounded-xl bg-black shadow-2xl max-h-[75vh] border border-slate-800"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 max-w-md">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-4 border border-slate-700">
                <ExternalLink className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-200">External Link Preview</h3>
              <p className="text-sm text-slate-400 mt-1 mb-5">
                This evidence link points to an external resource that cannot be embedded directly
                in the application.
              </p>
              <a
                href={evidence.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-slate-900 font-medium hover:bg-primary/90 transition-colors shadow-lg"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Safe Tab
              </a>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-slate-800 bg-slate-900/60 text-xs text-slate-400 flex-shrink-0">
          <span>Security Sandbox Active &bull; No Server-Side Content Proxy</span>
          {isImage && (
            <a
              href={evidence.url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download Image
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
