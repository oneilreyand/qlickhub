import React, { useState, useMemo, useEffect } from 'react';
import {
  ZoomIn,
  Play,
  ExternalLink,
  Video as VideoIcon,
  Image as ImageIcon,
  Globe,
  Layers,
  Pin,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { MediaLightboxModal, MediaLightboxType } from './MediaLightboxModal';
import { apiClient } from '../../../lib/api/apiClient';

export interface DiscussionMediaRendererProps {
  content: string;
  className?: string;
}

export type MediaItemType =
  | 'image'
  | 'pinterest'
  | 'google_drive'
  | 'figma'
  | 'video_direct'
  | 'video_youtube'
  | 'video_loom'
  | 'video_vimeo'
  | 'video_streamable'
  | 'web_link';

export interface MediaItem {
  type: MediaItemType;
  url: string;
  originalUrl: string;
  title?: string;
  domain?: string;
  thumbnailUrl?: string;
  pinId?: string;
  driveId?: string;
}

// In-memory frontend cache for link previews to prevent re-fetching across re-renders
const globalLinkMetaCache = new Map<
  string,
  { title?: string; imageUrl?: string; authorName?: string; description?: string }
>();

// Regex patterns to detect media URLs
const IMAGE_EXT_REGEX = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)(\?.*)?$/i;
const DIRECT_VIDEO_EXT_REGEX = /\.(mp4|webm|ogg|mov|m4v|mkv)(\?.*)?$/i;
const YOUTUBE_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
const LOOM_REGEX = /(?:https?:\/\/)?(?:www\.)?loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/i;
const VIMEO_REGEX = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/i;
const STREAMABLE_REGEX = /(?:https?:\/\/)?(?:www\.)?streamable\.com\/(?:e\/)?([a-zA-Z0-9]+)/i;
const FIGMA_REGEX =
  /(?:https?:\/\/)?(?:www\.)?figma\.com\/(?:file|design|proto|board)\/([a-zA-Z0-9]+)(?:\/([^\s?#]+))?/i;
const GOOGLE_DRIVE_REGEX =
  /(?:https?:\/\/)?(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^&]+&)*id=)([a-zA-Z0-9_-]+)/i;
const PINTEREST_PIN_REGEX =
  /(?:https?:\/\/)?(?:www\.|[a-z]{2}\.)?pinterest\.(?:com|co\.[a-z]{2}|[a-z]{2})\/pin\/(\d+)/i;
const PINTEREST_SHORT_REGEX = /(?:https?:\/\/)?pin\.it\/([a-zA-Z0-9]+)/i;

const MARKDOWN_IMG_REGEX = /!\[([^\]]*)\]\(((?:https?:\/\/|data:image\/)[^\s)]+)\)/gi;
const HTML_IMG_REGEX = /<img\s+[^>]*src=["']((?:https?:\/\/|data:image\/)[^"']+)["'][^>]*>/gi;
const DATA_IMAGE_REGEX =
  /(data:image\/(?:png|jpe?g|gif|webp|svg\+xml|avif|bmp);base64,[A-Za-z0-9+/=]+)/gi;
const URL_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;

function isCloudVideoUrl(url: string): boolean {
  if (DIRECT_VIDEO_EXT_REGEX.test(url)) return true;
  const lower = url.toLowerCase();
  return (
    lower.includes('/video/upload/') ||
    lower.includes('/videos/') ||
    (lower.includes('cloudinary.com') && lower.includes('/video/')) ||
    (lower.includes('firebasestorage.googleapis.com') &&
      (lower.includes('video') || lower.includes('.mp4')))
  );
}

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

function extractDomain(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'link';
  }
}

function formatUrlDisplay(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.replace(/^www\./, '');
    const path = parsed.pathname + parsed.search;
    if (path.length > 25) {
      return `${host}${path.slice(0, 22)}...`;
    }
    return `${host}${path === '/' ? '' : path}`;
  } catch {
    return rawUrl.length > 40 ? rawUrl.slice(0, 37) + '...' : rawUrl;
  }
}

export const DiscussionMediaRenderer: React.FC<DiscussionMediaRendererProps> = ({
  content,
  className = '',
}) => {
  const [lightboxModal, setLightboxModal] = useState<{
    isOpen: boolean;
    src: string;
    type: MediaLightboxType;
    alt?: string;
  }>({
    isOpen: false,
    src: '',
    type: 'image',
  });

  const [activeFullscreenId, setActiveFullscreenId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [linkMetaMap, setLinkMetaMap] = useState<
    Record<string, { title?: string; imageUrl?: string; authorName?: string; description?: string }>
  >(() => {
    const initial: Record<string, any> = {};
    globalLinkMetaCache.forEach((val, key) => {
      initial[key] = val;
    });
    return initial;
  });

  // Track fullscreen changes to update button icon state
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        setActiveFullscreenId(document.fullscreenElement.id || null);
      } else {
        setActiveFullscreenId(null);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Seamlessly maximize the active video player container in-place (no 2nd video instance)
  const handleToggleFullscreen = (containerId: string) => {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if ((el as any).webkitRequestFullscreen) {
        (el as any).webkitRequestFullscreen();
      } else if ((el as any).mozRequestFullScreen) {
        (el as any).mozRequestFullScreen();
      } else if ((el as any).msRequestFullscreen) {
        (el as any).msRequestFullscreen();
      }
    }
  };

  // Extract media items from text
  const { textWithoutStandaloneMedia, mediaItems } = useMemo(() => {
    const items: MediaItem[] = [];
    const seenUrls = new Set<string>();

    let processedText = content || '';

    // 1. Check for markdown images ![alt](url)
    processedText = processedText.replace(MARKDOWN_IMG_REGEX, (_match, alt, url) => {
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        items.push({
          type: 'image',
          url,
          originalUrl: url,
          title: alt || 'Attached Image',
        });
      }
      return '';
    });

    // 2. Check for HTML images <img src="url" />
    processedText = processedText.replace(HTML_IMG_REGEX, (_match, url) => {
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        items.push({
          type: 'image',
          url,
          originalUrl: url,
          title: 'Attached Image',
        });
      }
      return '';
    });

    // 3. Check for standalone base64 data URLs
    processedText = processedText.replace(DATA_IMAGE_REGEX, (_match, dataUrl) => {
      if (!seenUrls.has(dataUrl)) {
        seenUrls.add(dataUrl);
        items.push({
          type: 'image',
          url: dataUrl,
          originalUrl: dataUrl,
          title: 'Uploaded Image',
        });
      }
      return '';
    });

    // 4. Scan URLs in text for videos, Google Drive, YouTube, Loom, Pinterest, Figma, and direct files
    const urls = processedText.match(URL_REGEX) || [];
    for (const url of urls) {
      if (seenUrls.has(url)) continue;

      // YouTube embeds
      const ytMatch = url.match(YOUTUBE_REGEX);
      if (ytMatch && ytMatch[1]) {
        seenUrls.add(url);
        items.push({
          type: 'video_youtube',
          url: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0`,
          originalUrl: url,
          title: 'YouTube Video Player',
          domain: 'youtube.com',
        });
        if (processedText.trim() === url) {
          processedText = '';
        }
        continue;
      }

      // Loom embeds
      const loomMatch = url.match(LOOM_REGEX);
      if (loomMatch && loomMatch[1]) {
        seenUrls.add(url);
        items.push({
          type: 'video_loom',
          url: `https://www.loom.com/embed/${loomMatch[1]}`,
          originalUrl: url,
          title: 'Loom Video Recording',
          domain: 'loom.com',
        });
        if (processedText.trim() === url) {
          processedText = '';
        }
        continue;
      }

      // Google Drive video or file preview embed
      const driveMatch = url.match(GOOGLE_DRIVE_REGEX);
      if (driveMatch && driveMatch[1]) {
        seenUrls.add(url);
        const fileId = driveMatch[1];
        items.push({
          type: 'google_drive',
          url: `https://drive.google.com/file/d/${fileId}/preview`,
          originalUrl: url,
          title: 'Google Drive Video / File Preview',
          domain: 'drive.google.com',
          driveId: fileId,
        });
        if (processedText.trim() === url) {
          processedText = '';
        }
        continue;
      }

      // Vimeo embeds
      const vimeoMatch = url.match(VIMEO_REGEX);
      if (vimeoMatch && vimeoMatch[1]) {
        seenUrls.add(url);
        items.push({
          type: 'video_vimeo',
          url: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
          originalUrl: url,
          title: 'Vimeo Video Player',
          domain: 'vimeo.com',
        });
        if (processedText.trim() === url) {
          processedText = '';
        }
        continue;
      }

      // Streamable embeds
      const streamableMatch = url.match(STREAMABLE_REGEX);
      if (streamableMatch && streamableMatch[1]) {
        seenUrls.add(url);
        items.push({
          type: 'video_streamable',
          url: `https://streamable.com/e/${streamableMatch[1]}`,
          originalUrl: url,
          title: 'Streamable Video Player',
          domain: 'streamable.com',
        });
        if (processedText.trim() === url) {
          processedText = '';
        }
        continue;
      }

      // Direct Video files (mp4, webm, mov, mkv, cloud video)
      if (isCloudVideoUrl(url)) {
        seenUrls.add(url);
        items.push({
          type: 'video_direct',
          url,
          originalUrl: url,
          title: 'Video Attachment',
          domain: extractDomain(url),
        });
        if (processedText.trim() === url) {
          processedText = '';
        }
        continue;
      }

      // Pinterest Pin links
      const pinMatch = url.match(PINTEREST_PIN_REGEX);
      const pinShortMatch = url.match(PINTEREST_SHORT_REGEX);
      if (pinMatch || pinShortMatch) {
        seenUrls.add(url);
        const pinId = pinMatch ? pinMatch[1] : undefined;
        items.push({
          type: 'pinterest',
          url,
          originalUrl: url,
          title: 'Pinterest Pin',
          domain: 'pinterest.com',
          pinId,
        });
        if (processedText.trim() === url) {
          processedText = '';
        }
        continue;
      }

      // Figma links
      const figmaMatch = url.match(FIGMA_REGEX);
      if (figmaMatch && figmaMatch[1]) {
        seenUrls.add(url);
        const slug = figmaMatch[2]
          ? decodeURIComponent(figmaMatch[2]).replace(/-/g, ' ')
          : 'Figma Design';
        items.push({
          type: 'figma',
          url,
          originalUrl: url,
          title: slug,
          domain: 'figma.com',
        });
        if (processedText.trim() === url) {
          processedText = '';
        }
        continue;
      }

      // Images (direct or cloud hosted)
      if (isCloudImageUrl(url)) {
        seenUrls.add(url);
        let resolvedUrl = url;
        const gyazoMatch = url.match(/gyazo\.com\/([a-zA-Z0-9]{32})/i);
        if (gyazoMatch) {
          resolvedUrl = `https://i.gyazo.com/${gyazoMatch[1]}.png`;
        }
        const imgurMatch = url.match(/imgur\.com\/([a-zA-Z0-9]{5,8})$/i);
        if (imgurMatch) {
          resolvedUrl = `https://i.imgur.com/${imgurMatch[1]}.png`;
        }

        items.push({
          type: 'image',
          url: resolvedUrl,
          originalUrl: url,
          title: 'Image Attachment',
          domain: extractDomain(url),
        });
        if (processedText.trim() === url) {
          processedText = '';
        }
        continue;
      }

      // Any other general web link
      seenUrls.add(url);
      items.push({
        type: 'web_link',
        url,
        originalUrl: url,
        title: formatUrlDisplay(url),
        domain: extractDomain(url),
      });
      if (processedText.trim() === url) {
        processedText = '';
      }
    }

    return {
      textWithoutStandaloneMedia: processedText.trim(),
      mediaItems: items,
    };
  }, [content]);

  // Fetch link preview metadata for Pinterest and Web Links
  useEffect(() => {
    let isMounted = true;
    const fetchPromises: Promise<void>[] = [];

    for (const media of mediaItems) {
      if (media.type === 'pinterest' || media.type === 'web_link') {
        const targetUrl = media.originalUrl;
        if (!globalLinkMetaCache.has(targetUrl) && !linkMetaMap[targetUrl]) {
          const p = apiClient<{
            data: {
              url: string;
              title?: string;
              imageUrl?: string;
              authorName?: string;
              description?: string;
            };
          }>(`/meta/link-preview?url=${encodeURIComponent(targetUrl)}`)
            .then((res) => {
              if (isMounted && res?.data) {
                globalLinkMetaCache.set(targetUrl, res.data);
                setLinkMetaMap((prev) => ({ ...prev, [targetUrl]: res.data }));
              }
            })
            .catch(() => {
              // Ignore fetch failures gracefully
            });
          fetchPromises.push(p);
        }
      }
    }

    return () => {
      isMounted = false;
    };
  }, [mediaItems, linkMetaMap]);

  // Format text with mentions, bold, code, links
  const renderFormattedText = (rawText: string) => {
    if (!rawText) return null;

    const lines = rawText.split('\n');
    return lines.map((line, lineIdx) => {
      const parts = line.split(/(@\w+|https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g);

      return (
        <p key={lineIdx} className="leading-relaxed break-words my-0.5">
          {parts.map((part, partIdx) => {
            if (part.toLowerCase() === '@channel' || part.toLowerCase() === '@all') {
              return (
                <span
                  key={partIdx}
                  className="inline-flex items-center px-1.5 py-0.2 rounded-md font-bold text-[10px] bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 mr-1"
                >
                  {part}
                </span>
              );
            }
            if (part.startsWith('@')) {
              return (
                <span
                  key={partIdx}
                  className="font-bold text-[#22201F] dark:text-[#B1E743] bg-stone-100 dark:bg-stone-800 px-1 py-0.2 rounded"
                >
                  {part}
                </span>
              );
            }
            if (part.startsWith('http://') || part.startsWith('https://')) {
              return (
                <a
                  key={partIdx}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#22201F] dark:text-[#B1E743] underline hover:opacity-80 inline-flex items-center gap-0.5 font-medium"
                >
                  <span>{part.length > 40 ? part.slice(0, 37) + '...' : part}</span>
                  <ExternalLink className="h-2.5 w-2.5 inline shrink-0" />
                </a>
              );
            }
            return <span key={partIdx}>{part}</span>;
          })}
        </p>
      );
    });
  };

  return (
    <div className={`space-y-2 text-xs ${className}`}>
      {/* Main Comment Text */}
      {textWithoutStandaloneMedia && (
        <div className="text-inherit">{renderFormattedText(textWithoutStandaloneMedia)}</div>
      )}

      {/* Embedded Rich Media Gallery (Direct Video, YouTube, Drive, Loom, Images) */}
      {mediaItems.length > 0 && (
        <div className="grid grid-cols-1 gap-2.5 pt-1">
          {mediaItems.map((media, idx) => {
            const hasImgError = failedImages[media.url];
            const meta = linkMetaMap[media.originalUrl];
            const containerId = `media-video-container-${idx}`;
            const isFullscreen = activeFullscreenId === containerId;

            // 1. Direct Video Player (Plays directly & expands the SAME player seamlessly)
            if (media.type === 'video_direct') {
              return (
                <div
                  id={containerId}
                  key={`video-${idx}`}
                  className="rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-black max-w-md shadow-xs [&:fullscreen]:max-w-none [&:fullscreen]:w-screen [&:fullscreen]:h-screen [&:fullscreen]:flex [&:fullscreen]:flex-col [&:fullscreen]:justify-center [&:fullscreen]:rounded-none"
                >
                  <div className="p-2 bg-stone-900/90 flex items-center justify-between text-[11px] text-stone-200 border-b border-stone-800 shrink-0">
                    <div className="flex items-center gap-1.5 font-bold truncate pr-2">
                      <VideoIcon className="h-3.5 w-3.5 text-[#B1E743] shrink-0" />
                      <span className="truncate">{media.title || 'Video Player'}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleFullscreen(containerId)}
                      className="px-2 py-0.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white transition-all text-[10px] font-bold flex items-center gap-1 shrink-0"
                      title={
                        isFullscreen ? 'Kecilkan video' : 'Perbesar video yang sedang berjalan'
                      }
                    >
                      {isFullscreen ? (
                        <>
                          <Minimize2 className="h-3 w-3" />
                          <span>Kecilkan</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="h-3 w-3" />
                          <span>Perbesar</span>
                        </>
                      )}
                    </button>
                  </div>

                  <video
                    controls
                    playsInline
                    preload="metadata"
                    src={media.url}
                    className="w-full max-h-64 object-contain bg-black [&:fullscreen]:max-h-none [&:fullscreen]:h-full [&:fullscreen]:w-full"
                  >
                    Browser Anda tidak mendukung pemutaran video ini.
                  </video>
                </div>
              );
            }

            // 2. Embedded Video Players (YouTube, Loom, Vimeo, Streamable, Google Drive)
            if (
              media.type === 'video_youtube' ||
              media.type === 'video_loom' ||
              media.type === 'video_vimeo' ||
              media.type === 'video_streamable' ||
              media.type === 'google_drive'
            ) {
              return (
                <div
                  id={containerId}
                  key={`embed-${idx}`}
                  className="rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-black max-w-md shadow-xs [&:fullscreen]:max-w-none [&:fullscreen]:w-screen [&:fullscreen]:h-screen [&:fullscreen]:flex [&:fullscreen]:flex-col [&:fullscreen]:justify-center [&:fullscreen]:rounded-none"
                >
                  <div className="p-2 bg-stone-900/90 flex items-center justify-between text-[11px] text-stone-200 border-b border-stone-800 shrink-0">
                    <div className="flex items-center gap-1.5 font-bold truncate pr-2">
                      <Play className="h-3.5 w-3.5 text-[#B1E743] shrink-0" />
                      <span className="truncate">{media.title}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleFullscreen(containerId)}
                      className="px-2 py-0.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white transition-all text-[10px] font-bold flex items-center gap-1 shrink-0"
                      title={
                        isFullscreen ? 'Kecilkan video' : 'Perbesar video yang sedang berjalan'
                      }
                    >
                      {isFullscreen ? (
                        <>
                          <Minimize2 className="h-3 w-3" />
                          <span>Kecilkan</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="h-3 w-3" />
                          <span>Perbesar</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="relative aspect-video w-full bg-black flex-1 [&:fullscreen]:aspect-auto [&:fullscreen]:h-full">
                    <iframe
                      src={media.url}
                      title={media.title || 'In-App Video'}
                      className="absolute inset-0 w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                  </div>
                </div>
              );
            }

            // 3. Direct Images
            if (media.type === 'image' && !hasImgError) {
              return (
                <div
                  key={`media-${media.type}-${idx}`}
                  className="relative group rounded-2xl overflow-hidden border border-stone-800 bg-black max-w-sm cursor-pointer shadow-xs transition-all hover:border-[#B1E743]"
                  onClick={() => {
                    setLightboxModal({
                      isOpen: true,
                      src: media.url,
                      type: 'image',
                      alt: media.title || 'Image Preview',
                    });
                  }}
                >
                  <img
                    src={media.url}
                    alt={media.title || 'Image'}
                    className="max-h-64 w-full object-contain rounded-2xl bg-black"
                    loading="lazy"
                    onError={() => {
                      setFailedImages((prev) => ({ ...prev, [media.url]: true }));
                    }}
                  />
                  <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold pointer-events-none backdrop-blur-[2px]">
                    <ZoomIn className="h-4 w-4" />
                    <span>Klik untuk Memperbesar</span>
                  </div>

                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/80 text-[9px] font-bold text-white flex items-center gap-1 backdrop-blur-xs border border-stone-700/60">
                    <ImageIcon className="h-3 w-3 text-[#B1E743]" />
                    <span>IMAGE</span>
                  </div>
                </div>
              );
            }

            // 4. Pinterest Pin Preview
            if (media.type === 'pinterest') {
              const pinterestImg = meta?.imageUrl;

              if (pinterestImg && !failedImages[pinterestImg]) {
                return (
                  <div
                    key={`pinterest-img-${idx}`}
                    className="relative group rounded-2xl overflow-hidden border border-stone-800 bg-black max-w-sm cursor-pointer shadow-xs transition-all hover:border-red-400"
                    onClick={() => {
                      setLightboxModal({
                        isOpen: true,
                        src: pinterestImg,
                        type: 'image',
                        alt: meta?.title || 'Pinterest Pin Preview',
                      });
                    }}
                  >
                    <img
                      src={pinterestImg}
                      alt={meta?.title || 'Pinterest Pin'}
                      className="max-h-72 w-full object-contain rounded-2xl bg-black"
                      loading="lazy"
                      onError={() => {
                        setFailedImages((prev) => ({ ...prev, [pinterestImg]: true }));
                      }}
                    />

                    <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold pointer-events-none backdrop-blur-[2px]">
                      <ZoomIn className="h-4 w-4" />
                      <span>Klik untuk Memperbesar</span>
                    </div>

                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#E60023] text-white font-extrabold text-[9px] flex items-center gap-1 shadow-md">
                      <Pin className="h-3 w-3 fill-white" />
                      <span>PINTEREST</span>
                    </div>
                  </div>
                );
              }
            }

            // 5. Figma Design Preview Card
            if (media.type === 'figma') {
              return (
                <div
                  key={`figma-${idx}`}
                  className="flex items-center justify-between p-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 max-w-md shadow-xs transition-all hover:border-stone-400"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate flex items-center gap-1.5">
                        <span>Figma Design</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-extrabold uppercase">
                          UI/UX
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate capitalize">
                        {media.title || media.originalUrl}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // 6. Generic Web Link Card
            return (
              <div
                key={`link-${idx}`}
                className="flex items-center justify-between p-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 max-w-md shadow-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate">
                      {meta?.title || media.title || 'Web Link'}
                    </div>
                    <div className="text-[10px] text-stone-400 truncate">{media.domain}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal (Used exclusively for images) */}
      <MediaLightboxModal
        isOpen={lightboxModal.isOpen}
        src={lightboxModal.src}
        type={lightboxModal.type}
        alt={lightboxModal.alt}
        onClose={() => setLightboxModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
