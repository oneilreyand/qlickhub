import { Response } from 'express';
import EventEmitter from 'node:events';

export interface RealtimeClient {
  id: string;
  workspaceId: string;
  userId: string;
  res: Response;
  connectedAt: Date;
}

export type RealtimeEventType =
  | 'notification:new'
  | 'discussion:comment_created'
  | 'discussion:comment_updated'
  | 'discussion:comment_deleted';

export interface RealtimeEventPayload<T = unknown> {
  event: RealtimeEventType;
  workspaceId: string;
  data: T;
  timestamp: string;
}

class RealtimeEventBus extends EventEmitter {
  private clients: Map<string, RealtimeClient> = new Map();
  private keepAliveInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.setMaxListeners(200);

    // Heartbeat every 25 seconds to keep SSE connections alive through reverse proxies
    this.keepAliveInterval = setInterval(() => {
      this.sendKeepAlive();
    }, 25000);

    if (this.keepAliveInterval.unref) {
      this.keepAliveInterval.unref();
    }
  }

  /**
   * Registers a new SSE client connection for a specific workspace and user.
   */
  public registerClient(params: {
    clientId: string;
    workspaceId: string;
    userId: string;
    res: Response;
  }): void {
    const { clientId, workspaceId, userId, res } = params;

    const client: RealtimeClient = {
      id: clientId,
      workspaceId,
      userId,
      res,
      connectedAt: new Date(),
    };

    this.clients.set(clientId, client);

    // Send initial connected event
    this.sendEventToClient(client, {
      event: 'notification:new' as RealtimeEventType,
      workspaceId,
      data: { system: true, message: 'Connected to Qlick Hub Realtime Stream', clientId },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Removes a disconnected SSE client.
   */
  public removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  /**
   * Broadcasts an event to all connected clients in a workspace, optionally filtered by user ID.
   */
  public emitToWorkspace<T>(
    workspaceId: string,
    event: RealtimeEventType,
    data: T,
    recipientUserIds?: string[]
  ): void {
    const payload: RealtimeEventPayload<T> = {
      event,
      workspaceId,
      data,
      timestamp: new Date().toISOString(),
    };

    for (const client of this.clients.values()) {
      if (client.workspaceId === workspaceId) {
        if (!recipientUserIds || recipientUserIds.includes(client.userId)) {
          this.sendEventToClient(client, payload);
        }
      }
    }
  }

  /**
   * Sends an event to a single specific user across any of their active workspace connections.
   */
  public emitToUser<T>(
    workspaceId: string,
    userId: string,
    event: RealtimeEventType,
    data: T
  ): void {
    this.emitToWorkspace(workspaceId, event, data, [userId]);
  }

  /**
   * Formats and writes an SSE event block to a client's response stream.
   */
  private sendEventToClient(client: RealtimeClient, payload: RealtimeEventPayload<unknown>): void {
    try {
      client.res.write(`event: ${payload.event}\n`);
      client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch {
      this.removeClient(client.id);
    }
  }

  /**
   * Sends a comment keepalive ping to all active SSE streams.
   */
  private sendKeepAlive(): void {
    for (const [clientId, client] of this.clients.entries()) {
      try {
        client.res.write(': keepalive\n\n');
      } catch {
        this.removeClient(clientId);
      }
    }
  }

  /**
   * Returns current active connection count (useful for health diagnostics and metrics).
   */
  public getActiveConnectionCount(workspaceId?: string): number {
    if (!workspaceId) return this.clients.size;
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.workspaceId === workspaceId) count++;
    }
    return count;
  }
}

export const realtimeEventBus = new RealtimeEventBus();
