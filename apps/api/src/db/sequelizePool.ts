export interface SequelizePoolConfigOptions {
  nodeEnv?: string;
  poolMax?: number;
}

export interface SequelizePoolConfig {
  max: number;
  min: number;
  acquire: number;
  idle: number;
}

export const getSequelizePoolConfig = (
  envOrOptions?: string | SequelizePoolConfigOptions,
  poolMaxOverride?: number,
): SequelizePoolConfig => {
  const nodeEnv =
    typeof envOrOptions === 'string' ? envOrOptions : envOrOptions?.nodeEnv || 'development';

  const explicitMax =
    typeof envOrOptions === 'string' ? poolMaxOverride : (envOrOptions?.poolMax ?? poolMaxOverride);

  // A Vercel deployment can run several isolated API processes. One retained
  // Session Pooler connection per process is enough to exhaust Supabase's
  // small session limit, so Production defaults to a single Transaction Pooler client (max: 1).
  // Development and test defaults to 10 connections for local concurrency.
  const defaultMax = nodeEnv === 'production' ? 1 : 10;
  const max =
    typeof explicitMax === 'number' && Number.isFinite(explicitMax) && explicitMax > 0
      ? explicitMax
      : defaultMax;

  return {
    max,
    min: 0,
    acquire: 30000,
    idle: 10000,
  };
};
