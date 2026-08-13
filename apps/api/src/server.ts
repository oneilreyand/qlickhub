import { createApp } from './app.js';
import { env } from './config/env.js';
import { sequelize } from './db/sequelize.js';

const app = createApp();

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection verified. Run migrations before starting the API.');
  } catch (err) {
    console.error('❌ Database startup failed. Apply migrations and verify DATABASE_URL.', err);
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 API Server running in [${env.NODE_ENV}] mode on http://localhost:${env.PORT}`);
    console.log(`🏥 Health Check available at http://localhost:${env.PORT}/v1/health`);
  });

  server.once('error', (error) => {
    console.error('❌ HTTP server failed to start:', error);
    process.exit(1);
  });

  const handleShutdown = (signal: string) => {
    console.log(`\n⏳ Received ${signal}. Shutting down API server gracefully...`);
    server.close(() => {
      console.log('✅ HTTP server closed. Exiting process.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
};

startServer();
