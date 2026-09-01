import dns from 'node:dns';
import net from 'node:net';

export const MAX_REDIRECTS = 3;
export const MAX_BODY_BYTES = 512 * 1024; // 512 KB
export const DEFAULT_TIMEOUT_MS = 3500; // 3.5 seconds

export type DnsLookupFn = (hostname: string) => Promise<Array<{ address: string; family: number }>>;

/**
 * Default DNS lookup resolving all IPv4 and IPv6 addresses
 */
export const defaultDnsLookup: DnsLookupFn = async (hostname: string) => {
  return await dns.promises.lookup(hostname, { all: true });
};

/**
 * Checks if a 32-bit unsigned integer represents a private, loopback,
 * link-local, multicast, reserved, or broadcast IPv4 address.
 */
export function isPrivateOrReservedIpv4Int(num: number): boolean {
  // 0.0.0.0/8 - Unspecified / Current Network
  if ((num & 0xff000000) >>> 0 === 0x00000000) return true;

  // 10.0.0.0/8 - Private (RFC 1918)
  if ((num & 0xff000000) >>> 0 === 0x0a000000) return true;

  // 100.64.0.0/10 - Carrier-Grade NAT (RFC 6598, includes Alibaba metadata 100.100.100.200)
  if ((num & 0xffc00000) >>> 0 === 0x64400000) return true;

  // 127.0.0.0/8 - Loopback
  if ((num & 0xff000000) >>> 0 === 0x7f000000) return true;

  // 169.254.0.0/16 - Link-Local / Cloud Metadata (RFC 3927)
  if ((num & 0xffff0000) >>> 0 === 0xa9fe0000) return true;

  // 172.16.0.0/12 - Private (RFC 1918)
  if ((num & 0xfff00000) >>> 0 === 0xac100000) return true;

  // 192.0.0.0/24 - IETF Protocol Assignments
  if ((num & 0xffffff00) >>> 0 === 0xc0000000) return true;

  // 192.0.2.0/24 - TEST-NET-1 (RFC 5737)
  if ((num & 0xffffff00) >>> 0 === 0xc0000200) return true;

  // 192.88.99.0/24 - 6to4 Relay Anycast (RFC 7526)
  if ((num & 0xffffff00) >>> 0 === 0xc0586300) return true;

  // 192.168.0.0/16 - Private (RFC 1918)
  if ((num & 0xffff0000) >>> 0 === 0xc0a80000) return true;

  // 198.18.0.0/15 - Network Interconnect Device Benchmark (RFC 2544)
  if ((num & 0xfffe0000) >>> 0 === 0xc6120000) return true;

  // 198.51.100.0/24 - TEST-NET-2 (RFC 5737)
  if ((num & 0xffffff00) >>> 0 === 0xc6336400) return true;

  // 203.0.113.0/24 - TEST-NET-3 (RFC 5737)
  if ((num & 0xffffff00) >>> 0 === 0xcb007100) return true;

  // 224.0.0.0/4 - Multicast (RFC 5771)
  if ((num & 0xf0000000) >>> 0 === 0xe0000000) return true;

  // 240.0.0.0/4 - Reserved for Future Use / Broadcast 255.255.255.255 (RFC 1112)
  if ((num & 0xf0000000) >>> 0 === 0xf0000000) return true;

  return false;
}

/**
 * Parses an IPv4 string into a 32-bit unsigned integer, or null if invalid.
 */
export function parseIpv4(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;

  let num = 0;
  for (let i = 0; i < 4; i++) {
    const p = parts[i];
    if (!/^\d+$/.test(p)) return null;
    const val = Number(p);
    if (val < 0 || val > 255) return null;
    num = ((num << 8) | val) >>> 0;
  }
  return num;
}

/**
 * Expands and parses an IPv6 string into 8 16-bit word values [w0..w7].
 * Handles standard, compressed, IPv4-mapped, and IPv4-compatible representations.
 */
export function parseIpv6Words(rawIp: string): number[] | null {
  let ip = rawIp.trim().toLowerCase();

  // Strip brackets
  if (ip.startsWith('[') && ip.endsWith(']')) {
    ip = ip.slice(1, -1);
  }

  // Strip zone identifier (%eth0, %1, etc.)
  const zoneIndex = ip.indexOf('%');
  if (zoneIndex !== -1) {
    ip = ip.slice(0, zoneIndex);
  }

  // Handle embedded IPv4 at the end (e.g. ::ffff:192.168.1.1 or ::127.0.0.1)
  const lastColon = ip.lastIndexOf(':');
  if (lastColon !== -1) {
    const tail = ip.slice(lastColon + 1);
    if (tail.includes('.')) {
      const v4Num = parseIpv4(tail);
      if (v4Num === null) return null;
      const w6 = (v4Num >>> 16) & 0xffff;
      const w7 = v4Num & 0xffff;
      ip = `${ip.slice(0, lastColon)}:${w6.toString(16)}:${w7.toString(16)}`;
    }
  }

  // Split on double colon (::)
  const doubleColonCount = (ip.match(/::/g) || []).length;
  if (doubleColonCount > 1) return null;

  let segments: string[];
  if (doubleColonCount === 1) {
    const [left, right] = ip.split('::');
    const leftParts = left ? left.split(':') : [];
    const rightParts = right ? right.split(':') : [];
    const missing = 8 - (leftParts.length + rightParts.length);
    if (missing < 1) return null;
    const zeros = new Array(missing).fill('0');
    segments = [...leftParts, ...zeros, ...rightParts];
  } else {
    segments = ip.split(':');
  }

  if (segments.length !== 8) return null;

  const words: number[] = [];
  for (const seg of segments) {
    if (!/^[0-9a-f]{1,4}$/i.test(seg)) return null;
    words.push(parseInt(seg, 16));
  }

  return words;
}

/**
 * Validates whether an IPv4 or IPv6 address is private, loopback, link-local,
 * multicast, carrier-grade NAT, cloud metadata, or reserved.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return true;

  const cleanIp = ip.trim().replace(/^\[|\]$/g, '');

  // 1. Try IPv4
  const v4Num = parseIpv4(cleanIp);
  if (v4Num !== null) {
    return isPrivateOrReservedIpv4Int(v4Num);
  }

  // 2. Try IPv6
  const words = parseIpv6Words(cleanIp);
  if (words !== null) {
    const [w0, w1, w2, w3, w4, w5, w6, w7] = words;

    // ::1/128 - Loopback
    if (
      w0 === 0 &&
      w1 === 0 &&
      w2 === 0 &&
      w3 === 0 &&
      w4 === 0 &&
      w5 === 0 &&
      w6 === 0 &&
      w7 === 1
    ) {
      return true;
    }

    // ::/128 - Unspecified
    if (
      w0 === 0 &&
      w1 === 0 &&
      w2 === 0 &&
      w3 === 0 &&
      w4 === 0 &&
      w5 === 0 &&
      w6 === 0 &&
      w7 === 0
    ) {
      return true;
    }

    // ::ffff:0:0/96 - IPv4-mapped IPv6
    if (w0 === 0 && w1 === 0 && w2 === 0 && w3 === 0 && w4 === 0 && w5 === 0xffff) {
      const embeddedV4 = ((w6 << 16) | w7) >>> 0;
      return isPrivateOrReservedIpv4Int(embeddedV4);
    }

    // ::0:0/96 - IPv4-compatible IPv6 (deprecated)
    if (
      w0 === 0 &&
      w1 === 0 &&
      w2 === 0 &&
      w3 === 0 &&
      w4 === 0 &&
      w5 === 0 &&
      (w6 !== 0 || w7 > 1)
    ) {
      const embeddedV4 = ((w6 << 16) | w7) >>> 0;
      return isPrivateOrReservedIpv4Int(embeddedV4);
    }

    // 2002::/16 - 6to4 prefix (contains embedded IPv4 in w1:w2)
    if (w0 === 0x2002) {
      const embeddedV4 = ((w1 << 16) | w2) >>> 0;
      return isPrivateOrReservedIpv4Int(embeddedV4);
    }

    // 2001:0000::/32 - Teredo prefix (contains embedded IPv4 in client/server fields)
    if (w0 === 0x2001 && w1 === 0x0000) {
      const serverV4 = ((w2 << 16) | w3) >>> 0;
      const clientV4 = ~((w6 << 16) | w7) >>> 0;
      if (isPrivateOrReservedIpv4Int(serverV4) || isPrivateOrReservedIpv4Int(clientV4)) {
        return true;
      }
    }

    // fc00::/7 - Unique Local Unicast (ULA: fc00:: to fdff::, includes AWS fd00:ec2::254)
    if ((w0 & 0xfe00) === 0xfc00) return true;

    // fe80::/10 - Link-Local Unicast (fe80:: to febf::)
    if ((w0 & 0xffc0) === 0xfe80) return true;

    // ff00::/8 - Multicast
    if ((w0 & 0xff00) === 0xff00) return true;

    // fec0::/10 - Site-Local (deprecated RFC 3879)
    if ((w0 & 0xffc0) === 0xfec0) return true;

    // 2001:db8::/32 - Documentation (RFC 3849)
    if (w0 === 0x2001 && w1 === 0x0db8) return true;

    // 0100::/64 - Discard-only prefix (RFC 6666)
    if (w0 === 0x0100 && w1 === 0 && w2 === 0 && w3 === 0) return true;

    // 2001:2::/48 - Benchmarking (RFC 5180)
    if (w0 === 0x2001 && w1 === 0x0002) return true;

    return false;
  }

  // Not a valid standard IP format
  return true;
}

/**
 * Checks for non-standard IPv4 representations like octal (0177.0.0.1),
 * hex (0x7f000001), or decimal integers (2130706433).
 */
export function parseNonStandardIpv4(host: string): number | null {
  // Pure decimal integer (e.g. 2130706433 or 0)
  if (/^\d+$/.test(host)) {
    const val = Number(host);
    if (!Number.isNaN(val) && val >= 0 && val <= 0xffffffff) {
      return val >>> 0;
    }
  }

  // Dotted hex or octal or mixed formats: e.g. 0x7f.0.0.1 or 0177.0.0.1
  const parts = host.split('.');
  if (parts.length >= 1 && parts.length <= 4) {
    const parsedParts: number[] = [];
    for (const part of parts) {
      let partVal: number;
      if (/^0x[0-9a-f]+$/i.test(part)) {
        partVal = parseInt(part, 16);
      } else if (/^0[0-7]+$/.test(part)) {
        partVal = parseInt(part, 8);
      } else if (/^\d+$/.test(part)) {
        partVal = parseInt(part, 10);
      } else {
        return null;
      }
      if (Number.isNaN(partVal) || partVal < 0) return null;
      parsedParts.push(partVal);
    }

    // Convert multi-part format to 32-bit integer per socket conventions
    if (parsedParts.length === 4) {
      if (parsedParts.some((p) => p > 255)) return null;
      return (
        ((parsedParts[0] << 24) |
          (parsedParts[1] << 16) |
          (parsedParts[2] << 8) |
          parsedParts[3]) >>>
        0
      );
    }
    if (parsedParts.length === 3) {
      if (parsedParts[0] > 255 || parsedParts[1] > 255 || parsedParts[2] > 0xffff) return null;
      return ((parsedParts[0] << 24) | (parsedParts[1] << 16) | (parsedParts[2] & 0xffff)) >>> 0;
    }
    if (parsedParts.length === 2) {
      if (parsedParts[0] > 255 || parsedParts[1] > 0xffffff) return null;
      return ((parsedParts[0] << 24) | (parsedParts[1] & 0xffffff)) >>> 0;
    }
    if (parsedParts.length === 1) {
      if (parsedParts[0] > 0xffffffff) return null;
      return parsedParts[0] >>> 0;
    }
  }

  return null;
}

export interface ValidateUrlSafetyOptions {
  dnsResolver?: DnsLookupFn;
  allowTestLocalhost?: boolean;
}

export interface ValidateUrlSafetyResult {
  safe: boolean;
  error?: string;
  parsedUrl?: URL;
  resolvedAddresses?: string[];
}

/**
 * Checks if a hostname or IP string is specifically a loopback address.
 */
export function isLoopback(hostname: string): boolean {
  const norm = hostname
    .toLowerCase()
    .trim()
    .replace(/^\[|\]$/g, '');
  if (norm === 'localhost' || norm.endsWith('.localhost') || norm === '::1') return true;
  const v4 = parseIpv4(norm);
  if (v4 !== null) {
    return (v4 & 0xff000000) >>> 0 === 0x7f000000;
  }
  const nonStd = parseNonStandardIpv4(norm);
  if (nonStd !== null) {
    return (nonStd & 0xff000000) >>> 0 === 0x7f000000;
  }
  return false;
}

/**
 * Validates a target URL against SSRF vulnerabilities:
 * - Allows only http: and https:
 * - Rejects credentials
 * - Rejects localhost, internal domain suffixes, and cloud metadata names
 * - Resolves hostname and verifies every resolved IP is public
 */
export async function validateUrlSafety(
  rawUrl: string,
  optionsOrResolver?: ValidateUrlSafetyOptions | DnsLookupFn,
): Promise<ValidateUrlSafetyResult> {
  const options: ValidateUrlSafetyOptions =
    typeof optionsOrResolver === 'function'
      ? { dnsResolver: optionsOrResolver }
      : optionsOrResolver || {};

  const dnsResolver = options.dnsResolver || defaultDnsLookup;

  if (!rawUrl || typeof rawUrl !== 'string') {
    return { safe: false, error: 'INVALID_URL' };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { safe: false, error: 'INVALID_URL' };
  }

  // 1. Protocol validation: strictly http or https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, error: 'UNSUPPORTED_PROTOCOL' };
  }

  // 2. Reject credentials in URL
  if (parsed.username || parsed.password) {
    return { safe: false, error: 'CREDENTIALS_NOT_ALLOWED' };
  }

  const rawHostname = parsed.hostname;
  if (!rawHostname) {
    return { safe: false, error: 'INVALID_HOSTNAME' };
  }

  const hostname = rawHostname.toLowerCase().trim();
  const normalizedHost = hostname.replace(/\.+$/, '');

  // 3. Reject localhost and internal domain patterns
  if (
    normalizedHost === 'localhost' ||
    normalizedHost.endsWith('.localhost') ||
    normalizedHost.endsWith('.local') ||
    normalizedHost.endsWith('.internal') ||
    normalizedHost.endsWith('.lan') ||
    normalizedHost.endsWith('.home.arpa') ||
    normalizedHost === 'metadata.google.internal'
  ) {
    if (!(options.allowTestLocalhost && isLoopback(normalizedHost))) {
      return { safe: false, error: 'INTERNAL_HOSTNAME_BLOCKED' };
    }
  }

  // 4. Check for non-standard IPv4 formats (decimal, octal, hex)
  const nonStandardIpv4 = parseNonStandardIpv4(hostname);
  if (nonStandardIpv4 !== null) {
    if (isPrivateOrReservedIpv4Int(nonStandardIpv4)) {
      const isV4Loopback = (nonStandardIpv4 & 0xff000000) >>> 0 === 0x7f000000;
      if (!(options.allowTestLocalhost && isV4Loopback)) {
        return { safe: false, error: 'PRIVATE_IP_BLOCKED' };
      }
    }
  }

  // 5. Check if hostname is directly an IP literal
  const ipType = net.isIP(hostname.replace(/^\[|\]$/g, ''));
  if (ipType !== 0) {
    if (isPrivateOrReservedIp(hostname)) {
      if (!(options.allowTestLocalhost && isLoopback(hostname))) {
        return { safe: false, error: 'PRIVATE_IP_BLOCKED' };
      }
    }
    return { safe: true, parsedUrl: parsed, resolvedAddresses: [hostname] };
  }

  // 6. Perform DNS resolution and verify all returned addresses
  try {
    const lookups = await dnsResolver(hostname);
    if (!lookups || lookups.length === 0) {
      return { safe: false, error: 'DNS_LOOKUP_EMPTY' };
    }

    const resolvedIps = lookups.map((l) => l.address);
    for (const ip of resolvedIps) {
      if (isPrivateOrReservedIp(ip)) {
        if (!(options.allowTestLocalhost && isLoopback(ip))) {
          return { safe: false, error: 'RESOLVED_TO_PRIVATE_IP' };
        }
      }
    }

    return { safe: true, parsedUrl: parsed, resolvedAddresses: resolvedIps };
  } catch {
    return { safe: false, error: 'DNS_LOOKUP_FAILED' };
  }
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxRedirects?: number;
  maxBodyBytes?: number;
  allowedContentTypes?: string[];
  dnsResolver?: DnsLookupFn;
  allowTestLocalhost?: boolean;
}

export interface SafeFetchResponse {
  ok: boolean;
  html?: string;
  jsonData?: any;
  finalUrl?: string;
  statusCode?: number;
  contentType?: string;
  error?: string;
}

/**
 * Safely fetches a URL by:
 * - Validating initial URL and re-validating every redirect target
 * - Limiting redirect hops (max 3)
 * - Restricting Content-Type (HTML or JSON)
 * - Streaming response body up to maxBodyBytes (512KB) and truncating/aborting
 * - Applying strict timeouts
 * - Preventing header/credential leakage
 */
export async function safeFetch(
  targetUrl: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResponse> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;
  const maxBodyBytes = options.maxBodyBytes ?? MAX_BODY_BYTES;
  const allowedContentTypes = options.allowedContentTypes ?? ['text/html', 'application/xhtml+xml'];

  let currentUrl = targetUrl;
  let hops = 0;

  while (hops <= maxRedirects) {
    // 1. Re-validate current hop destination
    const safetyCheck = await validateUrlSafety(currentUrl, {
      dnsResolver: options.dnsResolver,
      allowTestLocalhost: options.allowTestLocalhost,
    });

    if (!safetyCheck.safe) {
      return {
        ok: false,
        error: hops === 0 ? 'UNSAFE_URL' : 'UNSAFE_REDIRECT',
      };
    }

    let response: Response;
    try {
      response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual', // Strictly control redirects manually
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.1',
        },
      });
    } catch (err: any) {
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
        return { ok: false, error: 'TIMEOUT' };
      }
      return { ok: false, error: 'FETCH_FAILED' };
    }

    // 2. Handle Redirects (301, 302, 303, 307, 308)
    if (
      response.status === 301 ||
      response.status === 302 ||
      response.status === 303 ||
      response.status === 307 ||
      response.status === 308
    ) {
      hops++;
      if (hops > maxRedirects) {
        return { ok: false, error: 'TOO_MANY_REDIRECTS' };
      }

      const locationHeader = response.headers.get('location');
      if (!locationHeader) {
        return { ok: false, error: 'INVALID_REDIRECT_LOCATION' };
      }

      try {
        currentUrl = new URL(locationHeader, currentUrl).toString();
      } catch {
        return { ok: false, error: 'INVALID_REDIRECT_LOCATION' };
      }
      continue;
    }

    // 3. Handle non-success statuses
    if (!response.ok) {
      return {
        ok: false,
        error: 'HTTP_ERROR',
        statusCode: response.status,
      };
    }

    // 4. Validate Content-Type
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (allowedContentTypes.length > 0) {
      const isAllowed = allowedContentTypes.some((type) => contentType.includes(type));
      if (!isAllowed) {
        return {
          ok: false,
          error: 'INVALID_CONTENT_TYPE',
          contentType,
        };
      }
    }

    // 5. Read response body stream with strict size limit (maxBodyBytes)
    let bodyText: string;
    try {
      if (response.body) {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let totalBytes = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            totalBytes += value.length;
            if (totalBytes >= maxBodyBytes) {
              await reader.cancel().catch(() => {});
              break;
            }
          }
        }

        const combined = new Uint8Array(Math.min(totalBytes, maxBodyBytes));
        let offset = 0;
        for (const chunk of chunks) {
          const toCopy = Math.min(chunk.length, maxBodyBytes - offset);
          combined.set(chunk.subarray(0, toCopy), offset);
          offset += toCopy;
          if (offset >= maxBodyBytes) break;
        }

        bodyText = new TextDecoder('utf-8', { fatal: false }).decode(combined);
      } else {
        bodyText = await response.text();
      }
    } catch {
      return { ok: false, error: 'STREAM_READ_FAILED' };
    }

    // If json response was requested
    if (contentType.includes('application/json')) {
      try {
        const jsonData = JSON.parse(bodyText);
        return {
          ok: true,
          jsonData,
          finalUrl: currentUrl,
          statusCode: response.status,
          contentType,
        };
      } catch {
        return { ok: false, error: 'INVALID_JSON' };
      }
    }

    return {
      ok: true,
      html: bodyText,
      finalUrl: currentUrl,
      statusCode: response.status,
      contentType,
    };
  }

  return { ok: false, error: 'TOO_MANY_REDIRECTS' };
}

export interface ExtractedMetadata {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  favicon?: string;
  authorName?: string;
}

/**
 * Extracts OpenGraph, Twitter, and standard HTML metadata from HTML string safely.
 */
export function extractHtmlMetadata(html: string, targetUrl: string): ExtractedMetadata {
  const getMetaContent = (propertyOrName: string): string | undefined => {
    const regex = new RegExp(
      `<meta\\s+(?:name|property)=["'](?:og:|twitter:)?${propertyOrName}["']\\s+content=["']([^"']+)["']`,
      'i',
    );
    const match = html.match(regex);
    if (match && match[1]) return match[1].trim();

    const regexReversed = new RegExp(
      `<meta\\s+content=["']([^"']+)["']\\s+(?:name|property)=["'](?:og:|twitter:)?${propertyOrName}["']`,
      'i',
    );
    const matchReversed = html.match(regexReversed);
    return matchReversed ? matchReversed[1].trim() : undefined;
  };

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    parsedUrl = new URL('https://unknown.domain');
  }

  const title =
    getMetaContent('title') || (titleMatch && titleMatch[1] ? titleMatch[1].trim() : undefined);
  const description = getMetaContent('description');
  let imageUrl = getMetaContent('image');

  // Resolve relative image URLs safely to absolute
  if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    try {
      imageUrl = new URL(imageUrl, targetUrl).toString();
    } catch {
      imageUrl = undefined;
    }
  }

  const hostname = parsedUrl.hostname.replace(/^www\./, '');
  const siteName = getMetaContent('site_name') || hostname;

  return {
    url: targetUrl,
    title: title || siteName,
    description,
    imageUrl,
    siteName,
    favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`,
  };
}
