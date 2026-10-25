# UI-WORKSPACE-REFRESH — Tahap 5: Build Phase 03 — Baseline Visual Task Hub

**Status:** In progress
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
