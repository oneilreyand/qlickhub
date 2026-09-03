import type { Express } from 'express';

/**
 * Vercel overwrites X-Forwarded-For before invoking the function. Trusting
 * exactly its single proxy hop gives Express the platform-provided client IP
 * without enabling the spoofable `trust proxy = true` configuration.
 */
export function configureProxyTrust(app: Express, isVercel: boolean): void {
  if (isVercel) app.set('trust proxy', 1);
}
