const path = require('path');
const dotenv = require('dotenv');

const rootEnvPath = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: rootEnvPath });

const developmentConnectionUrl = new URL(
  process.env.LOCAL_DATABASE_URL ||
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/qa_management_dev',
);
const testConnectionUrl = new URL(
  process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/qa_management_test',
);

const toDatabaseConfig = (connectionUrl, useSsl = false) => ({
  username: decodeURIComponent(connectionUrl.username),
  password: decodeURIComponent(connectionUrl.password),
  database: connectionUrl.pathname.replace(/^\//, ''),
  host: connectionUrl.hostname,
  port: Number(connectionUrl.port || 5432),
  dialect: 'postgres',
  dialectOptions: useSsl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : undefined,
  logging: false,
});

module.exports = {
  development: toDatabaseConfig(developmentConnectionUrl, process.env.DATABASE_SSL === 'true'),
  test: toDatabaseConfig(testConnectionUrl),
  production: {
    use_env_variable: process.env.MIGRATION_DATABASE_URL
      ? 'MIGRATION_DATABASE_URL'
      : process.env.PRODUCTION_DATABASE_URL
        ? 'PRODUCTION_DATABASE_URL'
        : 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    logging: false,
  },
};
