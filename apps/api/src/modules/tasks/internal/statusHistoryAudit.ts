import { QueryTypes, Transaction, type Sequelize } from 'sequelize';

/**
 * WORK-FOUNDATION P1 (AC-1.1): read-only quality report of Subtask status history.
 *
 * "Started" means the first transition to `in_progress` recorded in `task_activity`
 * (`metadata_json.changes.status.new`). Nothing is written or backfilled (DATA-005); the report only
 * counts how much history is missing so later baselines can exclude incomplete Subtasks.
 */
export interface StatusHistoryAuditWorkspace {
  workspaceId: string;
  workspaceName: string;
  subtasks: number;
  done: number;
  doneWithoutCompletedAt: number;
  doneWithoutStartEvent: number;
  activeWithoutStartEvent: number;
  statusEvents: number;
  firstStatusEventAt: string | null;
}

export interface StatusHistoryAuditReport {
  generatedAt: string;
  workspaces: StatusHistoryAuditWorkspace[];
  totals: Omit<StatusHistoryAuditWorkspace, 'workspaceId' | 'workspaceName' | 'firstStatusEventAt'>;
}

interface Row {
  workspace_id: string;
  workspace_name: string;
  subtasks: number;
  done: number;
  done_without_completed_at: number;
  done_without_start_event: number;
  active_without_start_event: number;
  status_events: number;
  first_status_event_at: Date | null;
}

const AUDIT_SQL = `
WITH subtasks AS (
  SELECT t.id, t.workspace_id, t.status, t.completed_at
  FROM tasks t
  WHERE t.parent_task_id IS NOT NULL
    AND t.deleted_at IS NULL
    AND (CAST(:filterByWorkspace AS boolean) = false OR t.workspace_id IN (:workspaceIds))
),
status_events AS (
  SELECT a.task_id, a.created_at, a.metadata_json -> 'changes' -> 'status' ->> 'new' AS new_status
  FROM task_activity a
  INNER JOIN subtasks s ON s.id = a.task_id
  WHERE a.metadata_json -> 'changes' ? 'status'
),
started AS (
  SELECT DISTINCT task_id FROM status_events WHERE new_status = 'in_progress'
),
event_stats AS (
  SELECT s.workspace_id, COUNT(e.task_id)::int AS status_events, MIN(e.created_at) AS first_status_event_at
  FROM status_events e
  INNER JOIN subtasks s ON s.id = e.task_id
  GROUP BY s.workspace_id
)
SELECT
  s.workspace_id,
  w.name AS workspace_name,
  COUNT(*)::int AS subtasks,
  COUNT(*) FILTER (WHERE s.status = 'done')::int AS done,
  COUNT(*) FILTER (WHERE s.status = 'done' AND s.completed_at IS NULL)::int AS done_without_completed_at,
  COUNT(*) FILTER (WHERE s.status = 'done' AND st.task_id IS NULL)::int AS done_without_start_event,
  COUNT(*) FILTER (
    WHERE s.status IN ('in_progress', 'in_review', 'changes_requested') AND st.task_id IS NULL
  )::int AS active_without_start_event,
  COALESCE(MAX(es.status_events), 0)::int AS status_events,
  MAX(es.first_status_event_at) AS first_status_event_at
FROM subtasks s
INNER JOIN workspaces w ON w.id = s.workspace_id
LEFT JOIN started st ON st.task_id = s.id
LEFT JOIN event_stats es ON es.workspace_id = s.workspace_id
GROUP BY s.workspace_id, w.name
ORDER BY w.name, s.workspace_id
`;

export async function auditStatusHistory(
  db: Sequelize,
  options: { workspaceIds?: string[] } = {},
): Promise<StatusHistoryAuditReport> {
  const workspaceIds = options.workspaceIds ?? [];
  const rows = await db.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ },
    async (transaction) => {
      // Guarantees the audit cannot change data even if the SQL above is edited carelessly.
      await db.query('SET TRANSACTION READ ONLY', { transaction });
      return db.query<Row>(AUDIT_SQL, {
        type: QueryTypes.SELECT,
        transaction,
        replacements: {
          filterByWorkspace: workspaceIds.length > 0,
          // Postgres needs a non-empty IN list; the flag above disables it when unused.
          workspaceIds:
            workspaceIds.length > 0 ? workspaceIds : ['00000000-0000-0000-0000-000000000000'],
        },
      });
    },
  );

  const workspaces = rows.map<StatusHistoryAuditWorkspace>((row) => ({
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    subtasks: row.subtasks,
    done: row.done,
    doneWithoutCompletedAt: row.done_without_completed_at,
    doneWithoutStartEvent: row.done_without_start_event,
    activeWithoutStartEvent: row.active_without_start_event,
    statusEvents: row.status_events,
    firstStatusEventAt: row.first_status_event_at
      ? new Date(row.first_status_event_at).toISOString()
      : null,
  }));

  const sum = (key: keyof StatusHistoryAuditReport['totals']) =>
    workspaces.reduce((total, workspace) => total + workspace[key], 0);

  return {
    generatedAt: new Date().toISOString(),
    workspaces,
    totals: {
      subtasks: sum('subtasks'),
      done: sum('done'),
      doneWithoutCompletedAt: sum('doneWithoutCompletedAt'),
      doneWithoutStartEvent: sum('doneWithoutStartEvent'),
      activeWithoutStartEvent: sum('activeWithoutStartEvent'),
      statusEvents: sum('statusEvents'),
    },
  };
}
