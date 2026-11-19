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
`GET /v1/me/role-templates`, `POST /v1/me/role-templates`, `DELETE /v1/me/role-templates/:templateId` (P4; milik aktor, privat), `POST /v1/me/member-access/import` (P4; `mode: preview|commit`, maks. 200 baris; baris mentah dari CSV yang di-parse di browser, validasi di server; commit memproses semua baris valid dalam satu transaksi dan mencatat `member_added`/`member_restored` dengan metadata `source: csv_import`).
Perubahan role/spesialisasi/`expiresAt` memakai endpoint keanggotaan per Workspace yang ada.

## Boundary notes

Terdampak: modul `workspaces`, middleware keanggotaan, cron, halaman baru `/members`, sidebar,
Pengaturan Workspace. Tidak terdampak: aturan role per endpoint lain, auth/login.
