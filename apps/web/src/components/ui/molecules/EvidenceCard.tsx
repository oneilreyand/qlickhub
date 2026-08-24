import React from 'react';
import {
  ExternalLink,
  Eye,
  FileText,
  Film,
  Image as ImageIcon,
  PlayCircle,
  Video,
} from 'lucide-react';
import type { EvidencePreviewStatus, TestResultEvidenceLink } from '@qlick/contracts';

export interface EvidenceCardProps {
  link: {
    id: string;
    url: string;
    provider: string;
    mediaKind: string;
    label?: string | null;
    normalizedUrl: string;
    previewStatus: EvidencePreviewStatus;
    addedAt?: string;
  };
  onPreview?: (link: TestResultEvidenceLink) => void;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({ link, onPreview }) => {
  const getProviderMeta = (provider: string, mediaKind: string) => {
    switch (provider) {
      case 'youtube':
        return {
          name: 'YouTube',
          icon: <PlayCircle className="w-4 h-4 text-red-500" />,
          bgColor: 'bg-red-500/10 text-red-400 border-red-500/20',
        };
      case 'loom':
        return {
          name: 'Loom',
          icon: <Video className="w-4 h-4 text-purple-500" />,
          bgColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        };
      case 'vimeo':
        return {
          name: 'Vimeo',
          icon: <Film className="w-4 h-4 text-sky-500" />,
          bgColor: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
        };
      case 'google_drive':
        return {
          name: 'Google Drive',
          icon: <PlayCircle className="w-4 h-4 text-emerald-500" />,
          bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        };
      case 'direct_image':
        return {
          name: 'Direct Image',
          icon: <ImageIcon className="w-4 h-4 text-primary" />,
          bgColor: 'bg-primary/10 text-primary border-primary/20',
        };
      case 'direct_video':
        return {
          name: 'Direct Video',
          icon: <Film className="w-4 h-4 text-primary" />,
          bgColor: 'bg-primary/10 text-primary border-primary/20',
        };
      default:
        return {
          name: mediaKind === 'image' ? 'Image' : mediaKind === 'video' ? 'Video' : 'External Link',
          icon:
            mediaKind === 'image' ? (
              <ImageIcon className="w-4 h-4 text-slate-400" />
            ) : (
              <FileText className="w-4 h-4 text-slate-400" />
            ),
          bgColor: 'bg-slate-700/50 text-slate-300 border-slate-600',
        };
    }
  };

  const meta = getProviderMeta(link.provider, link.mediaKind);
  const canPreview = link.previewStatus === 'ready';

  const handleClick = (e: React.MouseEvent) => {
    if (canPreview && onPreview) {
      e.preventDefault();
      onPreview(link as TestResultEvidenceLink);
    } else {
      window.open(link.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as unknown as React.MouseEvent);
        }
      }}
      className="group flex items-center justify-between p-3 rounded-xl border border-slate-700/60 bg-slate-800/40 hover:bg-slate-800/80 hover:border-slate-600 transition-all duration-150 cursor-pointer text-left"
    >
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex-shrink-0 group-hover:border-slate-500 transition-colors">
          {meta.icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${meta.bgColor}`}
            >
              {meta.name}
            </span>
            {link.previewStatus === 'ready' && (
              <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                Preview Ready
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-200 truncate mt-0.5 group-hover:text-primary transition-colors">
            {link.label || link.url}
          </p>
          {link.label && <p className="text-xs text-slate-400 truncate font-mono">{link.url}</p>}
        </div>
      </div>

      <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-200 transition-colors flex-shrink-0">
        {canPreview ? (
          <span className="flex items-center gap-1 text-xs font-medium text-slate-300 group-hover:text-primary">
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open</span>
          </span>
        )}
      </div>
    </div>
  );
};
