import { QueryTypes } from 'sequelize';
import { sequelize } from './sequelize.js';

/**
 * ADR-039: the latest applied canonical migration, exposed on the public health check so CI can
 * detect migrations that `main` would deploy before Production has them. Only the migration file
 * name and count are returned; no data, connection details, or schema contents.
 */
export interface AppliedMigrationStatus {
  latest: string | null;
  applied: number;
}

export async function getAppliedMigrationStatus(): Promise<AppliedMigrationStatus | null> {
  try {
    const [row] = await sequelize.query<{ latest: string | null; applied: string | number }>(
      'SELECT MAX(name) AS latest, COUNT(*) AS applied FROM "SequelizeMeta"',
      { type: QueryTypes.SELECT },
    );
    return { latest: row?.latest ?? null, applied: Number(row?.applied ?? 0) };
  } catch {
    // The table may not exist yet (fresh database) or the query failed; health stays truthful
    // about the connection and simply omits migration status.
    return null;
  }
}
