import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Request } from 'express';
import { accessTokenCookieName, accessTokenFromRequest } from '../jwt.js';

const requestWith = ({
  authorization,
  cookie,
  query = {},
}: {
  authorization?: string;
  cookie?: string;
  query?: Record<string, unknown>;
}): Request =>
  ({
    headers: { authorization, cookie },
    query,
  }) as Request;

describe('access token transport security', () => {
  test('accepts a Bearer access token from the Authorization header', () => {
    const request = requestWith({ authorization: 'Bearer header-token' });

    assert.equal(accessTokenFromRequest(request), 'header-token');
  });

  test('accepts and decodes the HttpOnly access-token cookie', () => {
    const request = requestWith({
      cookie: `theme=dark; ${accessTokenCookieName}=cookie%20token; locale=id`,
    });

    assert.equal(accessTokenFromRequest(request), 'cookie token');
  });

  test('does not accept an access token from a URL query parameter', () => {
    const request = requestWith({ query: { token: 'query-token' } });

    assert.equal(accessTokenFromRequest(request), undefined);
  });
});
