# FEATURE-REFERENCES-MEDIA — Shared Contracts & Data Model

**Status:** Menunggu persetujuan
**Gerbang:** Bagian G2 — disetujui oleh PO/Owner
**Applicable Policy IDs:** CONTRACT-001, DATA-001, DATA-006

## 1. Schema Database (PostgreSQL)

Tabel baru `task_links`:

```sql
CREATE TABLE task_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  link_type VARCHAR(32) NOT NULL DEFAULT 'other', -- 'figma' | 'document' | 'sheet' | 'video' | 'other'
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_links_workspace_task ON task_links(workspace_id, task_id, sort_order ASC);
```

## 2. Shared Types (TypeScript di `packages/contracts`)

```typescript
export type TaskLinkType = 'figma' | 'document' | 'sheet' | 'video' | 'other';

export interface TaskLink {
  id: string;
  workspaceId: string;
  taskId: string;
  title: string;
  url: string;
  linkType: TaskLinkType;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskLinkInput {
  title: string;
  url: string;
  linkType?: TaskLinkType;
  sortOrder?: number;
}

export interface UpdateTaskLinkInput {
  title?: string;
  url?: string;
  linkType?: TaskLinkType;
  sortOrder?: number;
}

export interface ReorderTaskLinksInput {
  linkIds: string[];
}
```

## 3. Endpoints REST API

Daftar endpoint untuk pengelolaan tautan referensi pada Feature:

| Method   | Endpoint Path                                             | Akses Peran             | Request Body            | Response Body          |
| :------- | :-------------------------------------------------------- | :---------------------- | :---------------------- | :--------------------- |
| `GET`    | `/v1/workspaces/:workspaceId/tasks/:taskId/links`         | Semua anggota Workspace | —                       | `{ data: TaskLink[] }` |
| `POST`   | `/v1/workspaces/:workspaceId/tasks/:taskId/links`         | Owner, Admin, PO        | `CreateTaskLinkInput`   | `{ data: TaskLink }`   |
| `PATCH`  | `/v1/workspaces/:workspaceId/tasks/:taskId/links/:linkId` | Owner, Admin, PO        | `UpdateTaskLinkInput`   | `{ data: TaskLink }`   |
| `DELETE` | `/v1/workspaces/:workspaceId/tasks/:taskId/links/:linkId` | Owner, Admin, PO        | —                       | `{ success: true }`    |
| `PUT`    | `/v1/workspaces/:workspaceId/tasks/:taskId/links/reorder` | Owner, Admin, PO        | `ReorderTaskLinksInput` | `{ data: TaskLink[] }` |

Untuk upload gambar, memanfaatkan endpoint lampiran yang sudah ada:

- `POST /v1/workspaces/:workspaceId/tasks/:taskId/attachments` dengan form field `category: 'product_media'`.
- `GET /v1/workspaces/:workspaceId/tasks/:taskId/attachments` untuk membaca galeri gambar.
