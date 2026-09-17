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
          bgColor:
            'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
        };
      case 'loom':
        return {
          name: 'Loom',
          icon: <Video className="w-4 h-4 text-purple-500" />,
          bgColor:
            'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
        };
      case 'vimeo':
        return {
          name: 'Vimeo',
          icon: <Film className="w-4 h-4 text-sky-500" />,
          bgColor:
            'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20',
        };
      case 'google_drive':
        return {
          name: 'Google Drive',
          icon: <PlayCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />,
          bgColor:
            'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
        };
      case 'direct_image':
        return {
          name: 'Direct Image',
          icon: <ImageIcon className="w-4 h-4 text-stone-700 dark:text-primary" />,
          bgColor:
            'bg-stone-100 text-stone-700 border-stone-200 dark:bg-primary/10 dark:text-primary dark:border-primary/20',
        };
      case 'direct_video':
        return {
          name: 'Direct Video',
          icon: <Film className="w-4 h-4 text-stone-700 dark:text-primary" />,
          bgColor:
            'bg-stone-100 text-stone-700 border-stone-200 dark:bg-primary/10 dark:text-primary dark:border-primary/20',
        };
      default:
        return {
          name: mediaKind === 'image' ? 'Image' : mediaKind === 'video' ? 'Video' : 'External Link',
          icon:
            mediaKind === 'image' ? (
              <ImageIcon className="w-4 h-4 text-stone-500 dark:text-stone-400" />
            ) : (
              <FileText className="w-4 h-4 text-stone-500 dark:text-stone-400" />
            ),
          bgColor:
            'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700',
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
      className="group flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900/60 dark:hover:bg-stone-900 dark:hover:border-stone-700 shadow-xs transition-all duration-150 cursor-pointer text-left"
    >
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 flex-shrink-0 group-hover:border-stone-300 dark:bg-stone-800 dark:border-stone-700 dark:group-hover:border-stone-500 transition-colors">
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
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-transparent">
                Pratinjau Siap
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate mt-0.5 group-hover:text-stone-950 dark:group-hover:text-primary transition-colors">
            {link.label || link.url}
          </p>
          {link.label && (
            <p className="text-xs text-stone-500 dark:text-stone-400 truncate font-mono">
              {link.url}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 text-stone-400 group-hover:text-stone-600 dark:text-stone-400 dark:group-hover:text-stone-200 transition-colors flex-shrink-0">
        {canPreview ? (
          <span className="flex items-center gap-1 text-xs font-medium text-stone-600 group-hover:text-stone-900 dark:text-stone-300 dark:group-hover:text-primary">
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pratinjau</span>
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-medium text-stone-500 group-hover:text-stone-900 dark:text-stone-400 dark:group-hover:text-stone-200">
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Buka</span>
          </span>
        )}
      </div>
    </div>
  );
};
