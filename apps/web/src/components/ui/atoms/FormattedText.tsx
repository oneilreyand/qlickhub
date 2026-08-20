import React, { useState, useEffect } from 'react';
import {
  ZoomIn,
  Image as ImageIcon,
  Video as VideoIcon,
  Play,
  ExternalLink,
  Pin,
  HardDrive,
  Layers,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  Lightbulb,
  Target,
  ClipboardCheck,
  Code2,
  GitPullRequest,
  CircleDot,
} from 'lucide-react';
import { ImageLightboxModal } from '../molecules/ImageLightboxModal';
import { apiClient } from '../../../lib/api/apiClient';

export interface FormattedTextProps {
  content: string;
  className?: string;
  onImageClick?: (src: string, alt: string) => void;
}

// In-memory cache for link metadata
const globalLinkMetaCache = new Map<
  string,
  { title?: string; imageUrl?: string; authorName?: string; description?: string }
>();

const IMAGE_EXT_REGEX = /^https?:\/\/[^\s]+\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)(\?.*)?$/i;
const DIRECT_VIDEO_EXT_REGEX = /^https?:\/\/[^\s]+\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;
const YOUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
const LOOM_REGEX = /(?:https?:\/\/)?(?:www\.)?loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/i;
const VIMEO_REGEX = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/i;
const STREAMABLE_REGEX = /(?:https?:\/\/)?(?:www\.)?streamable\.com\/([a-zA-Z0-9]+)/i;
const FIGMA_REGEX = /(?:https?:\/\/)?(?:www\.)?figma\.com\/(?:file|design|proto|board)\/([a-zA-Z0-9]+)(?:\/([^\s?#]+))?/i;
const GOOGLE_DRIVE_REGEX = /(?:https?:\/\/)?(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^&]+&)*id=)([a-zA-Z0-9_-]+)/i;
const PINTEREST_PIN_REGEX = /(?:https?:\/\/)?(?:www\.|[a-z]{2}\.)?pinterest\.(?:com|co\.[a-z]{2}|[a-z]{2})\/pin\/(\d+)/i;
const PINTEREST_SHORT_REGEX = /(?:https?:\/\/)?pin\.it\/([a-zA-Z0-9]+)/i;

function isCloudImageUrl(url: string): boolean {
  if (IMAGE_EXT_REGEX.test(url)) return true;
  const lower = url.toLowerCase();
  return (
    lower.includes('cloudinary.com') ||
    lower.includes('images.unsplash.com') ||
    lower.includes('googleusercontent.com') ||
    lower.includes('pinimg.com') ||
    lower.includes('i.imgur.com') ||
    lower.includes('imgur.com/') ||
    lower.includes('gyazo.com/') ||
    lower.includes('prnt.sc/') ||
    lower.includes('cdn.discordapp.com/attachments/') ||
    lower.includes('media.giphy.com') ||
    lower.includes('giphy.com/gifs') ||
    lower.includes('media.tenor.com') ||
    lower.includes('/attachments/') ||
    lower.includes('format=png') ||
    lower.includes('format=jpg') ||
    lower.includes('format=webp')
  );
}

export const FormattedText: React.FC<FormattedTextProps> = ({
  content,
  className = '',
  onImageClick,
}) => {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState<string>('');
  const [linkMetaMap, setLinkMetaMap] = useState<
    Record<string, { title?: string; imageUrl?: string; authorName?: string; description?: string }>
  >(() => {
    const initial: Record<string, any> = {};
    globalLinkMetaCache.forEach((val, key) => {
      initial[key] = val;
    });
    return initial;
  });

  // Extract URLs to fetch metadata for Pinterest and rich links
  useEffect(() => {
    if (!content) return;
    let isMounted = true;
    const urlMatches = content.match(/(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g) || [];

    for (const rawUrl of urlMatches) {
      if (
        (PINTEREST_PIN_REGEX.test(rawUrl) || PINTEREST_SHORT_REGEX.test(rawUrl)) &&
        !globalLinkMetaCache.has(rawUrl) &&
        !linkMetaMap[rawUrl]
      ) {
        apiClient<{ data: { url: string; title?: string; imageUrl?: string; authorName?: string; description?: string } }>(
          `/meta/link-preview?url=${encodeURIComponent(rawUrl)}`
        )
          .then((res) => {
            if (isMounted && res?.data) {
              globalLinkMetaCache.set(rawUrl, res.data);
              setLinkMetaMap((prev) => ({ ...prev, [rawUrl]: res.data }));
            }
          })
          .catch(() => {
            // Ignore fetch failures gracefully
          });
      }
    }

    return () => {
      isMounted = false;
    };
  }, [content, linkMetaMap]);

  if (!content || !content.trim()) {
    return <span className="text-stone-400 italic">No description provided.</span>;
  }

  const handleImageClick = (src: string, alt: string) => {
    if (onImageClick) {
      onImageClick(src, alt);
    } else {
      setLightboxSrc(src);
      setLightboxAlt(alt);
    }
  };

  const renderImageCard = (src: string, alt?: string, key?: string | number) => {
    const title = alt && alt !== 'Image' && alt !== 'Image Attachment' ? alt : undefined;
    return (
      <div
        key={key}
        onClick={() => handleImageClick(src, alt || 'Image Preview')}
        className="group relative my-2 overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-900/5 dark:bg-stone-900/60 max-w-xl cursor-pointer transition-all hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500"
      >
        <img
          src={src}
          alt={alt || 'Image Attachment'}
          className="max-h-96 w-full object-contain rounded-xl bg-stone-950/20 transition-transform duration-200 group-hover:scale-[1.01]"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold pointer-events-none backdrop-blur-[2px]">
          <ZoomIn className="h-4 w-4" />
          <span>Klik untuk Memperbesar</span>
        </div>
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-bold text-white flex items-center gap-1 backdrop-blur-xs">
          <ImageIcon className="h-2.5 w-2.5 text-emerald-400" />
          <span>IMAGE</span>
        </div>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-black/60 hover:bg-black/80 text-white transition-all text-[9px] font-bold flex items-center gap-1 backdrop-blur-xs"
        >
          <span>Buka</span>
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
        {title && (
          <div className="border-t border-stone-200/60 bg-white/80 dark:border-stone-800/60 dark:bg-stone-900/80 px-3 py-1.5 text-[11px] text-stone-600 dark:text-stone-300">
            {title}
          </div>
        )}
      </div>
    );
  };

  const renderDirectVideo = (src: string, title?: string, key?: string | number) => {
    return (
      <div
        key={key}
        className="my-2 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-black max-w-xl shadow-xs"
      >
        <div className="p-2 bg-stone-900 flex items-center justify-between text-xs text-stone-300 border-b border-stone-800">
          <div className="flex items-center gap-1.5 font-bold">
            <VideoIcon className="h-3.5 w-3.5 text-indigo-400" />
            <span>{title || 'Video Attachment'}</span>
          </div>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-stone-400 hover:text-white flex items-center gap-0.5"
          >
            <span>Open Direct</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
        <video
          controls
          playsInline
          preload="metadata"
          src={src}
          className="w-full max-h-80 object-contain bg-black"
        >
          Your browser does not support playing this video.
        </video>
      </div>
    );
  };

  const renderEmbedVideo = (
    embedUrl: string,
    originalUrl: string,
    title: string,
    key?: string | number
  ) => {
    return (
      <div
        key={key}
        className="my-2 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-black max-w-xl shadow-xs"
      >
        <div className="p-2 bg-stone-900 flex items-center justify-between text-xs text-stone-300 border-b border-stone-800">
          <div className="flex items-center gap-1.5 font-bold">
            <Play className="h-3.5 w-3.5 text-red-500" />
            <span>{title}</span>
          </div>
          <a
            href={originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-stone-400 hover:text-white flex items-center gap-0.5"
          >
            <span>Open External</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
        <div className="relative aspect-video w-full">
          <iframe
            src={embedUrl}
            title={title}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  };

  const renderMediaFromUrl = (url: string, title?: string, key?: string | number) => {
    const trimmed = url.trim();

    // Pinterest Pin
    const pinMatch = trimmed.match(PINTEREST_PIN_REGEX);
    const pinShortMatch = trimmed.match(PINTEREST_SHORT_REGEX);
    if (pinMatch || pinShortMatch) {
      const pinId = pinMatch ? pinMatch[1] : undefined;
      const meta = linkMetaMap[trimmed];
      const pinterestImg = meta?.imageUrl;

      if (pinterestImg) {
        return (
          <div
            key={key}
            onClick={() => handleImageClick(pinterestImg, meta?.title || title || 'Pinterest Pin')}
            className="group relative my-2 overflow-hidden rounded-xl border border-red-200 dark:border-red-950 bg-stone-900/5 dark:bg-stone-900/60 max-w-xl cursor-pointer transition-all hover:shadow-md hover:border-red-400 dark:hover:border-red-600"
          >
            <img
              src={pinterestImg}
              alt={meta?.title || title || 'Pinterest Pin'}
              className="max-h-96 w-full object-contain rounded-xl bg-stone-950/20 transition-transform duration-200 group-hover:scale-[1.01]"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold pointer-events-none backdrop-blur-[2px]">
              <ZoomIn className="h-4 w-4" />
              <span>Klik untuk Memperbesar</span>
            </div>
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#E60023] text-white font-extrabold text-[9px] flex items-center gap-1 shadow-md backdrop-blur-xs">
              <Pin className="h-3 w-3 fill-white" />
              <span>PINTEREST</span>
            </div>
            <a
              href={trimmed}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-black/70 hover:bg-black/90 text-white transition-all text-[9px] font-bold flex items-center gap-1 shadow-md backdrop-blur-xs"
            >
              <span>Buka Pin</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
            {meta?.title && (
              <div className="border-t border-stone-100 dark:border-stone-800/60 bg-white/90 dark:bg-stone-900/90 px-3 py-1.5 text-[11px] text-stone-700 dark:text-stone-300 flex items-center justify-between">
                <span className="font-semibold truncate">{meta.title}</span>
                {meta.authorName && <span className="text-[10px] text-stone-400 shrink-0">by {meta.authorName}</span>}
              </div>
            )}
          </div>
        );
      }

      return (
        <div
          key={key}
          className="my-2 p-2.5 rounded-xl border border-red-200 dark:border-red-950 bg-red-50/40 dark:bg-red-950/20 max-w-sm shadow-xs space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-[#E60023] text-white shadow-xs">
                <Pin className="h-3.5 w-3.5 fill-white" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate">
                  {meta?.title || title || 'Pinterest Pin'}
                </div>
                <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                  {trimmed}
                </div>
              </div>
            </div>
            <a
              href={trimmed}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-2 py-1 rounded-lg bg-[#E60023] hover:bg-red-700 text-white font-bold text-[10px] flex items-center gap-1 transition-colors shadow-xs"
            >
              <span>Buka Pin</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
          {pinId && (
            <div className="rounded-lg overflow-hidden border border-red-200 dark:border-red-900/50 bg-white dark:bg-stone-900">
              <iframe
                src={`https://assets.pinterest.com/ext/embed.html?id=${pinId}`}
                title="Pinterest Pin Widget"
                className="w-full h-80 border-0"
                scrolling="no"
              />
            </div>
          )}
        </div>
      );
    }

    // Google Drive
    const driveMatch = trimmed.match(GOOGLE_DRIVE_REGEX);
    if (driveMatch && driveMatch[1]) {
      const fileId = driveMatch[1];
      const driveThumb = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
      return (
        <div
          key={key}
          onClick={() => handleImageClick(driveThumb, title || 'Google Drive File')}
          className="group relative my-2 overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-900/5 dark:bg-stone-900/60 max-w-xl cursor-pointer transition-all hover:shadow-md hover:border-amber-400 dark:hover:border-amber-500"
        >
          <img
            src={driveThumb}
            alt={title || 'Google Drive Attachment'}
            className="max-h-96 w-full object-contain rounded-xl bg-stone-950/20 transition-transform duration-200 group-hover:scale-[1.01]"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-stone-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold pointer-events-none backdrop-blur-[2px]">
            <ZoomIn className="h-4 w-4" />
            <span>Klik untuk Memperbesar</span>
          </div>
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-bold text-white flex items-center gap-1 backdrop-blur-xs">
            <HardDrive className="h-2.5 w-2.5 text-amber-400" />
            <span>DRIVE PREVIEW</span>
          </div>
          <a
            href={trimmed}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-black/60 hover:bg-black/80 text-white transition-all text-[9px] font-bold flex items-center gap-1 backdrop-blur-xs"
          >
            <span>Buka Drive</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      );
    }

    // Figma
    const figmaMatch = trimmed.match(FIGMA_REGEX);
    if (figmaMatch && figmaMatch[1]) {
      const slug = figmaMatch[2] ? decodeURIComponent(figmaMatch[2]).replace(/-/g, ' ') : 'Figma Design';
      return (
        <div
          key={key}
          className="my-2 flex items-center justify-between p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/30 max-w-md shadow-xs transition-all hover:shadow-sm"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <Layers className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate flex items-center gap-1.5">
                <span>Figma Design</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-extrabold uppercase">
                  UI/UX
                </span>
              </div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate capitalize">
                {title || slug}
              </div>
            </div>
          </div>
          <a
            href={trimmed}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 ml-2 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] flex items-center gap-1 transition-colors shadow-xs"
          >
            <span>Buka Figma</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      );
    }

    // Direct Video
    if (DIRECT_VIDEO_EXT_REGEX.test(trimmed)) {
      return renderDirectVideo(trimmed, title || 'Video Attachment', key);
    }

    // YouTube
    const ytMatch = trimmed.match(YOUTUBE_REGEX);
    if (ytMatch && ytMatch[1] && (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('youtube.com') || trimmed.includes('youtu.be'))) {
      return renderEmbedVideo(
        `https://www.youtube.com/embed/${ytMatch[1]}`,
        trimmed.includes('/embed/') ? trimmed.replace('/embed/', '/watch?v=') : trimmed,
        title || 'YouTube Video',
        key
      );
    }

    // Loom
    const loomMatch = trimmed.match(LOOM_REGEX);
    if (loomMatch && loomMatch[1] && (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('loom.com'))) {
      return renderEmbedVideo(
        `https://www.loom.com/embed/${loomMatch[1]}`,
        trimmed,
        title || 'Loom Video',
        key
      );
    }

    // Vimeo
    const vimeoMatch = trimmed.match(VIMEO_REGEX);
    if (vimeoMatch && vimeoMatch[1]) {
      return renderEmbedVideo(
        `https://player.vimeo.com/video/${vimeoMatch[1]}`,
        trimmed,
        title || 'Vimeo Video',
        key
      );
    }

    // Streamable
    const streamableMatch = trimmed.match(STREAMABLE_REGEX);
    if (streamableMatch && streamableMatch[1]) {
      return renderEmbedVideo(
        `https://streamable.com/e/${streamableMatch[1]}`,
        trimmed,
        title || 'Streamable Video',
        key
      );
    }

    // Direct or Cloud Image
    if (isCloudImageUrl(trimmed) || trimmed.startsWith('data:image/')) {
      let resolvedUrl = trimmed;
      const gyazoMatch = trimmed.match(/gyazo\.com\/([a-zA-Z0-9]{32})/i);
      if (gyazoMatch) {
        resolvedUrl = `https://i.gyazo.com/${gyazoMatch[1]}.png`;
      }
      const imgurMatch = trimmed.match(/imgur\.com\/([a-zA-Z0-9]{5,8})$/i);
      if (imgurMatch) {
        resolvedUrl = `https://i.imgur.com/${imgurMatch[1]}.png`;
      }
      return renderImageCard(resolvedUrl, title, key);
    }

    return null;
  };

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];

  const parseInlineFormatting = (text: string): React.ReactNode[] => {
    // Parser for images, URLs, mentions, **bold**, *italic*, ~~strikethrough~~, `code`, and [links](url)
    const regex = /(!\[.*?\]\(.*?\)|https?:\/\/[^\s<]+[^<.,:;"')\]\s]|@\w+|(?:\*\*.*?\*\*|\*.*?\*|~~.*?~~|`.*?`|\[.*?\]\(.*?\)))/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      // Check for Image / Media format: ![alt](url)
      const imgMatch = part.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imgMatch) {
        const alt = imgMatch[1] || 'Image';
        const src = imgMatch[2];
        const mediaNode = renderMediaFromUrl(src, alt, `media-${index}`);
        if (mediaNode) {
          return mediaNode;
        }
        return renderImageCard(src, alt, `img-${index}`);
      }

      // Check if part is a standalone URL (video, youtube, loom, image, or regular link)
      if (part.startsWith('http://') || part.startsWith('https://')) {
        const mediaNode = renderMediaFromUrl(part, undefined, `inline-media-${index}`);
        if (mediaNode) {
          return mediaNode;
        }

        // Smart Chip for GitHub PR
        const ghPrMatch = part.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i);
        if (ghPrMatch) {
          const repo = ghPrMatch[2];
          const prNum = ghPrMatch[3];
          return (
            <a
              key={`link-${index}`}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 font-mono text-[11px] font-bold border border-stone-200 dark:border-stone-700 transition-colors mx-0.5 align-middle"
            >
              <GitPullRequest className="h-3 w-3 text-indigo-500 shrink-0" />
              <span>{repo} #{prNum}</span>
              <ExternalLink className="h-2.5 w-2.5 text-stone-400 shrink-0" />
            </a>
          );
        }

        // Smart Chip for GitHub Issue
        const ghIssueMatch = part.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/i);
        if (ghIssueMatch) {
          const repo = ghIssueMatch[2];
          const issueNum = ghIssueMatch[3];
          return (
            <a
              key={`link-${index}`}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 font-mono text-[11px] font-bold border border-stone-200 dark:border-stone-700 transition-colors mx-0.5 align-middle"
            >
              <CircleDot className="h-3 w-3 text-emerald-500 shrink-0" />
              <span>{repo} #{issueNum}</span>
              <ExternalLink className="h-2.5 w-2.5 text-stone-400 shrink-0" />
            </a>
          );
        }

        return (
          <a
            key={`link-${index}`}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 underline font-medium inline-flex items-center gap-0.5"
          >
            <span>{part.length > 40 ? part.slice(0, 37) + '...' : part}</span>
            <ExternalLink className="h-2.5 w-2.5 inline shrink-0" />
          </a>
        );
      }

      if (part.toLowerCase() === '@channel' || part.toLowerCase() === '@all') {
        return (
          <span
            key={`mention-${index}`}
            className="inline-flex items-center px-1.5 py-0.2 rounded-md font-bold text-[10px] bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 mr-1"
          >
            {part}
          </span>
        );
      }
      if (part.startsWith('@') && part.length > 1) {
        return (
          <span
            key={`mention-${index}`}
            className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1 py-0.2 rounded"
          >
            {part}
          </span>
        );
      }

      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return <strong key={index} className="font-bold text-stone-900 dark:text-stone-100">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
        return <em key={index} className="italic text-stone-800 dark:text-stone-200">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
        return <del key={index} className="line-through text-stone-400 dark:text-stone-500">{part.slice(2, -2)}</del>;
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code
            key={index}
            className="rounded bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 font-mono text-[11px] text-amber-600 dark:text-amber-400 border border-stone-200 dark:border-stone-700"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        return (
          <a
            key={index}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 underline font-medium inline-flex items-center gap-0.5"
          >
            <span>{linkMatch[1]}</span>
            <ExternalLink className="h-2.5 w-2.5 inline shrink-0" />
          </a>
        );
      }
      return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Code block toggle
    if (trimmedLine.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${i}`}
            className="my-2 rounded-xl bg-stone-900 dark:bg-stone-950 p-3 text-xs text-stone-100 overflow-x-auto font-mono border border-stone-800"
          >
            <code>{codeBlockBuffer.join('\n')}</code>
          </pre>
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }

    // Empty line -> paragraph spacing
    if (!trimmedLine) {
      elements.push(<div key={`empty-${i}`} className="h-2" />);
      continue;
    }

    // Standalone Image or Video line: ![alt](url)
    const standaloneImgMatch = trimmedLine.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (standaloneImgMatch) {
      const alt = standaloneImgMatch[1] || 'Image';
      const src = standaloneImgMatch[2];
      const mediaNode = renderMediaFromUrl(src, alt, `media-block-${i}`);
      if (mediaNode) {
        elements.push(mediaNode);
      } else {
        elements.push(renderImageCard(src, alt, `img-block-${i}`));
      }
      continue;
    }

    // Standalone plain URL line (Direct video, YouTube, Loom, Pinterest, Drive, Figma, or Image)
    const standaloneMedia = renderMediaFromUrl(trimmedLine, undefined, `standalone-media-${i}`);
    if (standaloneMedia) {
      elements.push(standaloneMedia);
      continue;
    }

    // ── GFM Table Detection ──────────────────────────────────────────────────
    if (
      line.trim().startsWith('|') &&
      i + 1 < lines.length &&
      /^\|[\s|:\-]+\|/.test(lines[i + 1].trim())
    ) {
      const tableLines: string[] = [];
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith('|')) {
        tableLines.push(lines[j]);
        j++;
      }

      const parseRow = (row: string): string[] =>
        row
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((cell) => cell.trim());

      const separatorCells = parseRow(tableLines[1] ?? '');
      const alignments: ('left' | 'center' | 'right')[] = separatorCells.map((cell) => {
        if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
        if (cell.endsWith(':')) return 'right';
        return 'left';
      });

      const alignClass = (a: 'left' | 'center' | 'right') =>
        a === 'center' ? 'text-center' : a === 'right' ? 'text-right' : 'text-left';

      const headerCells = parseRow(tableLines[0]);
      const bodyRows = tableLines.slice(2).map(parseRow);

      elements.push(
        <div
          key={`table-${i}`}
          className="my-3 w-full overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs"
        >
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-stone-100 dark:bg-stone-900/80">
                {headerCells.map((cell, ci) => (
                  <th
                    key={ci}
                    className={`border-b border-stone-200 dark:border-stone-800 px-3 py-2 font-bold text-stone-700 dark:text-stone-300 whitespace-nowrap ${alignClass(alignments[ci] ?? 'left')}`}
                  >
                    {parseInlineFormatting(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-b border-stone-100 dark:border-stone-800/60 last:border-0 odd:bg-white even:bg-stone-50/60 dark:odd:bg-transparent dark:even:bg-stone-900/30 transition-colors hover:bg-stone-100/70 dark:hover:bg-stone-800/30"
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`px-3 py-2 text-stone-800 dark:text-stone-200 leading-relaxed ${alignClass(alignments[ci] ?? 'left')}`}
                    >
                      {parseInlineFormatting(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

      i = j - 1;
      continue;
    }
    // ── End Table Detection ──────────────────────────────────────────────────

    // Headings
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-base font-extrabold text-stone-900 dark:text-stone-100 mt-3 mb-1">
          {parseInlineFormatting(line.slice(2))}
        </h1>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-2.5 mb-1">
          {parseInlineFormatting(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-xs font-bold text-stone-900 dark:text-stone-100 mt-2 mb-0.5">
          {parseInlineFormatting(line.slice(4))}
        </h3>
      );
      continue;
    }

    // Horizontal Rule
    if (line.trim() === '---' || line.trim() === '***') {
      elements.push(<hr key={`hr-${i}`} className="my-3 border-stone-200 dark:border-stone-800" />);
      continue;
    }

    // GitHub Alerts / Callouts: > [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING], > [!CAUTION], > [!DANGER]
    const alertMatch = line.match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|DANGER|INFO|BUG)\]\s*(.*)$/i);
    if (alertMatch) {
      const type = alertMatch[1].toUpperCase();
      const firstLineText = alertMatch[2];
      
      const alertLines: string[] = [];
      if (firstLineText.trim()) {
        alertLines.push(firstLineText.trim());
      }
      let j = i + 1;
      while (j < lines.length && lines[j].startsWith('> ') && !lines[j].match(/^>\s*\[!/)) {
        alertLines.push(lines[j].slice(2).trim());
        j++;
      }

      let bgClass = 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-200';
      let icon = <Info className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />;
      let label = 'Note';

      if (type === 'TIP' || type === 'HINT') {
        bgClass = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200';
        icon = <Lightbulb className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />;
        label = 'Tip';
      } else if (type === 'IMPORTANT') {
        bgClass = 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200';
        icon = <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />;
        label = 'Important';
      } else if (type === 'WARNING' || type === 'CAUTION') {
        bgClass = 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200';
        icon = <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />;
        label = 'Warning';
      } else if (type === 'DANGER' || type === 'BUG') {
        bgClass = 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200';
        icon = <AlertOctagon className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />;
        label = 'Caution';
      }

      elements.push(
        <div
          key={`alert-${i}`}
          className={`p-3.5 my-2.5 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${bgClass}`}
        >
          {icon}
          <div className="flex-1 space-y-1">
            <span className="font-extrabold uppercase tracking-wider text-[10px] block opacity-90">
              {label}
            </span>
            {alertLines.map((al, idx) => (
              <div key={idx} className="font-medium">
                {parseInlineFormatting(al)}
              </div>
            ))}
          </div>
        </div>
      );

      i = j - 1;
      continue;
    }

    // Standard Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-4 border-amber-500 bg-amber-500/5 px-3 py-1.5 my-1.5 rounded-r-lg text-xs italic text-stone-700 dark:text-stone-300"
        >
          {parseInlineFormatting(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Smart Section Header: Acceptance Criteria
    const isAcHeader = /^(?:###\s+|##\s+|\*\*)?(Acceptance Criteria|Kriteria Penerimaan)[:*]*\s*$/i.test(trimmedLine);
    if (isAcHeader) {
      elements.push(
        <div key={`sec-ac-${i}`} className="mt-4 mb-1.5 flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider pb-1 border-b border-emerald-200 dark:border-emerald-900/50">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Acceptance Criteria</span>
        </div>
      );
      continue;
    }

    // Smart Section Header: Objective & Scope
    const isObjHeader = /^(?:###\s+|##\s+|\*\*)?(Objective|Tujuan|Background Context|Scope|Ruang Lingkup)[:*]*\s*$/i.test(trimmedLine);
    if (isObjHeader) {
      elements.push(
        <div key={`sec-obj-${i}`} className="mt-4 mb-1.5 flex items-center gap-1.5 text-xs font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider pb-1 border-b border-indigo-200 dark:border-indigo-900/50">
          <Target className="h-3.5 w-3.5" />
          <span>Objective & Context</span>
        </div>
      );
      continue;
    }

    // Smart Section Header: Testing Checklist
    const isTestHeader = /^(?:###\s+|##\s+|\*\*)?(Testing Checklist|Steps to Reproduce|Langkah Pengujian)[:*]*\s*$/i.test(trimmedLine);
    if (isTestHeader) {
      elements.push(
        <div key={`sec-test-${i}`} className="mt-4 mb-1.5 flex items-center gap-1.5 text-xs font-extrabold text-sky-700 dark:text-sky-400 uppercase tracking-wider pb-1 border-b border-sky-200 dark:border-sky-900/50">
          <ClipboardCheck className="h-3.5 w-3.5" />
          <span>Testing Checklist</span>
        </div>
      );
      continue;
    }

    // Smart Section Header: Technical Specs & Deliverables
    const isTechHeader = /^(?:###\s+|##\s+|\*\*)?(Technical Specifications|Deliverables|Output Teknis)[:*]*\s*$/i.test(trimmedLine);
    if (isTechHeader) {
      elements.push(
        <div key={`sec-tech-${i}`} className="mt-4 mb-1.5 flex items-center gap-1.5 text-xs font-extrabold text-stone-900 dark:text-[#B1E743] uppercase tracking-wider pb-1 border-b border-stone-200 dark:border-stone-800">
          <Code2 className="h-3.5 w-3.5" />
          <span>Technical Deliverables & Specs</span>
        </div>
      );
      continue;
    }

    // Task Checklist
    if (line.startsWith('- [ ] ') || line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
      const isChecked = line.startsWith('- [x] ') || line.startsWith('- [X] ');
      elements.push(
        <div key={`check-${i}`} className="flex items-start gap-2 my-1 text-xs">
          <input
            type="checkbox"
            checked={isChecked}
            readOnly
            className="mt-0.5 h-3.5 w-3.5 rounded border-stone-300 dark:border-stone-700 text-brand-600 focus:ring-0 cursor-default"
          />
          <span className={isChecked ? 'line-through text-stone-400 dark:text-stone-500' : 'text-stone-800 dark:text-stone-200 font-medium'}>
            {parseInlineFormatting(line.slice(6))}
          </span>
        </div>
      );
      continue;
    }

    // Bullet List
    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2 my-0.5 text-xs text-stone-800 dark:text-stone-200 pl-2">
          <span className="text-amber-500 font-bold leading-none select-none">•</span>
          <span className="flex-1">{parseInlineFormatting(line.slice(2))}</span>
        </div>
      );
      continue;
    }

    // Numbered List
    const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-2 my-0.5 text-xs text-stone-800 dark:text-stone-200 pl-2">
          <span className="font-mono font-bold text-stone-400 dark:text-stone-500 text-[11px] min-w-4 select-none">
            {numMatch[1]}.
          </span>
          <span className="flex-1">{parseInlineFormatting(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Regular Paragraph
    elements.push(
      <div key={`p-${i}`} className="text-xs text-stone-800 dark:text-stone-200 leading-relaxed my-0.5">
        {parseInlineFormatting(line)}
      </div>
    );
  }

  // Handle unclosed code block
  if (inCodeBlock && codeBlockBuffer.length > 0) {
    elements.push(
      <pre
        key="code-unclosed"
        className="my-2 rounded-xl bg-stone-900 dark:bg-stone-950 p-3 text-xs text-stone-100 overflow-x-auto font-mono border border-stone-800"
      >
        <code>{codeBlockBuffer.join('\n')}</code>
      </pre>
    );
  }

  return (
    <>
      <div className={`space-y-0.5 font-sans leading-normal ${className}`}>{elements}</div>
      {lightboxSrc && (
        <ImageLightboxModal
          isOpen={true}
          src={lightboxSrc}
          alt={lightboxAlt}
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </>
  );
};

/**
 * Utility to strip markdown syntax for clean plain text preview in tables and cards.
 */
export function stripMarkdown(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/^>+\s*\[!.*?\]/gm, '')
    .replace(/^#+\s+/gm, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/-\s+\[[ xX]\]\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
}
