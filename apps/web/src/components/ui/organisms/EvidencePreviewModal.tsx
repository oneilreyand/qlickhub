import React, { useState } from 'react';
import {
  ExternalLink,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
  Video,
  FileText,
} from 'lucide-react';
import type { EvidencePreviewStatus } from '@qlick/contracts';
import { Modal } from '../molecules/Modal';
import { Button } from '../atoms/Button';

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

  if (!isOpen || !evidence) return null;

  const isImage = evidence.mediaKind === 'image' || evidence.provider === 'direct_image';
  const isDirectVideo =
    evidence.provider === 'direct_video' ||
    (evidence.mediaKind === 'video' && /\.(mp4|webm|ogg|mov)$/i.test(evidence.url));
  const isEmbedVideo = ['youtube', 'loom', 'vimeo', 'google_drive'].includes(evidence.provider);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={evidence.label || 'Evidence Preview'}
      description={`${evidence.provider.toUpperCase().replace('_', ' ')} • ${evidence.url}`}
      size="4xl"
    >
      <div className="flex flex-col gap-4">
        {/* Controls bar */}
        <div className="flex items-center justify-between bg-slate-900/60 dark:bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-medium bg-slate-800 border border-slate-700 text-slate-300">
              {isImage ? (
                <ImageIcon className="w-3.5 h-3.5" />
              ) : isEmbedVideo || isDirectVideo ? (
                <Video className="w-3.5 h-3.5" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              {evidence.provider.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isImage && (
              <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  aria-label="Zoom out"
                  title="Zoom Out"
                  className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-1 focus:ring-lime-400"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-mono text-slate-300 px-1">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  aria-label="Zoom in"
                  title="Zoom In"
                  className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-1 focus:ring-lime-400"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  aria-label="Reset zoom"
                  title="Reset Zoom"
                  className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors ml-1 focus:outline-none focus:ring-1 focus:ring-lime-400"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            )}

            <a
              href={evidence.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-lime-400"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open External</span>
            </a>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex items-center justify-center p-4 min-h-[320px] max-h-[65vh] overflow-auto bg-slate-950/80 rounded-xl border border-slate-800">
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
                className="max-h-[55vh] max-w-full object-contain rounded-lg select-none shadow-lg"
              />
            </div>
          ) : isDirectVideo ? (
            <div className="w-full flex items-center justify-center">
              <video
                src={evidence.url}
                controls
                autoPlay
                className="max-h-[55vh] max-w-full rounded-xl bg-black shadow-xl"
              >
                Your browser does not support video playback.
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
                className="w-full aspect-video rounded-xl bg-black shadow-2xl max-h-[55vh] border border-slate-800"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-full text-slate-400">
                <FileText className="w-8 h-8" />
              </div>
              <div className="max-w-md">
                <h3 className="text-sm font-semibold text-slate-200">External URL Evidence Link</h3>
                <p className="text-xs text-slate-400 mt-1">
                  In-app embedded preview is not supported for this provider. You can securely open
                  the link in a new browser tab.
                </p>
              </div>
              <a href={evidence.url} target="_blank" rel="noopener noreferrer" className="mt-2">
                <Button variant="primary" size="sm">
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  Open External Link
                </Button>
              </a>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
