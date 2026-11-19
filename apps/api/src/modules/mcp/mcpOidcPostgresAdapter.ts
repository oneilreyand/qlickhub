import { QueryTypes } from 'sequelize';
import { sequelize } from '../../db/sequelize.js';

/**
 * SPIKE S3: oidc-provider adapter over `mcp_spike_oidc_store` (migration
 * 20261119190000-spike-mcp-oidc-store). One instance per model name, as oidc-provider expects.
 * Expired rows are ignored on read; there is no sweeper in the spike.
 */
type Payload = Record<string, unknown> & {
  grantId?: string;
  uid?: string;
  userCode?: string;
  consumed?: unknown;
};

export class McpOidcPostgresAdapter {
  constructor(private readonly model: string) {}

  async upsert(id: string, payload: Payload, expiresIn?: number): Promise<void> {
    await sequelize.query(
      `INSERT INTO mcp_spike_oidc_store (model, id, payload, grant_id, uid, user_code, expires_at)
       VALUES (:model, :id, CAST(:payload AS JSONB), :grantId, :uid, :userCode,
               CASE WHEN CAST(:expiresIn AS INTEGER) IS NULL THEN NULL
                    ELSE now() + make_interval(secs => CAST(:expiresIn AS INTEGER)) END)
       ON CONFLICT (model, id) DO UPDATE SET payload = EXCLUDED.payload, grant_id = EXCLUDED.grant_id,
         uid = EXCLUDED.uid, user_code = EXCLUDED.user_code, expires_at = EXCLUDED.expires_at`,
      {
        replacements: {
          model: this.model,
          id,
          payload: JSON.stringify(payload),
          grantId: payload.grantId ?? null,
          uid: payload.uid ?? null,
          userCode: payload.userCode ?? null,
          expiresIn: expiresIn ?? null,
        },
      },
    );
  }

  private async findWhere(
    column: 'id' | 'uid' | 'user_code',
    value: string,
  ): Promise<Payload | undefined> {
    const rows = await sequelize.query<{ payload: Payload; consumed_at: Date | null }>(
      `SELECT payload, consumed_at FROM mcp_spike_oidc_store
        WHERE model = :model AND ${column} = :value AND (expires_at IS NULL OR expires_at > now())
        LIMIT 1`,
      { type: QueryTypes.SELECT, replacements: { model: this.model, value } },
    );
    const row = rows[0];
    if (!row) return undefined;
    return row.consumed_at
      ? { ...row.payload, consumed: Math.floor(row.consumed_at.getTime() / 1000) }
      : row.payload;
  }

  find(id: string) {
    return this.findWhere('id', id);
  }

  findByUid(uid: string) {
    return this.findWhere('uid', uid);
  }

  findByUserCode(userCode: string) {
    return this.findWhere('user_code', userCode);
  }

  async consume(id: string): Promise<void> {
    await sequelize.query(
      `UPDATE mcp_spike_oidc_store SET consumed_at = now() WHERE model = :model AND id = :id`,
      { replacements: { model: this.model, id } },
    );
  }

  async destroy(id: string): Promise<void> {
    await sequelize.query(`DELETE FROM mcp_spike_oidc_store WHERE model = :model AND id = :id`, {
      replacements: { model: this.model, id },
    });
  }

  async revokeByGrantId(grantId: string): Promise<void> {
    await sequelize.query(`DELETE FROM mcp_spike_oidc_store WHERE grant_id = :grantId`, {
      replacements: { grantId },
    });
  }
}
