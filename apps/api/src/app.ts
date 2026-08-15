import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { checkDatabaseConnection } from './db/sequelize.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { workspaceRoutes } from './modules/workspaces/workspaceRoutes.js';
import { folderRoutes } from './modules/folders/folderRoutes.js';
import { taskRoutes } from './modules/tasks/taskRoutes.js';
import { attachmentRoutes } from './modules/attachments/attachmentRoutes.js';
import { requirementRoutes } from './modules/requirements/requirementRoutes.js';
import { qaDocumentRoutes } from './modules/qaDocuments/qaDocumentRoutes.js';
import { traceabilityRoutes } from './modules/traceability/traceabilityRoutes.js';
import { corsOptions, enforceTrustedOrigin } from './http/middleware/origin.js';
import { apiRateLimiter } from './http/middleware/rateLimit.js';

export const createApp = () => {
  const app = express();

  // Security & Middleware
  app.use(helmet({ referrerPolicy: { policy: 'no-referrer' } }));
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '100kb' }));
  app.use(enforceTrustedOrigin);

  // Health Check Endpoint (Includes PostgreSQL DB Check)
  app.get(['/health', '/v1/health'], async (_req: Request, res: Response) => {
    const dbHealth = await checkDatabaseConnection();
    const statusCode = dbHealth.connected ? 200 : 503;

    res.status(statusCode).json({
      status: dbHealth.connected ? 'ok' : 'degraded',
      service: 'authentication-api',
      timestamp: new Date().toISOString(),
      database: {
        status: dbHealth.connected ? 'connected' : 'disconnected',
        ...(env.NODE_ENV !== 'production' && dbHealth.message && { error: dbHealth.message }),
      },
    });
  });

  // API Root Welcome Endpoint
  app.get('/v1', (_req: Request, res: Response) => {
    res.status(200).json({
      name: 'Authentication API',
      version: 'v1.0',
      docs: '/v1/health',
    });
  });

  // Authentication, Workspace, Folder & Task APIs
  app.use('/v1', apiRateLimiter);
  app.use('/v1/auth', authRouter);
  app.use('/v1/workspaces', workspaceRoutes);
  app.use('/v1/workspaces/:workspaceId/folders', folderRoutes);
  app.use('/v1/projects/:projectId/folders', folderRoutes);
  app.use('/v1/workspaces/:workspaceId/tasks', taskRoutes);
  app.use('/v1', attachmentRoutes);
  app.use('/v1', requirementRoutes);
  app.use('/v1', qaDocumentRoutes);
  app.use('/v1', traceabilityRoutes);

  // 404 Route Handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      type: 'https://api.qa-hub.com/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: 'The requested API route does not exist',
      code: 'NOT_FOUND',
    });
  });

  // Global Error Handler Middleware
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('❌ Unhandled Server Error:', err);
    res.status(500).json({
      type: 'https://api.qa-hub.com/errors/internal-error',
      title: 'Internal Server Error',
      status: 500,
      detail: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      code: 'INTERNAL_SERVER_ERROR',
    });
  });

  return app;
};
