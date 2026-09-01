export const getSequelizePoolConfig = (
  nodeEnv: string,
  isServerless: boolean,
  databasePoolMax?: number,
) => ({
  // Vercel can run several isolated API processes. One retained Transaction
  // Pooler connection per process prevents its small Supabase limit from being
  // exhausted. A local process is not serverless, even when it intentionally
  // runs with production-like settings.
  max: databasePoolMax ?? (nodeEnv === 'production' && isServerless ? 1 : 10),
  min: 0,
  acquire: 30000,
  idle: 10000,
});
