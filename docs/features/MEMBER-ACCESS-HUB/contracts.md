# MEMBER-ACCESS-HUB — Data, API, and Shared Contracts

**Applicable Policy IDs:** DOC-005, CONTRACT-001, DATA-002

## Data and relations

| Entitas                           | Kolom                                                                      | Catatan                                                                     |
| --------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `workspace_members.expires_at`    | timestamptz nullable                                                       | aditif; indeks parsial untuk yang tidak null                                |
| `member_role_templates`           | `owner_user_id`, `name`, `entries` (jsonb: workspaceId, role, specialties) | milik aktor; entri divalidasi ulang saat dipakai                            |
| `workspace_membership_activities` | sudah ada                                                                  | aksi baru: `invitation_resent`, `invitation_canceled`, `membership_expired` |

## API and executable contract

Contract baru `packages/contracts/src/memberAccess.ts`. Endpoint: `GET /v1/me/member-access` (P1, hanya baca),
`POST /v1/me/member-access/:userId/resend-invite`, `POST /v1/me/member-access/:userId/cancel-invite` (P3; per orang, lintas Workspace yang dikelola aktor — bukan per Workspace seperti rencana awal),
`GET/POST/DELETE /v1/me/role-templates`, `POST /v1/me/member-access/import` (pratinjau dan commit).
Perubahan role/spesialisasi/`expiresAt` memakai endpoint keanggotaan per Workspace yang ada.

## Boundary notes

Terdampak: modul `workspaces`, middleware keanggotaan, cron, halaman baru `/members`, sidebar,
Pengaturan Workspace. Tidak terdampak: aturan role per endpoint lain, auth/login.
