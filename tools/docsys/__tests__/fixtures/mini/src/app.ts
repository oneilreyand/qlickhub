import express from 'express';
import { itemRoutes } from './modules/items/itemRoutes.js';

export const createApp = () => {
  const app = express();
  app.get(['/health', '/v1/health'], (_req, res) => res.json({ ok: true }));
  app.use('/v1/items', itemRoutes);
  return app;
};
