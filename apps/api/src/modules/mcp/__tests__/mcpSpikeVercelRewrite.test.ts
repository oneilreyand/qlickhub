import assert from 'node:assert';
import { describe, test } from 'node:test';
import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { REWRITE_PREFIXES } from '../../../http/vercelHandler.js';

describe('MCP spike S3 — Vercel rewrite prefixes', () => {
  test('MCP OAuth paths are covered alongside /v1', () => {
    assert.deepStrictEqual(
      [...REWRITE_PREFIXES],
      [
        '/v1/',
        '/oauth/',
        '/.well-known/oauth-protected-resource/',
        '/.well-known/oauth-authorization-server/',
      ],
    );
  });

  test('handler strips only the matching `path` capture for /oauth/', async () => {
    process.env.MCP_SPIKE_ENABLED = '';
    const { createVercelHandler } = await import('../../../http/vercelHandler.js');
    const handler = createVercelHandler();
    const req = Object.assign(new EventEmitter(), {
      url: '/oauth/token?path=token&x=1',
      method: 'GET',
      headers: {},
    }) as unknown as IncomingMessage;
    const res = Object.assign(new EventEmitter(), {
      setHeader() {},
      getHeader() {},
      removeHeader() {},
      writeHead() {},
      end() {
        (res as unknown as EventEmitter).emit('finish');
      },
      statusCode: 200,
    }) as unknown as ServerResponse;
    handler(req, res);
    assert.strictEqual(req.url, '/oauth/token?x=1');
  });
});
