# UI-WORKSPACE-REFRESH — Tahap 4: Build Phase 04 — Konteks Antrean dan Laporan

**Status:** E2, E3, E4, and G5 accepted
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-4.1, AC-5.1
**Applicable Policy IDs:** `UI-001`, `UI-002`, `UI-003`, `UI-004`, `AUTH-001`, `AUTH-002`, `CONTRACT-001`, `DATA-001`, `TEST-001`, `AI-002`, `AI-009`, `AI-010`, `SDLC-001`

## Approval Window

| Item        | Isi                                                                                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task        | `UI-WORKSPACE-REFRESH / P4`                                                                                                                                                                                   |
| Baseline    | `824daf0` pada branch `docs/doc-portal-close`                                                                                                                                                                 |
| Persetujuan | Owner, pesan `setuju`, 2026-10-25                                                                                                                                                                             |
| Scope       | Resolver URL antrean kerja untuk `subject` dan `nextAction.code`; pemulihan konteks Task/QA/Bug dari URL; test presentasi Laporan yang memakai interface kapasitas yang ada; dokumen dan laporan evidence P4. |
| Paths       | `apps/web/src/pages/MyTasksPage.tsx`, `apps/web/src/components/ui/organisms/MyTasksDashboard.tsx`, utility/test terkait, test Report/Timeline, folder Feature, `TODO.md`, dan report P4.                      |
| Batas       | Tidak ada endpoint, kontrak bersama, database, migration, RBAC, kalkulasi readiness browser, dependency baru, merge, atau deploy. Backend tetap mengotorisasi action yang telah ada.                          |
| Recovery    | Revert commit UI/dokumentasi; query URL lama tanpa konteks tetap membuka `/my-tasks`; tidak ada data yang perlu dipulihkan.                                                                                   |

## WRA dan bukti

WRA: requirement 1, layer 2, data 0, authorization 0, contract 0, blast radius 2, validation 2, external runtime 1 = **8/16, Ready**.

| Acceptance criterion | Bukti minimum                                                                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-4.1               | Unit resolver untuk seluruh `WorkQueueNextActionCode`; test interaksi antrean; browser authenticated Owner/PO/Developer/QA bila sesi tersedia.                                         |
| AC-5.1               | Test halaman Report dan `TeamCapacityTimeline` untuk data, empty, error/retry, serta workspace tak tersedia; authenticated capacity readback bila lingkungan disposable/sesi tersedia. |

## Change impact map

`workQueueRoute` → URL query `taskId`/`bugId`/`nextAction`; `MyTasksPage` → sinkronisasi URL dengan drawer task; `MyTasksDashboard` → drawer Bug yang dapat dipulihkan dari URL; `ReportPage` dan `TeamCapacityTimeline` → bukti presentasi data kapasitas kanonis. Tidak ada perubahan backend, shared contract, persistence, authorization, audit mutation, atau kalkulasi bisnis baru.

## Decision snapshot

Dipilih URL `/my-tasks?taskId=<id>&nextAction=<code>` atau `/my-tasks?bugId=<id>&nextAction=<code>` dibanding state lokal drawer saja. URL tersebut mempertahankan item dan kode action ketika halaman direfresh atau dibagikan, sementara panel QA yang sudah ada hanya difokuskan untuk action QA yang sesuai. Pendekatan deep-link baru per action ditolak karena akan memperluas scope UI tanpa evidence tambahan.
