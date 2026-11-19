import { generateKeyPairSync, randomBytes } from 'node:crypto';
import express, { Router, type Request, type Response, type NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import Provider, { errors as oidcErrors } from 'oidc-provider';
import {
  OAuthError,
  OAuthErrorCode,
  type AuthInfo,
  type OAuthTokenVerifier,
} from '@modelcontextprotocol/server';
import { UserModel } from '../../db/models/user.js';
import { accessTokenFromRequest, verifyToken } from '../auth/jwt.js';
import { sessionManager } from '../auth/sessionManager.js';
import { loginRateLimiter } from '../../http/middleware/rateLimit.js';
import { consentPage, continueAsPage, loginPage } from './mcpInteractionViews.js';
import { McpOidcPostgresAdapter } from './mcpOidcPostgresAdapter.js';

/**
 * SPIKE S2 (spike/mcp-oauth, never merged): OAuth 2.1 authorization server for MCP clients,
 * built on oidc-provider, using Qlick Hub's own users. Storage is the in-memory adapter, so this
 * only works in a single local process; S3 needs shared storage (Owner decision pending).
 *
 * Session rule: the browser login is reused when present, and a password login here never calls
 * sessionManager.createSession, because a new session would retire an existing browser session.
 */
export interface McpAuthServerOptions {
  issuer: URL;
  resource: URL;
  /** ≥32 chars; signs provider cookies. Generated when absent (local only). */
  cookieSecret?: string;
  /** Private EC P-256 JWK (JSON). Generated per process when absent (local only). */
  signingJwk?: string;
  /** 'postgres' shares state across instances (S3, Preview); default is the in-memory adapter. */
  store?: 'memory' | 'postgres';
  accessTokenTtlSeconds?: number;
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

function withoutLoopbackPort(value: string): string | undefined {
  const url = URL.parse(value);
  if (!url || url.protocol !== 'http:' || !LOOPBACK_HOSTS.has(url.hostname)) return undefined;
  url.port = '';
  return url.href;
}

async function browserSessionUser(req: Request): Promise<UserModel | null> {
  const token = accessTokenFromRequest(req);
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    if (!payload.sessionId) return null;
    const check = await sessionManager.isSessionActive(payload.userId, payload.sessionId);
    if (!check.active) return null;
    const user = await UserModel.findByPk(payload.userId);
    return user && user.role === payload.role ? user : null;
  } catch {
    return null;
  }
}

export function createMcpAuthServer(options: McpAuthServerOptions) {
  const resource = options.resource.href;
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const signingJwk = {
    ...privateKey.export({ format: 'jwk' }),
    use: 'sig',
    alg: 'ES256',
    kid: 'spike-es256',
  };

  const provider = new Provider(options.issuer.href, {
    ...(options.store === 'postgres' ? { adapter: McpOidcPostgresAdapter } : {}),
    clients: [],
    cookies: { keys: [options.cookieSecret ?? randomBytes(32).toString('hex')] },
    jwks: { keys: [signingJwk] },
    findAccount: async (_ctx: unknown, id: string) => {
      const user = await UserModel.findByPk(id);
      return user ? { accountId: id, claims: async () => ({ sub: id }) } : undefined;
    },
    interactions: {
      url: (_ctx: unknown, interaction: { uid: string }) => `/oauth/interaction/${interaction.uid}`,
    },
    scopes: ['openid', 'offline_access', 'mcp'],
    responseTypes: ['code'],
    clientDefaults: {
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      id_token_signed_response_alg: 'ES256',
    },
    pkce: { required: () => true },
    rotateRefreshToken: true,
    issueRefreshToken: async (_ctx: unknown, client: { grantTypeAllowed(t: string): boolean }) =>
      client.grantTypeAllowed('refresh_token'),
    ttl: {
      AccessToken: options.accessTokenTtlSeconds ?? 3600,
      AuthorizationCode: 60,
      Interaction: 600,
      Session: 600,
      Grant: 30 * 24 * 3600,
      RefreshToken: 30 * 24 * 3600,
    },
    features: {
      devInteractions: { enabled: false },
      registration: { enabled: true },
      revocation: { enabled: true },
      clientIdMetadataDocument: { enabled: true, ack: 'draft-03' },
      resourceIndicators: {
        enabled: true,
        defaultResource: async () => resource,
        useGrantedResource: async () => true,
        getResourceServerInfo: async (_ctx: unknown, indicator: string) => {
          if (indicator !== resource) throw new oidcErrors.InvalidTarget();
          return {
            scope: 'mcp',
            audience: resource,
            accessTokenTTL: options.accessTokenTtlSeconds ?? 3600,
            accessTokenFormat: 'opaque',
          };
        },
      },
    },
  });
  provider.proxy = true;

  // RFC 8252 §7.3: loopback redirects must match regardless of port. oidc-provider only relaxes
  // the port for application_type=native, but CIMD clients (Codex, OpenCode, Claude Code) do not
  // always declare it.
  const clientProto = provider.Client.prototype as {
    redirectUriAllowed(value: string): boolean;
    redirectUris: string[];
  };
  const originalRedirectAllowed = clientProto.redirectUriAllowed;
  clientProto.redirectUriAllowed = function redirectUriAllowed(
    this: typeof clientProto,
    value: string,
  ) {
    if (originalRedirectAllowed.call(this, value)) return true;
    const candidate = withoutLoopbackPort(value);
    return (
      candidate !== undefined &&
      this.redirectUris.some((allowed) => withoutLoopbackPort(allowed) === candidate)
    );
  };

  async function clientName(clientId: string): Promise<string> {
    const client = await provider.Client.find(clientId).catch(() => undefined);
    return client?.clientName || clientId;
  }

  const router = Router();
  // helmet's default CSP has form-action 'self'; Chrome also applies form-action to the redirect
  // chain after a POST, which would block the hop back to the client's redirect_uri.
  router.use('/oauth/interaction', (_req, res, next) => {
    res.set(
      'content-security-policy',
      "default-src 'none'; style-src 'unsafe-inline'; form-action 'self' https: http://127.0.0.1:* http://localhost:*; frame-ancestors 'none'; base-uri 'none'",
    );
    next();
  });
  const form = express.urlencoded({ extended: false, limit: '10kb' });
  const wrap =
    (fn: (req: Request, res: Response) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) =>
      fn(req, res).catch(next);

  router.get(
    '/oauth/interaction/:uid',
    wrap(async (req, res) => {
      const details = await provider.interactionDetails(req, res);
      const name = await clientName(details.params.client_id);
      res.set('cache-control', 'no-store');
      if (details.prompt.name === 'login') {
        const user = await browserSessionUser(req);
        res.send(
          user ? continueAsPage(details.uid, name, user.name) : loginPage(details.uid, name),
        );
        return;
      }
      const user = await UserModel.findByPk(details.session?.accountId);
      res.send(consentPage(details.uid, name, user?.name ?? 'akun ini'));
    }),
  );

  router.post(
    '/oauth/interaction/:uid/continue',
    form,
    wrap(async (req, res) => {
      const user = await browserSessionUser(req);
      if (!user) {
        res.redirect(303, `/oauth/interaction/${req.params.uid}`);
        return;
      }
      await provider.interactionFinished(
        req,
        res,
        { login: { accountId: user.id } },
        { mergeWithLastSubmission: false },
      );
    }),
  );

  router.post(
    '/oauth/interaction/:uid/login',
    loginRateLimiter,
    form,
    wrap(async (req, res) => {
      const details = await provider.interactionDetails(req, res);
      const email = String(req.body?.email ?? '').trim();
      const password = String(req.body?.password ?? '');
      const user = email
        ? await UserModel.findOne({ where: { email: { [Op.iLike]: email } }, paranoid: false })
        : null;
      const ok = Boolean(
        user &&
        !user.deletedAt &&
        user.passwordHash &&
        (await bcrypt.compare(password, user.passwordHash)),
      );
      if (!ok || !user) {
        res
          .status(401)
          .send(
            loginPage(
              details.uid,
              await clientName(details.params.client_id),
              'Email atau password salah.',
            ),
          );
        return;
      }
      // Deliberately no sessionManager.createSession here (see module comment).
      await provider.interactionFinished(
        req,
        res,
        { login: { accountId: user.id } },
        { mergeWithLastSubmission: false },
      );
    }),
  );

  router.post(
    '/oauth/interaction/:uid/confirm',
    form,
    wrap(async (req, res) => {
      const details = await provider.interactionDetails(req, res);
      const { prompt, params, session } = details;
      if (prompt.name !== 'consent' || !session?.accountId) {
        res.status(400).send('Interaction is not waiting for consent.');
        return;
      }
      const grant = details.grantId
        ? await provider.Grant.find(details.grantId)
        : new provider.Grant({ accountId: session.accountId, clientId: params.client_id });
      const missingOIDCScope: string[] | undefined = prompt.details.missingOIDCScope;
      if (missingOIDCScope?.length) grant.addOIDCScope(missingOIDCScope.join(' '));
      const missingResourceScopes: Record<string, string[]> | undefined =
        prompt.details.missingResourceScopes;
      for (const [indicator, scopes] of Object.entries(missingResourceScopes ?? {})) {
        grant.addResourceScope(indicator, scopes.join(' '));
      }
      const grantId = await grant.save();
      await provider.interactionFinished(
        req,
        res,
        { consent: { grantId } },
        { mergeWithLastSubmission: true },
      );
    }),
  );

  router.post(
    '/oauth/interaction/:uid/abort',
    form,
    wrap(async (req, res) => {
      await provider.interactionFinished(
        req,
        res,
        { error: 'access_denied', error_description: 'User denied access.' },
        { mergeWithLastSubmission: false },
      );
    }),
  );

  // RFC 8414 path-inserted discovery for an issuer with a path (/oauth); MCP clients probe this
  // before falling back to OpenID discovery under the issuer.
  router.get('/.well-known/oauth-authorization-server/oauth', (req, res) => {
    req.url = '/.well-known/openid-configuration';
    req.originalUrl = '/oauth/.well-known/openid-configuration';
    provider.callback()(req, res);
  });

  router.use('/oauth', provider.callback());

  const verifier: OAuthTokenVerifier = {
    async verifyAccessToken(token: string): Promise<AuthInfo> {
      const accessToken = await provider.AccessToken.find(token);
      if (!accessToken || !accessToken.accountId) {
        throw new OAuthError(OAuthErrorCode.InvalidToken, 'Invalid or expired access token.');
      }
      const user = await UserModel.findByPk(accessToken.accountId);
      if (!user) throw new OAuthError(OAuthErrorCode.InvalidToken, 'Account is no longer active.');
      return {
        token,
        clientId: accessToken.clientId,
        scopes: String(accessToken.scope ?? '')
          .split(' ')
          .filter(Boolean),
        expiresAt: accessToken.exp,
        resource: new URL(Array.isArray(accessToken.aud) ? accessToken.aud[0] : accessToken.aud),
        extra: { userId: accessToken.accountId },
      };
    },
  };

  return { provider, router, verifier };
}
