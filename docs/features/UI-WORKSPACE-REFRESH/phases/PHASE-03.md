# UI-WORKSPACE-REFRESH — Tahap 5: Build Phase 03 — Baseline Visual Task Hub

**Status:** P3.3 E2/E3 candidate; E4 authenticated runtime pending
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-3.1, AC-3.2
**Applicable Policy IDs:** `UI-001`, `UI-002`, `UI-003`, `UI-004`, `AUTH-001`, `AUTH-002`, `CONTRACT-001`, `DATA-001`, `TEST-001`, `SDLC-001`

## Approval Window

| Item        | Isi                                                                                                                                                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task        | `UI-WORKSPACE-REFRESH / P3`                                                                                                                                                                                     |
| Baseline    | `c5c961d` pada branch `docs/doc-portal-close`                                                                                                                                                                   |
| Persetujuan | Owner, pesan `setuju`, 2026-10-24                                                                                                                                                                               |
| Scope       | Task Hub desktop dark mengikuti baseline visual Owner: sidebar/shell, breadcrumb, CTA Feature, folder navigation, Daftar · Kanban · Jadwal. Light, tablet, dan phone memakai adaptasi responsif yang aksesibel. |
| Paths       | `apps/web/src/components/layout/`, `apps/web/src/components/ui/templates/TaskHubDashboardTemplate.tsx`, `apps/web/src/components/ui/organisms/taskHub/`, helper/test terkait, folder Feature, dan `TODO.md`.    |
| Batas       | Read-only UI; tidak ada endpoint, shared contract, database, migration, RBAC, drag/drop, atau data contoh produksi.                                                                                             |
| Recovery    | Revert commit UI; tidak ada data yang perlu dipulihkan.                                                                                                                                                         |

### Window P3.1 — kontrak tema dan perbaikan Jadwal

| Item        | Isi                                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Baseline    | `5165544` pada branch `docs/doc-portal-close`                                                                                                          |
| Persetujuan | Owner, pesan `setuju`, 2026-10-25                                                                                                                      |
| Scope       | Perbaiki Jadwal mode Light; tetapkan strategi Light/Dark wajib untuk komponen/halaman visual; gate statis, test, ADR, UI SSoT, Feature card, dan TODO. |
| Paths       | `apps/web/src/components/**`, `apps/web/src/pages/**`, `apps/web/src/index.css`, Tailwind/lint/script validasi, dan dokumen terkait.                   |
| Batas       | Tidak ada endpoint, shared contract, database, migration, RBAC, dependency baru, merge, atau deploy.                                                   |
| Recovery    | Revert commit UI/dokumentasi; tidak ada data yang perlu dipulihkan.                                                                                    |

### Window P3.2 — audit komponen bersama Light/Dark

| Item        | Isi                                                                                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline    | `6009144` pada branch `docs/doc-portal-close`                                                                                                                          |
| Persetujuan | Owner, pesan `setuju`, 2026-10-25                                                                                                                                      |
| Scope       | Audit atom, molecule, shell/layout, modal/drawer, dan autentikasi; menutup permukaan aplikasi yang masih dark-only serta mendokumentasikan stage media yang invariant. |
| Paths       | `apps/web/src/components/ui/{atoms,molecules,organisms}/`, `apps/web/src/components/{layout,auth}/`, `apps/web/src/pages/LoginPage.tsx`, test dan dokumen terkait.     |
| Batas       | Tidak ada endpoint, shared contract, database, migration, RBAC, dependency baru, merge, atau deploy.                                                                   |
| Recovery    | Revert commit UI/dokumentasi; tidak ada data yang perlu dipulihkan.                                                                                                    |

## WRA dan bukti

WRA: requirement 1, layer 1, data 0, authorization 0, contract 0, blast radius 2,
validation 2, external runtime 1 = **7/16, Ready**.

| Acceptance criterion | Bukti minimum                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| AC-3.1               | Test state URL untuk `view=kanban`; component test tab; browser lokal terautentikasi menampilkan Feature persisted secara read-only.   |
| AC-3.2               | Typecheck/build; browser Light/Dark pada desktop, tablet, phone; keyboard accessible tab/filter.                                       |
| Visual baseline      | Screenshot browser desktop dark dibandingkan dengan referensi Owner; perbedaan yang diperlukan untuk data nyata/aksesibilitas dicatat. |

## Change impact map

`AppLayout` dan `Sidebar` → shell desktop/mobile; `TaskHubDashboardTemplate` → komposisi data
yang ada; `TaskHubControlsBar` → tab presentation; `TaskHubKanbanBoard` → presentasi Feature
read-only. Backend, contract, persistence, authorization, dan mutation tidak terdampak.

## P5 evidence reconciliation — 2026-10-26

`TaskHubDashboardTemplate` restricts the board input to root Features (`!task.parentTaskId`) and
`TaskHubKanbanBoard` renders those Feature cards with only a subtask count. The focused view test
also asserts selecting the root Feature. This conflicts with AC-3.1, which requires the subtasks of
the selected parent Feature to be displayed paginated by canonical status. This phase is therefore
blocked, not accepted; correcting it would change the declared Kanban data contract and needs a new
Approval Window. See [testing.md](../testing.md) and the P5 evidence report.

## Window P3.3 — Kanban subtask per Feature

| Item        | Isi                                                                                                                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline    | `a4e5642` pada branch `docs/doc-portal-close`                                                                                                                                                       |
| Persetujuan | Owner, pesan `lanjut`, 2026-10-26                                                                                                                                                                   |
| Scope       | `kanbanFeatureId` sebagai state URL presentasional; pilih satu Feature, baca subtask paginated dari endpoint existing, kelompokkan status kanonis, dan state loading/empty/error/forbidden.         |
| Paths       | `taskHubQueryState`, `TaskHubDashboardTemplate`, `TaskHubKanbanBoard`, test web/API existing, Feature/TODO/report.                                                                                  |
| Batas       | Tidak ada endpoint, kontrak bersama, schema, migration, RBAC, dependency, drag/drop, mutation, merge, atau deploy. Endpoint backend `GET .../:taskId/subtasks?page&limit` tetap mengotorisasi read. |
| Recovery    | Revert perubahan UI/test/dokumen; tidak ada data yang diubah.                                                                                                                                       |

P3.3 menyelesaikan mismatch P5 tanpa menafsirkan ulang AC-3.1: template menyediakan daftar Feature
sebagai scope selector, sedangkan Kanban memanggil `taskService.listSubtasks` hanya untuk
`kanbanFeatureId` yang dipilih. Result `TaskListResponse` membawa `page`, `limit`, dan `total` dari
backend; UI tidak menghitung status, otorisasi, atau kesiapan sendiri. E2 web 20/20 dan E3 clean
PostgreSQL 11/11 tersedia. E4 menunggu sesi browser authenticated untuk memeriksa parent scope,
pagination, dua tema, dan tiga viewport.
