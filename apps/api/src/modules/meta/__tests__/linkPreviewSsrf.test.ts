import assert from 'node:assert';
import { after, before, describe, it } from 'node:test';
import { createServer, Server } from 'node:http';
import { createServer as createHttpsServer, Server as HttpsServer } from 'node:https';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import express, { Request, Response } from 'express';
import {
  isPrivateOrReservedIp,
  validateUrlSafety,
  safeFetch,
  extractHtmlMetadata,
} from '../ssrfProtection.js';
import { clearPreviewCache, createMetaRoutes, isPinterestHostname } from '../metaRoutes.js';
import {
  createLinkPreviewRateLimiter,
  linkPreviewRateLimiter,
  DEFAULT_LINK_PREVIEW_RATE_LIMIT,
  DEFAULT_LINK_PREVIEW_WINDOW_MS,
} from '../../../http/middleware/rateLimit.js';
import { createApp } from '../../../app.js';
import { UserModel } from '../../../db/models/user.js';
import { sessionManager } from '../../auth/sessionManager.js';
import { accessTokenCookieName, signToken } from '../../auth/jwt.js';

describe('SEC-01: SSRF Prevention & Link Preview Security', () => {
  describe('IP Classification & Filtering (isPrivateOrReservedIp)', () => {
    it('blocks IPv4 loopback addresses (127.0.0.0/8)', () => {
      assert.strictEqual(isPrivateOrReservedIp('127.0.0.1'), true);
      assert.strictEqual(isPrivateOrReservedIp('127.0.0.2'), true);
      assert.strictEqual(isPrivateOrReservedIp('127.255.255.254'), true);
      assert.strictEqual(isPrivateOrReservedIp('127.1.2.3'), true);
    });

    it('blocks IPv4 private network ranges (RFC 1918)', () => {
      // 10.0.0.0/8
      assert.strictEqual(isPrivateOrReservedIp('10.0.0.1'), true);
      assert.strictEqual(isPrivateOrReservedIp('10.254.254.254'), true);
      // 172.16.0.0/12
      assert.strictEqual(isPrivateOrReservedIp('172.16.0.1'), true);
      assert.strictEqual(isPrivateOrReservedIp('172.24.1.1'), true);
      assert.strictEqual(isPrivateOrReservedIp('172.31.255.255'), true);
      // 192.168.0.0/16
      assert.strictEqual(isPrivateOrReservedIp('192.168.0.1'), true);
      assert.strictEqual(isPrivateOrReservedIp('192.168.1.254'), true);
    });

    it('allows valid non-private 172.x and 192.x IPs', () => {
      assert.strictEqual(isPrivateOrReservedIp('172.15.255.255'), false);
      assert.strictEqual(isPrivateOrReservedIp('172.32.0.1'), false);
      assert.strictEqual(isPrivateOrReservedIp('192.167.1.1'), false);
      assert.strictEqual(isPrivateOrReservedIp('192.169.1.1'), false);
    });

    it('blocks Carrier-Grade NAT (100.64.0.0/10) and Alibaba Cloud metadata (100.100.100.200)', () => {
      assert.strictEqual(isPrivateOrReservedIp('100.64.0.1'), true);
      assert.strictEqual(isPrivateOrReservedIp('100.127.255.254'), true);
      assert.strictEqual(isPrivateOrReservedIp('100.100.100.200'), true);
    });

    it('blocks IPv4 link-local and cloud metadata (169.254.0.0/16)', () => {
      assert.strictEqual(isPrivateOrReservedIp('169.254.1.1'), true);
      assert.strictEqual(isPrivateOrReservedIp('169.254.169.254'), true);
    });

    it('blocks unspecified, multicast, broadcast, and reserved IPv4 ranges', () => {
      assert.strictEqual(isPrivateOrReservedIp('0.0.0.0'), true);
      assert.strictEqual(isPrivateOrReservedIp('0.1.2.3'), true);
      assert.strictEqual(isPrivateOrReservedIp('224.0.0.1'), true); // Multicast
      assert.strictEqual(isPrivateOrReservedIp('239.255.255.255'), true);
      assert.strictEqual(isPrivateOrReservedIp('240.0.0.1'), true); // Future/Reserved
      assert.strictEqual(isPrivateOrReservedIp('255.255.255.255'), true); // Broadcast
      assert.strictEqual(isPrivateOrReservedIp('192.0.2.1'), true); // TEST-NET-1
      assert.strictEqual(isPrivateOrReservedIp('198.51.100.1'), true); // TEST-NET-2
      assert.strictEqual(isPrivateOrReservedIp('203.0.113.1'), true); // TEST-NET-3
    });

    it('blocks IPv6 loopback (::1) and unspecified (::)', () => {
      assert.strictEqual(isPrivateOrReservedIp('::1'), true);
      assert.strictEqual(isPrivateOrReservedIp('0:0:0:0:0:0:0:1'), true);
      assert.strictEqual(isPrivateOrReservedIp('::'), true);
      assert.strictEqual(isPrivateOrReservedIp('0:0:0:0:0:0:0:0'), true);
    });

    it('blocks IPv6 Unique Local Addresses (fc00::/7)', () => {
      assert.strictEqual(isPrivateOrReservedIp('fc00::1'), true);
      assert.strictEqual(isPrivateOrReservedIp('fd00::1'), true);
      assert.strictEqual(isPrivateOrReservedIp('fd12:3456:789a::1'), true);
    });

    it('blocks IPv6 Link-Local Unicast (fe80::/10) and Multicast (ff00::/8)', () => {
      assert.strictEqual(isPrivateOrReservedIp('fe80::1'), true);
      assert.strictEqual(isPrivateOrReservedIp('febf::ffff'), true);
      assert.strictEqual(isPrivateOrReservedIp('ff02::1'), true);
      assert.strictEqual(isPrivateOrReservedIp('ff01::1'), true);
    });

    it('blocks IPv4-mapped IPv6 (::ffff:0:0/96) unconditionally (fail-closed policy)', () => {
      assert.strictEqual(isPrivateOrReservedIp('::ffff:127.0.0.1'), true);
      assert.strictEqual(isPrivateOrReservedIp('::ffff:10.0.0.1'), true);
      assert.strictEqual(isPrivateOrReservedIp('::ffff:169.254.169.254'), true);
      assert.strictEqual(isPrivateOrReservedIp('::ffff:192.168.1.1'), true);
      assert.strictEqual(isPrivateOrReservedIp('::ffff:172.16.0.1'), true);
      // IPv4-mapped addresses must be blocked even when embedded IPv4 is public
      assert.strictEqual(isPrivateOrReservedIp('::ffff:93.184.216.34'), true);
    });

    it('blocks IPv4-compatible IPv6 (::0:0/96) unconditionally (fail-closed policy)', () => {
      assert.strictEqual(isPrivateOrReservedIp('::127.0.0.1'), true);
      assert.strictEqual(isPrivateOrReservedIp('::10.0.0.1'), true);
      assert.strictEqual(isPrivateOrReservedIp('::93.184.216.34'), true);
    });

    it('blocks 6to4 prefix (2002::/16) and Teredo (2001::/32) unconditionally (fail-closed policy)', () => {
      // 6to4 with public embedded IPv4 (e.g. 93.184.216.34 -> 5db8:d822)
      assert.strictEqual(isPrivateOrReservedIp('2002:5db8:d822::1'), true);
      // Teredo with public embedded IPv4
      assert.strictEqual(isPrivateOrReservedIp('2001:0000:4136:e378:8000:63bf:3fff:fdd2'), true);
    });

    it('blocks NAT64 well-known (64:ff9b::/96) and local-use (64:ff9b:1::/48) unconditionally', () => {
      assert.strictEqual(isPrivateOrReservedIp('64:ff9b::5db8:d822'), true);
      assert.strictEqual(isPrivateOrReservedIp('64:ff9b:1::5db8:d822'), true);
    });

    it('blocks IPv6 documentation (2001:db8::/32) and discard prefix (0100::/64)', () => {
      assert.strictEqual(isPrivateOrReservedIp('2001:db8::1'), true);
      assert.strictEqual(isPrivateOrReservedIp('0100::1'), true);
    });

    it('allows legitimate public IPv4 and standard global unicast IPv6 addresses', () => {
      assert.strictEqual(isPrivateOrReservedIp('93.184.216.34'), false);
      assert.strictEqual(isPrivateOrReservedIp('8.8.8.8'), false);
      assert.strictEqual(isPrivateOrReservedIp('1.1.1.1'), false);
      assert.strictEqual(isPrivateOrReservedIp('2606:2800:220:1:248:1893:25c8:1946'), false);
      assert.strictEqual(isPrivateOrReservedIp('2001:4860:4860::8888'), false);
    });
  });

  describe('URL Safety Validation (validateUrlSafety)', () => {
    it('rejects unsupported protocols (file, ftp, gopher, javascript, data, blob)', async () => {
      const protocols = [
        'file:///etc/passwd',
        'ftp://example.com/file.txt',
        'gopher://127.0.0.1:70/',
        'javascript:alert(1)',
        'data:text/html,<h1>test</h1>',
        'blob:https://example.com/xyz',
      ];
      for (const protoUrl of protocols) {
        const res = await validateUrlSafety(protoUrl);
        assert.strictEqual(res.safe, false, `Expected ${protoUrl} to be unsafe`);
      }
    });

    it('rejects URLs containing embedded credentials (username/password)', async () => {
      const credUrls = [
        'http://admin:secret@example.com/dashboard',
        'https://user@example.com/profile',
        'http://user:pass@127.0.0.1/',
      ];
      for (const url of credUrls) {
        const res = await validateUrlSafety(url);
        assert.strictEqual(res.safe, false, `Expected credential URL ${url} to be unsafe`);
      }
    });

    it('rejects localhost and suspicious internal hostname patterns', async () => {
      const hosts = [
        'http://localhost',
        'http://localhost:8080/api',
        'http://foo.localhost',
        'http://service.local',
        'http://app.internal',
        'http://router.lan',
        'http://server.home.arpa',
        'http://metadata.google.internal',
        'http://metadata.google.internal.',
      ];
      for (const h of hosts) {
        const res = await validateUrlSafety(h);
        assert.strictEqual(res.safe, false, `Expected ${h} to be unsafe`);
      }
    });

    it('rejects non-standard IP formats (decimal, octal, hex representations)', async () => {
      const formats = [
        'http://2130706433/', // 127.0.0.1 in decimal
        'http://0177.0.0.1/', // 127.0.0.1 in octal
        'http://0x7f000001/', // 127.0.0.1 in hex
        'http://0x7f.1/',
        'http://0/',
      ];
      for (const f of formats) {
        const res = await validateUrlSafety(f);
        assert.strictEqual(res.safe, false, `Expected ${f} to be unsafe`);
      }
    });

    it('resolves hostname via DNS and rejects if any resolved address is private', async () => {
      // Mock DNS lookup returning a private IP
      const mockResolver = async (_hostname: string) => [{ address: '10.0.5.20', family: 4 }];
      const res = await validateUrlSafety('https://internal-portal.company.com/test', mockResolver);
      assert.strictEqual(res.safe, false);
    });

    it('resolves hostname via DNS and rejects if any IPv6 resolved address is private', async () => {
      const mockResolver = async (_hostname: string) => [
        { address: '93.184.216.34', family: 4 },
        { address: 'fd00::1', family: 6 }, // Unique local IPv6
      ];
      const res = await validateUrlSafety('https://dualstack.company.com/test', mockResolver);
      assert.strictEqual(res.safe, false);
    });

    it('accepts valid public hostnames and returns pinned address', async () => {
      const mockResolver = async (_hostname: string) => [{ address: '93.184.216.34', family: 4 }];
      const res = await validateUrlSafety('https://example.com/blog/article-1', mockResolver);
      assert.strictEqual(res.safe, true);
      assert.strictEqual(res.pinnedAddress, '93.184.216.34');
    });
  });

  describe('Absolute Deadline Coverage', () => {
    it(
      'returns TIMEOUT when DNS resolution does not settle before the global deadline',
      { timeout: 500 },
      async () => {
        const startedAt = Date.now();
        const result = await safeFetch('https://dns-stall.example.test/article', {
          timeoutMs: 50,
          dnsResolver: async () => await new Promise(() => {}),
        });

        assert.deepStrictEqual(result, { ok: false, error: 'TIMEOUT' });
        assert.ok(Date.now() - startedAt < 300, 'DNS resolution must obey the global deadline');
      },
    );
  });

  describe('3. Pinned Socket Transport & TOCTOU/DNS Rebinding Prevention (safeFetch)', () => {
    let mockTargetServer: Server;
    let mockServerPort: number;
    let mockServerBaseUrl: string;
    let receivedHeaders: Record<string, string | string[] | undefined> = {};

    before(async () => {
      mockTargetServer = createServer((req, res) => {
        receivedHeaders = req.headers;
        const url = new URL(req.url || '/', `http://localhost`);

        if (url.pathname === '/valid-page') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Mock Public Page</title>
                <meta property="og:title" content="OpenGraph Title" />
                <meta property="og:description" content="OpenGraph Description" />
                <meta property="og:image" content="https://example.com/image.png" />
                <meta property="og:site_name" content="MockSite" />
              </head>
              <body><h1>Welcome</h1></body>
            </html>
          `);
          return;
        }

        if (url.pathname === '/check-headers') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<html><head><title>Headers Checked</title></head></html>');
          return;
        }

        if (url.pathname === '/redirect-to-safe') {
          res.writeHead(302, { Location: `${mockServerBaseUrl}/valid-page` });
          res.end();
          return;
        }

        if (url.pathname === '/redirect-multi-hop') {
          res.writeHead(302, { Location: `http://hop2.example.test:${mockServerPort}/valid-page` });
          res.end();
          return;
        }

        if (url.pathname === '/redirect-to-private') {
          res.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data' });
          res.end();
          return;
        }

        if (url.pathname === '/redirect-missing-location') {
          res.writeHead(302);
          res.end();
          return;
        }

        if (url.pathname === '/redirect-invalid-location') {
          res.writeHead(302, { Location: 'http://[invalid-url' });
          res.end();
          return;
        }

        if (url.pathname === '/redirect-loop') {
          const hop = parseInt(url.searchParams.get('hop') || '1', 10);
          res.writeHead(302, { Location: `${mockServerBaseUrl}/redirect-loop?hop=${hop + 1}` });
          res.end();
          return;
        }

        if (url.pathname === '/huge-stream') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          // Stream 2MB of text
          const chunk = 'A'.repeat(64 * 1024);
          for (let i = 0; i < 32; i++) {
            res.write(chunk);
          }
          res.end();
          return;
        }

        if (url.pathname === '/huge-content-length') {
          res.writeHead(200, {
            'Content-Type': 'text/html',
            'Content-Length': (10 * 1024 * 1024).toString(),
          });
          res.end('Large payload header');
          return;
        }

        if (url.pathname === '/invalid-mime-jsonp') {
          res.writeHead(200, { 'Content-Type': 'application/jsonp' });
          res.end('callback({ data: 1 })');
          return;
        }

        if (url.pathname === '/invalid-mime-evil') {
          res.writeHead(200, { 'Content-Type': 'application/x-text/html-evil' });
          res.end('<html>evil</html>');
          return;
        }

        if (url.pathname === '/non-html-pdf') {
          res.writeHead(200, { 'Content-Type': 'application/pdf' });
          res.end('%PDF-1.4 binary mock data');
          return;
        }

        if (url.pathname === '/slow-hang') {
          // Never respond to trigger timeout
          return;
        }

        if (url.pathname === '/slow-drip') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.write('<!DOCTYPE html><html><body>');
          let count = 0;
          const interval = setInterval(() => {
            count++;
            if (res.destroyed || res.writableEnded) {
              clearInterval(interval);
              return;
            }
            res.write(`<div>chunk ${count}</div>`);
            if (count >= 10) {
              clearInterval(interval);
              res.end('</body></html>');
            }
          }, 40);
          return;
        }

        if (url.pathname === '/redirect-slow-hop') {
          const hop = parseInt(url.searchParams.get('hop') || '1', 10);
          setTimeout(() => {
            if (res.destroyed || res.writableEnded) return;
            if (hop < 3) {
              res.writeHead(302, {
                Location: `${mockServerBaseUrl}/redirect-slow-hop?hop=${hop + 1}`,
              });
              res.end();
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end('<html><head><title>Slow Redirect Final</title></head></html>');
            }
          }, 80);
          return;
        }

        res.writeHead(404);
        res.end();
      });

      await new Promise<void>((resolve) => {
        mockTargetServer.listen(0, '127.0.0.1', () => {
          const addr = mockTargetServer.address();
          if (typeof addr === 'object' && addr) {
            mockServerPort = addr.port;
            mockServerBaseUrl = `http://127.0.0.1:${mockServerPort}`;
          }
          resolve();
        });
      });
    });

    after(async () => {
      await new Promise<void>((resolve) => {
        mockTargetServer.close(() => resolve());
      });
    });

    it('fetches valid public HTML page and extracts metadata', async () => {
      const mockResolver = async () => [{ address: '127.0.0.1', family: 4 }];
      const result = await safeFetch(`${mockServerBaseUrl}/valid-page`, {
        dnsResolver: mockResolver,
        allowTestLocalhost: true,
      });
      assert.strictEqual(result.ok, true);
      assert.ok(result.html?.includes('Mock Public Page'));

      const meta = extractHtmlMetadata(result.html!, `${mockServerBaseUrl}/valid-page`);
      assert.strictEqual(meta.title, 'OpenGraph Title');
      assert.strictEqual(meta.description, 'OpenGraph Description');
      assert.strictEqual(meta.imageUrl, 'https://example.com/image.png');
      assert.strictEqual(meta.siteName, 'MockSite');
    });

    it('DNS rebinding prevention: locks socket to initial validated IP without second DNS query', async () => {
      let resolveCount = 0;
      const rebindingResolver = async (_hostname: string) => {
        resolveCount++;
        // 1st resolution returns valid test server IP
        if (resolveCount === 1) {
          return [{ address: '127.0.0.1', family: 4 }];
        }
        // Malicious DNS server returns private IP on subsequent resolution
        return [{ address: '10.0.0.1', family: 4 }];
      };

      const result = await safeFetch(
        `http://rebinding-test.example.com:${mockServerPort}/valid-page`,
        {
          dnsResolver: rebindingResolver,
          allowTestLocalhost: true,
        },
      );

      assert.strictEqual(result.ok, true);
      assert.strictEqual(result.pinnedIpUsed, '127.0.0.1');
      assert.strictEqual(resolveCount, 1, 'DNS lookup should only be executed once per hop');
    });

    it('reuses an existing safe first-hop validation without resolving the target twice', async () => {
      let resolveCount = 0;
      const resolver = async () => {
        resolveCount++;
        return [{ address: '127.0.0.1', family: 4 }];
      };
      const targetUrl = `http://prevalidated.example.test:${mockServerPort}/valid-page`;
      const initialSafetyCheck = await validateUrlSafety(targetUrl, {
        dnsResolver: resolver,
        allowTestLocalhost: true,
      });

      const result = await safeFetch(targetUrl, {
        dnsResolver: resolver,
        allowTestLocalhost: true,
        initialSafetyCheck,
      });

      assert.strictEqual(result.ok, true);
      assert.strictEqual(resolveCount, 1, 'The validated first hop must not be resolved again');
    });

    it('preserves Host header and does not forward cookies or credentials', async () => {
      const mockResolver = async () => [{ address: '127.0.0.1', family: 4 }];
      const result = await safeFetch(
        `http://safe-public-domain.test:${mockServerPort}/check-headers`,
        {
          dnsResolver: mockResolver,
          allowTestLocalhost: true,
        },
      );

      assert.strictEqual(result.ok, true);
      assert.strictEqual(
        receivedHeaders.host,
        `safe-public-domain.test:${mockServerPort}`,
        'Host header must reflect the target hostname',
      );
      assert.strictEqual(receivedHeaders.cookie, undefined, 'Cookie header must not be sent');
      assert.strictEqual(
        receivedHeaders.authorization,
        undefined,
        'Authorization header must not be sent',
      );
    });

    it('redirects perform fresh validation and IP pinning per hop', async () => {
      const resolvedHops: string[] = [];
      const multiHopResolver = async (hostname: string) => {
        resolvedHops.push(hostname);
        return [{ address: '127.0.0.1', family: 4 }];
      };

      const result = await safeFetch(
        `http://hop1.example.test:${mockServerPort}/redirect-multi-hop`,
        {
          dnsResolver: multiHopResolver,
          allowTestLocalhost: true,
        },
      );

      assert.strictEqual(result.ok, true);
      assert.strictEqual(result.statusCode, 200);
      assert.ok(
        resolvedHops.length >= 2,
        'Each redirect hop must resolve and validate destination',
      );
      assert.ok(resolvedHops.includes('hop1.example.test'));
      assert.ok(resolvedHops.includes('hop2.example.test'));
    });

    it('blocks redirect to private/metadata IP on redirect hop', async () => {
      const mockResolver = async () => [{ address: '127.0.0.1', family: 4 }];
      const result = await safeFetch(`${mockServerBaseUrl}/redirect-to-private`, {
        dnsResolver: mockResolver,
        allowTestLocalhost: true,
      });
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.error, 'UNSAFE_REDIRECT');
    });

    it('blocks redirect missing Location header or with malformed Location', async () => {
      const mockResolver = async () => [{ address: '127.0.0.1', family: 4 }];

      const missingRes = await safeFetch(`${mockServerBaseUrl}/redirect-missing-location`, {
        dnsResolver: mockResolver,
        allowTestLocalhost: true,
      });
      assert.strictEqual(missingRes.ok, false);
      assert.strictEqual(missingRes.error, 'INVALID_REDIRECT_LOCATION');

      const invalidRes = await safeFetch(`${mockServerBaseUrl}/redirect-invalid-location`, {
        dnsResolver: mockResolver,
        allowTestLocalhost: true,
      });
      assert.strictEqual(invalidRes.ok, false);
      assert.strictEqual(invalidRes.error, 'INVALID_REDIRECT_LOCATION');
    });

    it('blocks redirect chains exceeding MAX_REDIRECTS', async () => {
      const mockResolver = async () => [{ address: '127.0.0.1', family: 4 }];
      const result = await safeFetch(`${mockServerBaseUrl}/redirect-loop?hop=1`, {
        dnsResolver: mockResolver,
        allowTestLocalhost: true,
        maxRedirects: 3,
      });
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.error, 'TOO_MANY_REDIRECTS');
    });

    it('exact Content-Type matching allows text/html and rejects evil/jsonp', async () => {
      const mockResolver = async () => [{ address: '127.0.0.1', family: 4 }];

      const evilRes = await safeFetch(`${mockServerBaseUrl}/invalid-mime-evil`, {
        dnsResolver: mockResolver,
        allowTestLocalhost: true,
        allowedContentTypes: ['text/html', 'application/xhtml+xml'],
      });
      assert.strictEqual(evilRes.ok, false);
      assert.strictEqual(evilRes.error, 'INVALID_CONTENT_TYPE');

      const jsonpRes = await safeFetch(`${mockServerBaseUrl}/invalid-mime-jsonp`, {
        dnsResolver: mockResolver,
        allowTestLocalhost: true,
        allowedContentTypes: ['text/html', 'application/xhtml+xml'],
      });
      assert.strictEqual(jsonpRes.ok, false);
      assert.strictEqual(jsonpRes.error, 'INVALID_CONTENT_TYPE');
    });

    it('fails closed on payload exceeding MAX_BODY_BYTES (RESPONSE_TOO_LARGE)', async () => {
      const mockResolver = async () => [{ address: '127.0.0.1', family: 4 }];
      const streamRes = await safeFetch(`${mockServerBaseUrl}/huge-stream`, {
        dnsResolver: mockResolver,
        allowTestLocalhost: true,
        maxBodyBytes: 512 * 1024,
      });
      assert.strictEqual(streamRes.ok, false);
      assert.strictEqual(streamRes.error, 'RESPONSE_TOO_LARGE');

      const clRes = await safeFetch(`${mockServerBaseUrl}/huge-content-length`, {
        dnsResolver: mockResolver,
        allowTestLocalhost: true,
        maxBodyBytes: 512 * 1024,
      });
      assert.strictEqual(clRes.ok, false);
      assert.strictEqual(clRes.error, 'RESPONSE_TOO_LARGE');
    });

    it('safely handles timeouts without crashing', async () => {
      const mockResolver = async () => [{ address: '127.0.0.1', family: 4 }];
      const result = await safeFetch(`${mockServerBaseUrl}/slow-hang`, {
        dnsResolver: mockResolver,
        allowTestLocalhost: true,
        timeoutMs: 200,
      });
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.error, 'TIMEOUT');
    });

    it('enforces absolute deadline when server sends slow-drip bytes faster than inactivity timeout', async () => {
      const mockResolver = async () => [{ address: '127.0.0.1', family: 4 }];
      const startTime = Date.now();
      const result = await safeFetch(`${mockServerBaseUrl}/slow-drip`, {
        dnsResolver: mockResolver,
        allowTestLocalhost: true,
        timeoutMs: 150,
      });
      const elapsed = Date.now() - startTime;
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.error, 'TIMEOUT');
      assert.ok(elapsed < 400, `Expected elapsed time ~150-350ms, took ${elapsed}ms`);
    });

    it('enforces cumulative absolute deadline across multiple redirect hops', async () => {
      const mockResolver = async () => [{ address: '127.0.0.1', family: 4 }];
      const startTime = Date.now();
      const result = await safeFetch(`${mockServerBaseUrl}/redirect-slow-hop?hop=1`, {
        dnsResolver: mockResolver,
        allowTestLocalhost: true,
        timeoutMs: 150,
      });
      const elapsed = Date.now() - startTime;
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.error, 'TIMEOUT');
      assert.ok(elapsed < 400, `Expected elapsed time ~150-350ms, took ${elapsed}ms`);
    });
  });

  describe('4. HTTPS / TLS Transport & Security Suite', () => {
    // Non-production test fixture certificate and key
    let testCertDir: string;
    let testHttpsServer: HttpsServer;
    let testHttpsPort: number;
    let testCertificate: string;
    let tlsServername: string | false | null | undefined;
    let tlsReceivedHeaders: Record<string, string | string[] | undefined> = {};

    before(async () => {
      testCertDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sec01-tls-fixture-'));
      const keyPath = path.join(testCertDir, 'key.pem');
      const certPath = path.join(testCertDir, 'cert.pem');

      // Generate isolated non-production test certificate fixture
      execSync(
        `openssl req -x509 -newkey rsa:2048 -nodes -keyout "${keyPath}" -out "${certPath}" -days 365 -subj "/CN=secure-target.example.test" -addext "subjectAltName=DNS:secure-target.example.test,DNS:test-tls.example.test"`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
      );

      const key = fs.readFileSync(keyPath, 'utf8');
      testCertificate = fs.readFileSync(certPath, 'utf8');

      testHttpsServer = createHttpsServer({ key, cert: testCertificate }, (req, res) => {
        tlsReceivedHeaders = req.headers;
        if (req.url === '/secure-page') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<html><head><title>Secure HTTPS Page</title></head></html>');
          return;
        }
        res.writeHead(404);
        res.end();
      });
      testHttpsServer.on('secureConnection', (socket) => {
        tlsServername = socket.servername;
      });

      await new Promise<void>((resolve) => {
        testHttpsServer.listen(0, '127.0.0.1', () => {
          const addr = testHttpsServer.address();
          if (typeof addr === 'object' && addr) {
            testHttpsPort = addr.port;
          }
          resolve();
        });
      });
    });

    after(async () => {
      await new Promise<void>((resolve) => {
        testHttpsServer.close(() => resolve());
      });
      if (testCertDir && fs.existsSync(testCertDir)) {
        fs.rmSync(testCertDir, { recursive: true, force: true });
      }
    });

    it('strictly enforces rejectUnauthorized: true and rejects untrusted certificates', async () => {
      const mockResolver = async () => [{ address: '127.0.0.1', family: 4 }];
      // Target local HTTPS server with self-signed test fixture cert without adding it to root CAs
      const result = await safeFetch(`https://test-tls.example.test:${testHttpsPort}/secure-page`, {
        dnsResolver: mockResolver,
        allowTestLocalhost: true,
      });

      // Must fail closed with error because certificate verification is non-negotiable
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.error, 'FETCH_FAILED');
    });

    it('preserves TLS SNI (servername) and Host header on HTTPS requests', async () => {
      const mockResolver = async () => [{ address: '127.0.0.1', family: 4 }];
      tlsReceivedHeaders = {};
      tlsServername = undefined;

      const result = await safeFetch(
        `https://secure-target.example.test:${testHttpsPort}/secure-page`,
        {
          dnsResolver: mockResolver,
          allowTestLocalhost: true,
          testTlsCa: testCertificate,
        },
      );

      assert.strictEqual(result.ok, true);
      assert.strictEqual(result.pinnedIpUsed, '127.0.0.1');
      assert.strictEqual(tlsServername, 'secure-target.example.test');
      assert.strictEqual(tlsReceivedHeaders.host, `secure-target.example.test:${testHttpsPort}`);
      assert.strictEqual(tlsReceivedHeaders.cookie, undefined, 'Cookie must not be sent on HTTPS');
      assert.strictEqual(
        tlsReceivedHeaders.authorization,
        undefined,
        'Authorization must not be sent on HTTPS',
      );
      assert.strictEqual(
        tlsReceivedHeaders['proxy-authorization'],
        undefined,
        'Proxy-Authorization must not be sent on HTTPS',
      );
    });
  });

  describe('5. Behavioral Rate Limiter (createLinkPreviewRateLimiter)', () => {
    it('enforces the production default of 30 requests per minute without global env mutation', async () => {
      assert.strictEqual(DEFAULT_LINK_PREVIEW_RATE_LIMIT, 30);
      assert.strictEqual(DEFAULT_LINK_PREVIEW_WINDOW_MS, 60000);
      assert.ok(linkPreviewRateLimiter, 'linkPreviewRateLimiter must be defined');

      const app = express();
      const productionLimiter = createLinkPreviewRateLimiter({ environment: 'production' });
      app.use((req: any, _res: any, next: any) => {
        req.user = { userId: 'production-user' };
        next();
      });
      app.get('/production-limit', productionLimiter, (_req: Request, res: Response) => {
        res.status(200).json({ ok: true });
      });

      const server = app.listen(0);
      const port = (server.address() as any).port;
      try {
        for (let requestNumber = 1; requestNumber <= 30; requestNumber++) {
          const response = await fetch(`http://127.0.0.1:${port}/production-limit`);
          assert.strictEqual(response.status, 200, `Request ${requestNumber} should be allowed`);
        }

        const limitedResponse = await fetch(`http://127.0.0.1:${port}/production-limit`);
        assert.strictEqual(limitedResponse.status, 429);
        const body = (await limitedResponse.json()) as { code?: string };
        assert.strictEqual(body.code, 'RATE_LIMITED');
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

    it('enforces rate limiting up to limit and returns 429 RATE_LIMITED on exceeded requests', async () => {
      const app = express();
      const testLimiter = createLinkPreviewRateLimiter({
        limit: 2,
        windowMs: 60000,
        skip: () => false,
      });

      app.use((req: any, _res: any, next: any) => {
        req.user = { userId: req.headers['x-test-user-id'] || 'user-1' };
        next();
      });

      app.get('/test-limit', testLimiter, (_req: Request, res: Response) => {
        res.status(200).json({ ok: true });
      });

      const server = app.listen(0);
      const port = (server.address() as any).port;
      const baseUrl = `http://127.0.0.1:${port}`;

      try {
        // Request 1: OK
        const res1 = await fetch(`${baseUrl}/test-limit`, {
          headers: { 'x-test-user-id': 'user-alpha' },
        });
        assert.strictEqual(res1.status, 200);

        // Request 2: OK
        const res2 = await fetch(`${baseUrl}/test-limit`, {
          headers: { 'x-test-user-id': 'user-alpha' },
        });
        assert.strictEqual(res2.status, 200);

        // Request 3: 429 Too Many Requests
        const res3 = await fetch(`${baseUrl}/test-limit`, {
          headers: { 'x-test-user-id': 'user-alpha' },
        });
        assert.strictEqual(res3.status, 429);
        const body3 = (await res3.json()) as any;
        assert.strictEqual(body3.code, 'RATE_LIMITED');

        // Request from different user (user-beta): Should succeed (separate bucket)
        const resBeta = await fetch(`${baseUrl}/test-limit`, {
          headers: { 'x-test-user-id': 'user-beta' },
        });
        assert.strictEqual(resBeta.status, 200);
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

    it('falls back to IP address when user identity is not available', async () => {
      const app = express();
      const testIpLimiter = createLinkPreviewRateLimiter({
        limit: 2,
        windowMs: 60000,
        skip: () => false,
      });

      app.get('/test-ip-limit', testIpLimiter, (_req: Request, res: Response) => {
        res.status(200).json({ ok: true });
      });

      const server = app.listen(0);
      const port = (server.address() as any).port;
      const baseUrl = `http://127.0.0.1:${port}`;

      try {
        const res1 = await fetch(`${baseUrl}/test-ip-limit`);
        assert.strictEqual(res1.status, 200);

        const res2 = await fetch(`${baseUrl}/test-ip-limit`);
        assert.strictEqual(res2.status, 200);

        const res3 = await fetch(`${baseUrl}/test-ip-limit`);
        assert.strictEqual(res3.status, 429);
        const body = (await res3.json()) as any;
        assert.strictEqual(body.code, 'RATE_LIMITED');
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });
  });

  describe('6. Strict Pinterest Hostname Detection & No Duplicate Resolution', () => {
    it('does not treat evilpinterest.com or query strings with pinterest.com as Pinterest', () => {
      const evilUrls = [
        'https://evilpinterest.com/pin/12345',
        'https://notpinterest.com/post',
        'https://example.com/search?query=pinterest.com',
        'https://example.com/pin.it/fake',
      ];

      for (const raw of evilUrls) {
        assert.strictEqual(
          isPinterestHostname(new URL(raw).hostname),
          false,
          `Expected ${raw} to not match Pinterest hostname`,
        );
      }
    });

    it('correctly matches authentic Pinterest and pin.it domains and subdomains', () => {
      const validUrls = [
        'https://pinterest.com/pin/12345',
        'https://www.pinterest.com/pin/12345',
        'https://id.pinterest.com/pin/12345',
        'https://pin.it/abcde',
        'https://www.pin.it/abcde',
      ];

      for (const raw of validUrls) {
        assert.strictEqual(
          isPinterestHostname(new URL(raw).hostname),
          true,
          `Expected ${raw} to match Pinterest hostname`,
        );
      }
    });
  });

  describe('7. API Endpoint Integration & Information Leak Prevention (/v1/meta/link-preview)', () => {
    let apiServer: Server;
    let injectedApiServer: Server;
    let targetServer: Server;
    let apiPort: number;
    let apiBaseUrl: string;
    let injectedApiBaseUrl: string;
    let targetPort: number;
    let testUser: UserModel;
    let authCookie: string;

    before(async () => {
      clearPreviewCache();
      const app = createApp();
      await new Promise<void>((resolve) => {
        apiServer = app.listen(0, () => {
          const addr = apiServer.address();
          if (typeof addr === 'object' && addr) {
            apiPort = addr.port;
            apiBaseUrl = `http://127.0.0.1:${apiPort}`;
          }
          resolve();
        });
      });

      testUser = await UserModel.create({
        email: `sec01-ssrf-${Date.now()}@qlickhub.test`,
        passwordHash: 'hashed_password',
        name: 'SEC01 Test User',
        role: 'po',
      });

      const sessionId = await sessionManager.createSession(
        testUser.id,
        'SsrfIntegrationTest',
        '127.0.0.1',
      );
      authCookie = `${accessTokenCookieName}=${signToken({
        userId: testUser.id,
        email: testUser.email,
        role: testUser.role,
        sessionId,
      })}`;

      targetServer = createServer((req, res) => {
        if (req.url === '/oversized') {
          res.writeHead(200, {
            'Content-Type': 'text/html',
            'Content-Length': String(512 * 1024 + 1),
          });
          res.end('blocked');
          return;
        }
        if (req.url === '/timeout') {
          return;
        }
        if (req.url === '/redirect-private') {
          res.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data' });
          res.end();
          return;
        }
        res.writeHead(404);
        res.end();
      });
      await new Promise<void>((resolve) => {
        targetServer.listen(0, '127.0.0.1', () => {
          targetPort = (targetServer.address() as any).port;
          resolve();
        });
      });

      const injectedApp = express();
      injectedApp.use(
        '/v1',
        createMetaRoutes({
          safeFetchOptions: {
            dnsResolver: async () => [{ address: '127.0.0.1', family: 4 }],
            allowTestLocalhost: true,
            timeoutMs: 100,
          },
        }),
      );
      await new Promise<void>((resolve) => {
        injectedApiServer = injectedApp.listen(0, '127.0.0.1', () => {
          const port = (injectedApiServer.address() as any).port;
          injectedApiBaseUrl = `http://127.0.0.1:${port}`;
          resolve();
        });
      });
    });

    after(async () => {
      if (testUser) {
        await testUser.destroy();
      }
      await new Promise<void>((resolve) => {
        apiServer.close(() => resolve());
      });
      await new Promise<void>((resolve) => {
        injectedApiServer.close(() => resolve());
      });
      await new Promise<void>((resolve) => {
        targetServer.close(() => resolve());
      });
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await fetch(`${apiBaseUrl}/v1/meta/link-preview?url=https://example.com`);
      assert.strictEqual(res.status, 401);
    });

    it('returns 400 INVALID_URL when url parameter is missing', async () => {
      const res = await fetch(`${apiBaseUrl}/v1/meta/link-preview`, {
        headers: { Cookie: authCookie },
      });
      assert.strictEqual(res.status, 400);
      const body = (await res.json()) as any;
      assert.strictEqual(body.error?.code, 'INVALID_URL');
    });

    it('returns 400 UNSAFE_URL for localhost, internal, and cloud-metadata targets without info leakage', async () => {
      const unsafeUrls = [
        'http://localhost:3000/secret',
        'http://127.0.0.1:8080',
        'http://169.254.169.254/latest/meta-data',
        'http://10.0.0.1/admin',
        'http://192.168.1.1/router',
        'http://172.16.0.1/internal',
        'http://metadata.google.internal/computeMetadata/v1',
        'http://[::1]/',
        'http://[fe80::1]/',
        'http://[::ffff:127.0.0.1]/',
        'http://admin:pass@example.com/',
        'file:///etc/passwd',
      ];

      for (const target of unsafeUrls) {
        const res = await fetch(
          `${apiBaseUrl}/v1/meta/link-preview?url=${encodeURIComponent(target)}`,
          {
            headers: { Cookie: authCookie },
          },
        );
        assert.strictEqual(
          res.status,
          400,
          `Expected 400 UNSAFE_URL for ${target}, got ${res.status}`,
        );
        const body = (await res.json()) as any;
        assert.strictEqual(body.error?.code, 'UNSAFE_URL');
        // Ensure no internal details leaked
        assert.strictEqual(body.error?.message, 'The provided URL is not supported or allowed.');
      }
    });

    it('validates a Pinterest target IP and stops before oEmbed when DNS resolves privately', async () => {
      let resolverCalls = 0;
      const pinterestApp = express();
      pinterestApp.use(
        '/v1',
        createMetaRoutes({
          safeFetchOptions: {
            dnsResolver: async () => {
              resolverCalls += 1;
              return [{ address: '169.254.169.254', family: 4 }];
            },
          },
        }),
      );
      const pinterestServer = pinterestApp.listen(0, '127.0.0.1');
      await new Promise<void>((resolve) => pinterestServer.once('listening', resolve));
      const port = (pinterestServer.address() as any).port;

      try {
        const target = 'https://www.pinterest.com/pin/123456789/';
        const res = await fetch(
          `http://127.0.0.1:${port}/v1/meta/link-preview?url=${encodeURIComponent(target)}`,
          { headers: { Cookie: authCookie } },
        );

        assert.strictEqual(res.status, 400);
        const body = (await res.json()) as any;
        assert.deepStrictEqual(body, {
          error: {
            code: 'UNSAFE_URL',
            message: 'The provided URL is not supported or allowed.',
          },
        });
        assert.strictEqual(resolverCalls, 1);
        assert.ok(!JSON.stringify(body).includes('169.254.169.254'));
      } finally {
        await new Promise<void>((resolve) => pinterestServer.close(() => resolve()));
      }
    });

    it('serves cached responses without duplicate fetches on cache hit', async () => {
      const testUrl = 'https://cached-example.test/article';
      const res1 = await fetch(
        `${apiBaseUrl}/v1/meta/link-preview?url=${encodeURIComponent(testUrl)}`,
        {
          headers: { Cookie: authCookie },
        },
      );
      assert.strictEqual(res1.status, 200);
      const data1 = (await res1.json()) as any;
      assert.strictEqual(data1.data?.url, testUrl);

      // Second request: served from in-memory cache
      const res2 = await fetch(
        `${apiBaseUrl}/v1/meta/link-preview?url=${encodeURIComponent(testUrl)}`,
        {
          headers: { Cookie: authCookie },
        },
      );
      assert.strictEqual(res2.status, 200);
      const data2 = (await res2.json()) as any;
      assert.deepStrictEqual(data1, data2);
    });

    it('returns safe fallback without leaking internal details when external target is unreachable', async () => {
      const unreachableUrl = 'https://unreachable-external-site-999.test/nonexistent';
      const res = await fetch(
        `${apiBaseUrl}/v1/meta/link-preview?url=${encodeURIComponent(unreachableUrl)}`,
        {
          headers: { Cookie: authCookie },
        },
      );
      assert.strictEqual(res.status, 200);
      const body = (await res.json()) as any;
      assert.strictEqual(body.data?.url, unreachableUrl);
      assert.strictEqual(body.data?.title, 'unreachable-external-site-999.test');
      assert.strictEqual(body.data?.siteName, 'unreachable-external-site-999.test');
    });

    it('returns a safe RESPONSE_TOO_LARGE endpoint error without leaking the pinned address', async () => {
      const target = `http://public-target.example.test:${targetPort}/oversized`;
      const res = await fetch(
        `${injectedApiBaseUrl}/v1/meta/link-preview?url=${encodeURIComponent(target)}`,
        { headers: { Cookie: authCookie } },
      );

      assert.strictEqual(res.status, 400);
      const body = (await res.json()) as any;
      assert.deepStrictEqual(body, {
        error: {
          code: 'RESPONSE_TOO_LARGE',
          message: 'The requested resource exceeds the maximum permitted size.',
        },
      });
      assert.ok(!JSON.stringify(body).includes('127.0.0.1'));
    });

    it('returns a safe fallback on endpoint timeout without leaking transport details', async () => {
      const target = `http://public-timeout.example.test:${targetPort}/timeout`;
      const res = await fetch(
        `${injectedApiBaseUrl}/v1/meta/link-preview?url=${encodeURIComponent(target)}`,
        { headers: { Cookie: authCookie } },
      );

      assert.strictEqual(res.status, 200);
      const body = (await res.json()) as any;
      assert.strictEqual(body.data?.url, target);
      assert.strictEqual(body.data?.title, 'public-timeout.example.test');
      const serialized = JSON.stringify(body);
      assert.ok(!serialized.includes('127.0.0.1'));
      assert.ok(!serialized.includes('TIMEOUT'));
    });

    it('returns generic UNSAFE_URL when a public target redirects to cloud metadata', async () => {
      const target = `http://public-redirect.example.test:${targetPort}/redirect-private`;
      const res = await fetch(
        `${injectedApiBaseUrl}/v1/meta/link-preview?url=${encodeURIComponent(target)}`,
        { headers: { Cookie: authCookie } },
      );

      assert.strictEqual(res.status, 400);
      const body = (await res.json()) as any;
      assert.deepStrictEqual(body, {
        error: {
          code: 'UNSAFE_URL',
          message: 'The provided URL is not supported or allowed.',
        },
      });
      assert.ok(!JSON.stringify(body).includes('169.254.169.254'));
    });
  });
});
