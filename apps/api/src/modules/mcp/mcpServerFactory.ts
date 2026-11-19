import {
  McpServer,
  fromJsonSchema,
  type CallToolResult,
  type McpRequestContext,
} from '@modelcontextprotocol/server';
import { UserModel } from '../../db/models/user.js';
import { workspaceService } from '../workspaces/workspaceService.js';
import { workQueueService } from '../workQueue/workQueueService.js';
import { isPlanner } from '../../policies/shared.js';
import { principalOf } from './mcpTokenVerifier.js';

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

function ok(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
}

/** Domain errors use the existing `CODE: message` convention; surface them without stack traces. */
function failure(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : 'Unexpected error.';
  const safe = /^(FORBIDDEN|NOT_FOUND|BAD_REQUEST|CONFLICT):/.test(message)
    ? message
    : 'INTERNAL: Request failed.';
  return { isError: true, content: [{ type: 'text', text: safe }] };
}

async function guarded(run: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return ok(await run());
  } catch (error) {
    return failure(error);
  }
}

/**
 * One McpServer per request (stateless, SDK v2). The principal is resolved from the verified
 * token, and the tool list is built for that principal (K4: role-filtered `tools/list`). Every
 * tool re-checks authorization through the existing services, so a hidden tool is never the only
 * guard.
 */
export async function buildMcpServer(ctx: McpRequestContext): Promise<McpServer> {
  const { userId } = principalOf(ctx.authInfo);
  const server = new McpServer({ name: 'qlickhub', version: '0.0.0-spike' });

  server.registerTool(
    'get_my_profile',
    {
      title: 'My Qlick Hub profile',
      description: 'Return the signed-in Qlick Hub user.',
      annotations: READ_ONLY,
    },
    () =>
      guarded(async () => {
        const user = await UserModel.findByPk(userId, {
          attributes: ['id', 'name', 'email', 'role'],
        });
        if (!user) throw new Error('NOT_FOUND: User not found.');
        return { id: user.id, name: user.name, email: user.email };
      }),
  );

  server.registerTool(
    'list_my_workspaces',
    {
      title: 'My Workspaces',
      description: 'List Workspaces where the signed-in user is an active member, with their role.',
      annotations: READ_ONLY,
    },
    () =>
      guarded(async () => {
        const workspaces = await workspaceService.getUserWorkspaces(userId);
        return workspaces.map((ws) => ({
          id: ws.id,
          name: ws.name,
          role: ws.myRole,
          archived: Boolean(ws.archivedAt),
        }));
      }),
  );

  server.registerTool(
    'get_my_work_queue',
    {
      title: 'My work queue',
      description: 'Return the role-aware work queue (Tugas Saya) for one Workspace.',
      inputSchema: fromJsonSchema<{ workspaceId: string }>({
        type: 'object',
        properties: {
          workspaceId: { type: 'string', format: 'uuid', description: 'Workspace id' },
        },
        required: ['workspaceId'],
        additionalProperties: false,
      }),
      annotations: READ_ONLY,
    },
    ({ workspaceId }) => guarded(() => workQueueService.getRoleAwareQueue(workspaceId, userId)),
  );

  // K4 probe: registered only when the principal plans in at least one Workspace.
  const plannerWorkspaces = (await workspaceService.getUserWorkspaces(userId)).filter(
    (ws) => !ws.archivedAt && isPlanner(ws.myRole),
  );
  if (plannerWorkspaces.length > 0) {
    server.registerTool(
      'list_my_planner_workspaces',
      {
        title: 'Workspaces I plan in',
        description:
          'Spike probe for role-filtered tools: Workspaces where the user is Owner, Admin, or PO.',
        annotations: READ_ONLY,
      },
      () =>
        guarded(async () =>
          plannerWorkspaces.map((ws) => ({ id: ws.id, name: ws.name, role: ws.myRole })),
        ),
    );
  }

  return server;
}
