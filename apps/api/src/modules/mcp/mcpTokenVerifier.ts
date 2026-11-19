import { timingSafeEqual } from 'node:crypto';
import {
  OAuthError,
  OAuthErrorCode,
  type AuthInfo,
  type OAuthTokenVerifier,
} from '@modelcontextprotocol/server';
import type { McpSpikeConfig } from './mcpSpikeConfig.js';

/** Identity carried in AuthInfo.extra for every verified MCP request. */
export interface McpPrincipal {
  userId: string;
}

export function principalOf(authInfo: AuthInfo | undefined): McpPrincipal {
  const userId = authInfo?.extra?.userId;
  if (typeof userId !== 'string' || !userId) {
    throw new OAuthError(OAuthErrorCode.InvalidToken, 'Token has no Qlick Hub user.');
  }
  return { userId };
}

function sameSecret(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * S1 verifier: accepts exactly one static development token (≥32 chars) bound to one user.
 * Expiry is a rolling one hour because the SDK refuses tokens without `expiresAt`.
 */
export function createDevTokenVerifier(config: McpSpikeConfig): OAuthTokenVerifier {
  return {
    async verifyAccessToken(token: string): Promise<AuthInfo> {
      if (!config.devToken || !config.devUserId || !sameSecret(token, config.devToken)) {
        throw new OAuthError(OAuthErrorCode.InvalidToken, 'Invalid or expired access token.');
      }
      return {
        token,
        clientId: 'spike-dev',
        scopes: ['mcp'],
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        resource: config.resourceUrl,
        extra: { userId: config.devUserId },
      };
    },
  };
}
