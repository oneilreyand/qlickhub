import { Sequelize } from 'sequelize';
import { env } from '../config/env.js';

export const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: 'postgres',
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
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
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
