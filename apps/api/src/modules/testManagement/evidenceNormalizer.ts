import type { EvidenceMediaKind, EvidencePreviewStatus } from '@qlick/contracts';

export interface NormalizedEvidence {
  url: string;
  provider: string;
  mediaKind: EvidenceMediaKind;
  normalizedUrl: string;
  previewStatus: EvidencePreviewStatus;
}

export function normalizeEvidenceUrl(rawUrl: string): NormalizedEvidence {
  const trimmed = rawUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('BAD_REQUEST: Invalid evidence URL format.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('BAD_REQUEST: Only secure HTTPS URLs are permitted for evidence links.');
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname;

  // Direct image files
  if (/\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(pathname)) {
    return {
      url: trimmed,
      provider: 'direct_image',
      mediaKind: 'image',
      normalizedUrl: trimmed,
      previewStatus: 'ready',
    };
  }

  // Direct video files
  if (/\.(mp4|webm|ogg|mov|m4v)$/i.test(pathname)) {
    return {
      url: trimmed,
      provider: 'direct_video',
      mediaKind: 'video',
      normalizedUrl: trimmed,
      previewStatus: 'ready',
    };
  }

  // Google Drive
  if (hostname === 'drive.google.com' || hostname.endsWith('.drive.google.com')) {
    const fileIdMatch = pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const idParam = parsed.searchParams.get('id');
    const fileId = fileIdMatch ? fileIdMatch[1] : idParam;
    if (fileId) {
      return {
        url: trimmed,
        provider: 'google_drive',
        mediaKind: 'video',
        normalizedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        previewStatus: 'ready',
      };
    }
  }

  // YouTube
  if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com') || hostname === 'youtu.be') {
    let videoId: string | null = null;
    if (hostname === 'youtu.be') {
      videoId = pathname.slice(1);
    } else if (pathname.startsWith('/watch')) {
      videoId = parsed.searchParams.get('v');
    } else if (pathname.startsWith('/embed/')) {
      videoId = pathname.split('/embed/')[1];
    } else if (pathname.startsWith('/v/')) {
      videoId = pathname.split('/v/')[1];
    }
    if (videoId) {
      const cleanVideoId = videoId.split('&')[0].split('?')[0];
      return {
        url: trimmed,
        provider: 'youtube',
        mediaKind: 'video',
        normalizedUrl: `https://www.youtube-nocookie.com/embed/${cleanVideoId}`,
        previewStatus: 'ready',
      };
    }
  }

  // Loom
  if (hostname === 'loom.com' || hostname.endsWith('.loom.com')) {
    const shareMatch = pathname.match(/\/share\/([a-zA-Z0-9]+)/);
    const embedMatch = pathname.match(/\/embed\/([a-zA-Z0-9]+)/);
    const loomId = shareMatch ? shareMatch[1] : embedMatch ? embedMatch[1] : null;
    if (loomId) {
      return {
        url: trimmed,
        provider: 'loom',
        mediaKind: 'video',
        normalizedUrl: `https://www.loom.com/embed/${loomId}`,
        previewStatus: 'ready',
      };
    }
  }

  // Vimeo
  if (hostname === 'vimeo.com' || hostname.endsWith('.vimeo.com')) {
    const vimeoMatch = pathname.match(/\/(\d+)/);
    if (vimeoMatch) {
      return {
        url: trimmed,
        provider: 'vimeo',
        mediaKind: 'video',
        normalizedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
        previewStatus: 'ready',
      };
    }
  }

  // Unsupported or other external link
  return {
    url: trimmed,
    provider: 'external',
    mediaKind: 'document',
    normalizedUrl: trimmed,
    previewStatus: 'unsupported',
  };
}
