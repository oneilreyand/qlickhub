import { NextFunction, Request, Response } from 'express';
import { CorsOptions } from 'cors';
import { env } from '../../config/env.js';

const allowedOrigins = new Set(env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean));

const isAllowedOrigin = (origin: string): boolean => allowedOrigins.has(origin);

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
};

const stateChangingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const enforceTrustedOrigin = (req: Request, res: Response, next: NextFunction) => {
  if (!stateChangingMethods.has(req.method)) return next();

  const origin = req.get('origin');
  if (!origin && env.NODE_ENV !== 'production') return next();
  if (origin && isAllowedOrigin(origin)) return next();

  return res.status(403).json({
    error: {
      code: 'UNTRUSTED_ORIGIN',
      message: 'State-changing requests must come from an allowed origin.',
    },
  });
};
