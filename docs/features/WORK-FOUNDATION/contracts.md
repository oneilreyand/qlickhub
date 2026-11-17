# WORK-FOUNDATION — Data, API, and Shared Contracts

**Applicable Policy IDs:** DOC-005, CONTRACT-001, DATA-002, DATA-006

## Data and relations

| Entitas               | Kepemilikan | Kolom utama                                                                                                                           | Catatan                                                                   |
| --------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `workspaces` (+kolom) | Workspace   | `timezone` (IANA, default `Asia/Jakarta`), `working_days` (int[] ISO 1–7, default 1–5), `default_weekly_capacity_points` (default 15) | aditif                                                                    |
| `workspace_holidays`  | Workspace   | `workspace_id`, `date`, `name`, `created_by`                                                                                          | unik (`workspace_id`, `date`); ikut hapus permanen Workspace (`DATA-003`) |
| `tasks.effort`        | Workspace   | enum nullable `xs,s,m,l,xl`                                                                                                           | poin hanya di contracts                                                   |
| `user_capacities`     | User        | `user_id` unik, `weekly_points`, `updated_by`                                                                                         | lintas Workspace                                                          |
| `user_time_off`       | User        | `user_id`, `start_date`, `end_date`, `created_by`                                                                                     | tanpa alasan                                                              |
| `task_blockers`       | Workspace   | `workspace_id`, `task_id`, `category`, `description`, `pic_user_id`, `opened_by/at`, `resolved_by/at`, `resolution_note`              | indeks (`workspace_id`, `resolved_at`), (`task_id`)                       |

Semua migrasi aditif, punya `down`, dan diuji dari database bersih (`DATA-002`).

## API and executable contract

Contract baru: `packages/contracts/src/workCalendar.ts`, `blocker.ts`; tambahan di `task.ts`
(effort + peta poin) dan `capacity.ts` (kapasitas, cuti). Endpoint (prefix `/v1`):

- `GET /v1/workspaces/:workspaceId/calendar`, `PUT /v1/workspaces/:workspaceId/calendar`, `POST /v1/workspaces/:workspaceId/calendar/holidays`, `DELETE /v1/workspaces/:workspaceId/calendar/holidays/:holidayId`
- `GET/PUT /me/capacity`, `GET/PUT /users/:userId/capacity`, `GET/POST/DELETE /users/:userId/time-off[/:id]`
- `GET/POST /workspaces/:workspaceId/tasks/:taskId/blockers`, `POST …/blockers/:blockerId/resolve`
- Effort lewat endpoint create/update Subtask yang sudah ada.

## Boundary notes

Terdampak: model/migrasi, modul `workspaces`, `tasks`, `capacity`, `notifications`, `ai` (Apply);
Web: Pengaturan Workspace, form Subtask, detail Subtask, profil. Tidak terdampak: alur status task,
gate QA/rilis, perhitungan bentrok `FLOW-007` (diganti di LEADER-PIPELINE-HUB, bukan di sini).
