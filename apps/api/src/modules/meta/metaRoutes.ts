import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../../http/middleware/authenticate.js';

export const metaRoutes = Router();

// In-memory cache for link metadata (500 items, 1 hour TTL)
interface CacheEntry {
  data: {
    url: string;
    title?: string;
    description?: string;
    imageUrl?: string;
    siteName?: string;
    favicon?: string;
    authorName?: string;
  };
  expiresAt: number;
}

const previewCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 500;

function isSafeUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    // Block private/internal hostnames
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('172.16.') ||
      host.startsWith('172.17.') ||
      host.startsWith('172.18.') ||
      host.startsWith('172.19.') ||
      host.startsWith('172.20.') ||
      host.startsWith('172.21.') ||
      host.startsWith('172.22.') ||
      host.startsWith('172.23.') ||
      host.startsWith('172.24.') ||
      host.startsWith('172.25.') ||
      host.startsWith('172.26.') ||
      host.startsWith('172.27.') ||
      host.startsWith('172.28.') ||
      host.startsWith('172.29.') ||
      host.startsWith('172.30.') ||
      host.startsWith('172.31.') ||
      host === '169.254.169.254' // Cloud metadata IP
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch Pinterest oEmbed data directly
 */
async function fetchPinterestOembed(pinUrl: string) {
  const oembedUrl = `https://www.pinterest.com/oembed.json?url=${encodeURIComponent(pinUrl)}`;
  const response = await fetch(oembedUrl, {
    signal: AbortSignal.timeout(4000),
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  });

  if (!response.ok) return null;
  const data = (await response.json()) as any;

  return {
    url: pinUrl,
    title: data.title || 'Pinterest Pin',
    description: data.title || '',
    imageUrl: data.thumbnail_url || data.image_url,
    siteName: 'Pinterest',
    favicon: 'https://www.google.com/s2/favicons?domain=pinterest.com&sz=32',
    authorName: data.author_name,
  };
}

/**
 * Fetch HTML and extract OpenGraph / Twitter metadata
 */
async function fetchHtmlMeta(targetUrl: string) {
  const response = await fetch(targetUrl, {
    signal: AbortSignal.timeout(4000),
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) return null;

  const html = await response.text();

  // Extract meta tags via regex
  const getMetaContent = (propertyOrName: string): string | undefined => {
    const regex = new RegExp(
      `<meta\\s+(?:name|property)=["'](?:og:|twitter:)?${propertyOrName}["']\\s+content=["']([^"']+)["']`,
      'i'
    );
    const match = html.match(regex);
    if (match && match[1]) return match[1];

    const regexReversed = new RegExp(
      `<meta\\s+content=["']([^"']+)["']\\s+(?:name|property)=["'](?:og:|twitter:)?${propertyOrName}["']`,
      'i'
    );
    const matchReversed = html.match(regexReversed);
    return matchReversed ? matchReversed[1] : undefined;
  };

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = getMetaContent('title') || (titleMatch ? titleMatch[1].trim() : undefined);
  const description = getMetaContent('description');
  const imageUrl = getMetaContent('image');
  const siteName = getMetaContent('site_name') || new URL(targetUrl).hostname.replace(/^www\./, '');

  return {
    url: targetUrl,
    title: title || siteName,
    description,
    imageUrl,
    siteName,
    favicon: `https://www.google.com/s2/favicons?domain=${new URL(targetUrl).hostname}&sz=32`,
  };
}

/**
 * GET /v1/meta/link-preview?url=...
 * Authenticated endpoint to resolve link metadata & Pinterest / OpenGraph image previews
 */
metaRoutes.get('/meta/link-preview', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const targetUrl = req.query.url as string;

  if (!targetUrl || typeof targetUrl !== 'string') {
    res.status(400).json({ error: { code: 'INVALID_URL', message: 'Query parameter "url" is required.' } });
    return;
  }

  if (!isSafeUrl(targetUrl)) {
    res.status(400).json({ error: { code: 'UNSAFE_URL', message: 'The provided URL is not supported or allowed.' } });
    return;
  }

  // Check in-memory cache
  const cached = previewCache.get(targetUrl);
  if (cached && cached.expiresAt > Date.now()) {
    res.status(200).json({ data: cached.data });
    return;
  }

  try {
    let result: any = null;

    // 1. Pinterest detection
    if (targetUrl.includes('pinterest.com') || targetUrl.includes('pin.it')) {
      try {
        result = await fetchPinterestOembed(targetUrl);
      } catch (err) {
        // Fallback to HTML meta
        result = null;
      }
    }

    // 2. Generic HTML meta fetch
    if (!result) {
      try {
        result = await fetchHtmlMeta(targetUrl);
      } catch (err) {
        // Fallback default
        const parsed = new URL(targetUrl);
        result = {
          url: targetUrl,
          title: parsed.hostname,
          siteName: parsed.hostname,
          favicon: `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`,
        };
      }
    }

    // Store in cache
    if (previewCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = previewCache.keys().next().value;
      if (oldestKey) previewCache.delete(oldestKey);
    }

    previewCache.set(targetUrl, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    res.status(200).json({ data: result });
  } catch (error: any) {
    res.status(200).json({
      data: {
        url: targetUrl,
        title: targetUrl,
        siteName: new URL(targetUrl).hostname,
      },
    });
  }
});
