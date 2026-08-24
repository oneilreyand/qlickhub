const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const developmentConnectionUrl = new URL(
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/qa_management_dev',
);
const testConnectionUrl = new URL(
  process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/qa_management_test',
);

const toDatabaseConfig = (connectionUrl) => ({
  username: decodeURIComponent(connectionUrl.username),
  password: decodeURIComponent(connectionUrl.password),
  database: connectionUrl.pathname.replace(/^\//, ''),
  host: connectionUrl.hostname,
  port: Number(connectionUrl.port || 5432),
  dialect: 'postgres',
  logging: false,
});

module.exports = {
  development: toDatabaseConfig(developmentConnectionUrl),
  test: toDatabaseConfig(testConnectionUrl),
  production: {
    use_env_variable: 'DATABASE_URL',
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
