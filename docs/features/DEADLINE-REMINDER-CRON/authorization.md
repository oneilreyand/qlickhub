# DEADLINE-REMINDER-CRON — Authorization Matrix

**Status:** Disetujui

| Actor                                      | `POST /v1/cron/deadline-reminders` | `POST /v1/notifications/check-deadlines?workspaceId=` | Enforced in                                                                |
| ------------------------------------------ | ---------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| Supabase Cron with correct `CRON_SECRET`   | Allowed (all active Workspaces)    | Not applicable (no session)                           | `apps/api/src/modules/cron/cronAuth.ts`                                    |
| Any caller with missing/wrong secret       | 401                                | —                                                     | `cronAuth.ts` (constant-time comparison)                                   |
| Any caller while `CRON_SECRET` is unset    | 503, job not run                   | —                                                     | `cronAuth.ts`                                                              |
| Workspace Owner/Admin (global admin/owner) | 401 (sessions are not accepted)    | Allowed for that Workspace                            | `authorize('admin','owner')` + `requireWorkspaceMember(['owner','admin'])` |
| Global admin/owner without membership      | 401                                | 403                                                   | `requireWorkspaceMember`                                                   |
| PO / Developer / QA                        | 401                                | 403                                                   | `authorize`                                                                |

- `AUTH-012`: the secret is backend-only (Vercel runtime + Supabase Vault), at least 32 characters,
  never in Git, `VITE_*`, the browser, reports, or logs. The cron route carries no user identity and
  accepts no scope parameter.
- The route bypasses the browser-origin check by mount order only; all other state-changing routes
  keep it. Verified by AC-3 (untrusted Origin → cron 200, normal route 403).
- The manual endpoint is tightened from "global admin/owner" to "global admin/owner **and** Workspace
  owner/admin of the given `workspaceId`".
