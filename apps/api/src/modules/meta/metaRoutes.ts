import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { linkPreviewRateLimiter } from '../../http/middleware/rateLimit.js';
import { safeFetch, extractHtmlMetadata, ExtractedMetadata } from './ssrfProtection.js';

export const metaRoutes = Router();

// In-memory cache for link metadata (500 items, 1 hour TTL)
interface CacheEntry {
  data: ExtractedMetadata;
  expiresAt: number;
}

const previewCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 500;

export function clearPreviewCache(): void {
  previewCache.clear();
}

/**
 * Fetch Pinterest oEmbed data safely with socket pinning
 */
async function fetchPinterestOembed(pinUrl: string): Promise<ExtractedMetadata | null> {
  const oembedUrl = `https://www.pinterest.com/oembed.json?url=${encodeURIComponent(pinUrl)}`;
  const fetchRes = await safeFetch(oembedUrl, {
    allowedContentTypes: ['application/json', 'text/javascript'],
  });

  if (!fetchRes.ok || !fetchRes.jsonData) return null;
  const data = fetchRes.jsonData;

  return {
    url: pinUrl,
    title: typeof data.title === 'string' ? data.title : 'Pinterest Pin',
    description: typeof data.title === 'string' ? data.title : '',
    imageUrl:
      typeof data.thumbnail_url === 'string'
        ? data.thumbnail_url
        : typeof data.image_url === 'string'
          ? data.image_url
          : undefined,
    siteName: 'Pinterest',
    favicon: 'https://www.google.com/s2/favicons?domain=pinterest.com&sz=32',
    authorName: typeof data.author_name === 'string' ? data.author_name : undefined,
  };
}

/**
 * GET /v1/meta/link-preview?url=...
 * Authenticated endpoint to resolve link metadata & Pinterest / OpenGraph image previews with SSRF protection
 */
metaRoutes.get(
  '/meta/link-preview',
  authenticate,
  linkPreviewRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const targetUrl = req.query.url;

    if (!targetUrl || typeof targetUrl !== 'string') {
      res
        .status(400)
        .json({ error: { code: 'INVALID_URL', message: 'Query parameter "url" is required.' } });
      return;
    }

    // 1. Syntactic URL validation (protocol, credentials, hostname)
    let parsedTarget: URL;
    try {
      parsedTarget = new URL(targetUrl);
    } catch {
      res.status(400).json({
        error: {
          code: 'INVALID_URL',
          message: 'The provided URL is invalid.',
        },
      });
      return;
    }

    if (parsedTarget.protocol !== 'http:' && parsedTarget.protocol !== 'https:') {
      res.status(400).json({
        error: {
          code: 'UNSAFE_URL',
          message: 'The provided URL is not supported or allowed.',
        },
      });
      return;
    }

    if (parsedTarget.username || parsedTarget.password) {
      res.status(400).json({
        error: {
          code: 'UNSAFE_URL',
          message: 'The provided URL is not supported or allowed.',
        },
      });
      return;
    }

    // 2. Check in-memory cache before executing network request
    const cached = previewCache.get(targetUrl);
    if (cached && cached.expiresAt > Date.now()) {
      res.status(200).json({ data: cached.data });
      return;
    }

    // 3. Strict Pinterest hostname detection
    const targetHostname = parsedTarget.hostname.toLowerCase();
    const isPinterest =
      targetHostname === 'pinterest.com' ||
      targetHostname.endsWith('.pinterest.com') ||
      targetHostname === 'pin.it' ||
      targetHostname.endsWith('.pin.it');

    try {
      let result: ExtractedMetadata | null = null;

      if (isPinterest) {
        try {
          result = await fetchPinterestOembed(targetUrl);
        } catch {
          result = null;
        }
      }

      // 4. Fetch target URL metadata with single-hop DNS resolution & IP pinning
      if (!result) {
        const fetchRes = await safeFetch(targetUrl, {
          allowedContentTypes: ['text/html', 'application/xhtml+xml'],
        });

        if (fetchRes.ok && fetchRes.html) {
          result = extractHtmlMetadata(fetchRes.html, fetchRes.finalUrl || targetUrl);
        } else if (
          fetchRes.error === 'UNSAFE_REDIRECT' ||
          fetchRes.error === 'UNSAFE_URL' ||
          fetchRes.error === 'INTERNAL_HOSTNAME_BLOCKED' ||
          fetchRes.error === 'PRIVATE_IP_BLOCKED' ||
          fetchRes.error === 'RESOLVED_TO_PRIVATE_IP' ||
          fetchRes.error === 'UNSUPPORTED_PROTOCOL' ||
          fetchRes.error === 'CREDENTIALS_NOT_ALLOWED' ||
          fetchRes.error === 'TOO_MANY_REDIRECTS' ||
          fetchRes.error === 'INVALID_REDIRECT_LOCATION'
        ) {
          res.status(400).json({
            error: {
              code: 'UNSAFE_URL',
              message: 'The provided URL is not supported or allowed.',
            },
          });
          return;
        } else if (fetchRes.error === 'RESPONSE_TOO_LARGE') {
          res.status(400).json({
            error: {
              code: 'RESPONSE_TOO_LARGE',
              message: 'The requested resource exceeds the maximum permitted size.',
            },
          });
          return;
        } else {
          // Safe fallback for unreachable, non-HTML, or timeout pages without leaking internal details
          const cleanHostname = parsedTarget.hostname.replace(/^www\./, '');
          result = {
            url: targetUrl,
            title: cleanHostname,
            siteName: cleanHostname,
            favicon: `https://www.google.com/s2/favicons?domain=${cleanHostname}&sz=32`,
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
    } catch {
      let fallbackHostname = 'link';
      try {
        fallbackHostname = parsedTarget.hostname.replace(/^www\./, '');
      } catch {
        // Safe default
      }
      res.status(200).json({
        data: {
          url: targetUrl,
          title: fallbackHostname,
          siteName: fallbackHostname,
        },
      });
    }
  },
);
