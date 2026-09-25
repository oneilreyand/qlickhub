import { timingSafeEqual } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { QueryTypes, type Transaction } from 'sequelize';
import { env } from '../../config/env.js';
import { sequelize } from '../../db/sequelize.js';

type TableRow = { table_name: string };
type CountRow = { migration_count: string };

const route = Router();
const migrationTable = 'SequelizeMeta';

const quoteIdentifier = (identifier: string) => `"${identifier.replaceAll('"', '""')}"`;

const hasValidToken = (request: Request) => {
  const expected = env.PRODUCTION_DATA_RESET_TOKEN;
  const supplied = request.header('x-production-data-reset-token');

  if (!expected || !supplied || expected.length !== supplied.length) return false;

  return timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
};

const authorize = (request: Request, response: Response) => {
  if (env.NODE_ENV === 'production' && hasValidToken(request)) return true;

  response.status(404).json({ code: 'NOT_FOUND' });
  return false;
};

const getTargetTables = async (transaction?: Transaction) =>
  sequelize.query<TableRow>(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name <> :migrationTable
      ORDER BY table_name`,
    {
      replacements: { migrationTable },
      type: QueryTypes.SELECT,
      transaction,
    },
  );

const getMigrationCount = async (transaction?: Transaction) => {
  const rows = await sequelize.query<CountRow>(
    `SELECT count(*)::text AS migration_count FROM public.${quoteIdentifier(migrationTable)}`,
    { type: QueryTypes.SELECT, transaction },
  );
  return Number(rows[0]?.migration_count ?? 0);
};

route.get('/maintenance/production-data-reset/audit', async (request, response, next) => {
  try {
    if (!authorize(request, response)) return;

    const [tables, migrationRecords] = await Promise.all([getTargetTables(), getMigrationCount()]);
    response.status(200).json({
      targetTableCount: tables.length,
      targetTables: tables.map(({ table_name }) => table_name),
      migrationRecords,
      preserves: ['schema', migrationTable],
    });
  } catch (error) {
    next(error);
  }
});

route.post('/maintenance/production-data-reset', async (request, response, next) => {
  try {
    if (!authorize(request, response)) return;

    const result = await sequelize.transaction(async (transaction) => {
      await sequelize.query('SELECT pg_advisory_xact_lock(:lockKey)', {
        replacements: { lockKey: 2026092501 },
        type: QueryTypes.SELECT,
        transaction,
      });

      const tables = await getTargetTables(transaction);
      if (tables.length === 0) throw new Error('No application tables were found for reset.');

      const qualifiedTables = tables
        .map(({ table_name }) => `public.${quoteIdentifier(table_name)}`)
        .join(', ');

      await sequelize.query(`TRUNCATE TABLE ${qualifiedTables} RESTART IDENTITY CASCADE`, {
        transaction,
      });

      return {
        targetTableCount: tables.length,
        targetTables: tables.map(({ table_name }) => table_name),
        migrationRecords: await getMigrationCount(transaction),
      };
    });

    response.status(200).json({ ...result, reset: 'complete' });
  } catch (error) {
    next(error);
  }
});

export { route as productionDataResetRoutes };
