import { Sequelize } from 'sequelize';
import pg from 'pg';
import { env } from '../config/env.js';
import { getSequelizePoolConfig } from './sequelizePool.js';

export const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: 'postgres',
  // Keep the PostgreSQL driver as a static dependency so serverless bundlers
  // include it instead of relying on Sequelize's runtime require().
  dialectModule: pg,
  dialectOptions: env.DATABASE_SSL
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : undefined,
  logging:
    env.NODE_ENV === 'development' ? (msg: string) => console.log(`[Sequelize] ${msg}`) : false,
  pool: getSequelizePoolConfig({
    nodeEnv: env.NODE_ENV,
    poolMax: env.DATABASE_POOL_MAX,
  }),
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
});

export const checkDatabaseConnection = async (): Promise<{
  connected: boolean;
  message?: string;
}> => {
  try {
    await sequelize.authenticate();
    return { connected: true };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Unknown database error';
    console.error('❌ Database connection failed:', errMessage);
    return { connected: false, message: errMessage };
  }
};
