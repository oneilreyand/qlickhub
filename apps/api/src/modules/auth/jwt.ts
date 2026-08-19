import { Request } from 'express';
import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { UserRole } from '@qlick/contracts';

export const accessTokenCookieName = 'qa_access_token';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

export const signToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  const options: SignOptions = {
    algorithm: 'HS256',
    audience: env.JWT_AUDIENCE,
    issuer: env.JWT_ISSUER,
    subject: payload.userId,
    expiresIn: `${env.JWT_ACCESS_TTL_MINUTES}m`,
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
};

export const verifyToken = (token: string): JwtPayload => {
  const options: VerifyOptions = {
    algorithms: ['HS256'],
    audience: env.JWT_AUDIENCE,
    issuer: env.JWT_ISSUER,
  };
  return jwt.verify(token, env.JWT_ACCESS_SECRET, options) as JwtPayload;
};

export const accessTokenFromRequest = (req: Request): string | undefined => {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith('Bearer ')) return authorization.slice('Bearer '.length);

  const cookie = req.headers.cookie;
  if (!cookie) return undefined;
  const tokenPair = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${accessTokenCookieName}=`));
  if (!tokenPair) return undefined;

  return decodeURIComponent(tokenPair.slice(accessTokenCookieName.length + 1));
};
