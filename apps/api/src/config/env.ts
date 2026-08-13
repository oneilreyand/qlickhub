import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .default('4000')
    .transform((val: string) => parseInt(val, 10)),
  DATABASE_URL: z.string().url().optional(),
  TEST_DATABASE_URL: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_ISSUER: z.string().min(1).default('qa-management-api'),
  JWT_AUDIENCE: z.string().min(1).default('qa-management-web'),
  JWT_ACCESS_TTL_MINUTES: z.coerce.number().int().min(5).max(60).default(30),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  DATABASE_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Environment validation failed:', result.error.format());
    throw new Error('Invalid environment variables for API');
  }
  const values = result.data;
  const defaultDevelopmentDatabaseUrl = 'postgres://postgres:postgres@localhost:5432/qa_management_dev';
  const defaultTestDatabaseUrl = 'postgres://postgres:postgres@localhost:5432/qa_management_test';
  const isProduction = values.NODE_ENV === 'production';
  const databaseUrl = values.NODE_ENV === 'test'
    ? values.TEST_DATABASE_URL || defaultTestDatabaseUrl
    : values.DATABASE_URL || defaultDevelopmentDatabaseUrl;
  const jwtAccessSecret = values.JWT_ACCESS_SECRET || 'development-only-jwt-access-secret-change-before-production';

  if (isProduction) {
    if (!values.DATABASE_URL) throw new Error('DATABASE_URL must be configured in production.');
    if (!values.JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET must be configured in production.');
    if (values.CORS_ORIGIN.split(',').some((origin) => origin.trim() === '*')) {
      throw new Error('CORS_ORIGIN must be an explicit allowlist in production.');
    }
    if (!values.DATABASE_SSL) throw new Error('DATABASE_SSL=true is required in production.');
  }

  return {
    ...values,
    DATABASE_URL: databaseUrl,
    JWT_ACCESS_SECRET: jwtAccessSecret,
  };
};

export const env = parseEnv();
