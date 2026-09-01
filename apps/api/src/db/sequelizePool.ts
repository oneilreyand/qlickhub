export const getSequelizePoolConfig = (nodeEnv: string) => ({
  // A Vercel deployment can run several isolated API processes. One retained
  // Session Pooler connection per process is enough to exhaust Supabase's
  // small session limit, so Production uses a single Transaction Pooler client.
  max: nodeEnv === 'production' ? 1 : 10,
  min: 0,
  acquire: 30000,
  idle: 10000,
});
