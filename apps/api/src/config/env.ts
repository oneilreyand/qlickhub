import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'node:path';

const initialWorkingDirectory = process.env.INIT_CWD || process.cwd();
const runsFromApiPackage =
  path.basename(initialWorkingDirectory) === 'api' &&
  path.basename(path.dirname(initialWorkingDirectory)) === 'apps';
const rootEnvPath = runsFromApiPackage
  ? path.resolve(initialWorkingDirectory, '../..', '.env')
  : path.resolve(initialWorkingDirectory, '.env');

if (!process.env.VERCEL) {
  dotenv.config({ path: rootEnvPath });
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .default('4000')
    .transform((val: string) => parseInt(val, 10)),
  DATABASE_URL: z.string().url().optional(),
  LOCAL_DATABASE_URL: z.string().url().optional(),
  MIGRATION_DATABASE_URL: z.string().url().optional(),
  TEST_DATABASE_URL: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_ISSUER: z.string().min(1).default('qa-management-api'),
  JWT_AUDIENCE: z.string().min(1).default('qa-management-web'),
  JWT_ACCESS_TTL_MINUTES: z.coerce.number().int().min(5).max(1440).default(480),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  VERCEL_URL: z.string().min(1).optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().min(1).optional(),
  VERCEL: z.string().min(1).optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(10).optional(),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  SMTP_HOST: z.string().min(1).default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(465),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  SMTP_FROM: z.string().min(1).optional(),
  DATABASE_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  ATTACHMENT_STORAGE_PROVIDER: z.enum(['local', 'google_drive']).optional(),
  GOOGLE_DRIVE_ROOT_FOLDER_ID: z.string().min(1).optional(),
  GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON: z.string().min(1).optional(),
  FIREBASE_PROJECT_ID: z.string().min(1).default('ndeks-fcm'),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().min(1).optional(),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().min(1).optional(),
});

export const normalizeEnvironmentInput = (input: NodeJS.ProcessEnv): NodeJS.ProcessEnv => {
  const attachmentStorageProvider = input.ATTACHMENT_STORAGE_PROVIDER;

  if (!attachmentStorageProvider) return input;

  return {
    ...input,
    ATTACHMENT_STORAGE_PROVIDER: attachmentStorageProvider.trim(),
  };
};

export const parseEnvironment = (input: NodeJS.ProcessEnv = process.env) => {
  const result = envSchema.safeParse(normalizeEnvironmentInput(input));
  if (!result.success) {
    console.error('❌ Environment validation failed:', result.error.format());
    throw new Error('Invalid environment variables for API');
  }
  const values = result.data;
  const defaultDevelopmentDatabaseUrl =
    'postgres://postgres:postgres@localhost:5432/qa_management_dev';
  const defaultTestDatabaseUrl = 'postgres://postgres:postgres@localhost:5432/qa_management_test';
  const isProduction = values.NODE_ENV === 'production';
  const attachmentStorageProvider =
    values.ATTACHMENT_STORAGE_PROVIDER || (isProduction ? 'google_drive' : 'local');
  const databaseUrl =
    values.NODE_ENV === 'test'
      ? values.TEST_DATABASE_URL || defaultTestDatabaseUrl
      : values.NODE_ENV === 'development'
        ? values.LOCAL_DATABASE_URL || values.DATABASE_URL || defaultDevelopmentDatabaseUrl
        : values.DATABASE_URL || defaultDevelopmentDatabaseUrl;
  const jwtAccessSecret =
    values.JWT_ACCESS_SECRET || 'development-only-jwt-access-secret-change-before-production';

  if (isProduction) {
    if (!values.DATABASE_URL) throw new Error('DATABASE_URL must be configured in production.');
    if (!values.JWT_ACCESS_SECRET)
      throw new Error('JWT_ACCESS_SECRET must be configured in production.');
    if (values.CORS_ORIGIN.split(',').some((origin) => origin.trim() === '*')) {
      throw new Error('CORS_ORIGIN must be an explicit allowlist in production.');
    }
    if (!values.DATABASE_SSL) throw new Error('DATABASE_SSL=true is required in production.');
    if (!values.SMTP_USER || !values.SMTP_PASS) {
      throw new Error('SMTP_USER and SMTP_PASS must be configured in production.');
    }
    if (attachmentStorageProvider === 'google_drive' && !values.GOOGLE_DRIVE_ROOT_FOLDER_ID) {
      throw new Error(
        'GOOGLE_DRIVE_ROOT_FOLDER_ID must be configured when using Google Drive storage.',
      );
    }
  }

  const databaseSsl = values.NODE_ENV === 'test' ? false : values.DATABASE_SSL;

  return {
    ...values,
    DATABASE_URL: databaseUrl,
    DATABASE_SSL: databaseSsl,
    JWT_ACCESS_SECRET: jwtAccessSecret,
    ATTACHMENT_STORAGE_PROVIDER: attachmentStorageProvider,
  };
};

export const env = parseEnvironment();
