## Task

FOLDER-UNFILED-DISCOVERABILITY — tampilkan kategori `Tanpa Folder` dan jelaskan konsekuensi pemilihan folder ketika membuat Feature.

## Outcome

Task Hub kini memiliki scope eksplisit `Tanpa Folder`. Scope tersebut memakai query `unfiledOnly=true`, memuat root Feature yang tidak memiliki `folderId`, dan tidak bercampur dengan folder aktif. Modal pembuatan Feature biasa dan AI memakai komponen pemilih lokasi yang sama: pilihan tanpa folder menyatakan bahwa Feature akan muncul di Semua Task dan Tanpa Folder.

## Work assurance

- **SDLC stage and path (`SDLC-001`):** Quick path; [Quick Card](../plans/quick/FOLDER-UNFILED-DISCOVERABILITY.md) selesai (`SDLC-002`).
- **Work Readiness Assessment:** 4/16, `Ready`; frontend-only, tanpa perubahan kontrak/data/otorisasi/migrasi, dengan kebutuhan E2 dan UAT E4 lokal.
- **User plan approval:** Owner menyetujui scope dan Approval Window melalui pesan “ok jalankan” pada 2026-10-26.
- **Approval Window / high-risk decisions:** `FOLDER-UNFILED-DISCOVERABILITY @ 54867ee`; path frontend, test, Quick Card/TODO/laporan; edit → test → docs → UAT read-only → review → commit/push PR #59; tidak ada merge `main`, deploy, perubahan data, API, RBAC, atau schema. Jendela selesai tanpa stop condition.
- **Agent capability and access:** Executor dapat membaca code dan menjalankan test/build lokal serta UAT sebagai PO di `localhost:3000`. Tidak ada akses database langsung atau mutasi form yang digunakan.
- **AC-to-evidence matrix:**

| Acceptance Criterion                                                                             | Required / achieved evidence level (E0–E4) | Primary evidence and environment                                                                                                                               | Verification status |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `Tanpa Folder` memuat hanya root Feature tanpa folder dan mempertahankan scope URL secara jelas. | E2 / E4                                    | 3 unit state test; UAT PO di `localhost:3000/work?tab=tasks&unfiledOnly=true` menampilkan satu Feature `E4 Pagination Fixture — Kanban` berlabel Tanpa Folder. | Accepted            |
| Memilih Semua Task/folder menghapus scope Tanpa Folder deterministik.                            | E2 / E4                                    | Unit test URL; UAT memilih Semua Task menghapus `unfiledOnly` dan kembali menampilkan dua Feature.                                                             | Accepted            |
| Modal Feature biasa dan AI menjelaskan pilihan tanpa folder dan menyediakan daftar folder.       | E2 / E4                                    | 18 test modal; UAT modal biasa dan AI pada akun PO, tanpa submit.                                                                                              | Accepted            |
| UI ter-token, dapat diakses lewat kontrol native, serta responsif pada Light/Dark.               | E2 / E4                                    | `theme:check`; UAT Light/Dark di 390×844, 768×1024, dan 1440×900.                                                                                              | Accepted            |

- **Evidence outcomes:** Focused web test 4/4 file dan 30/30 test lulus. Typecheck, production build, theme check, docs check, completeness, dan diff check lulus. `sdlc:check` keluar 0 namun melewati perbandingan otomatis karena tidak ada baseline pembanding; Quick Card diverifikasi manual. UAT tidak menekan Buat Task/Generate atau melakukan mutasi apa pun.
- **Change Impact Map:** Function/UI state: query Task Hub dan navigasi folder. Module: `FolderTree`, template Task Hub, Sidebar, modal Feature/AI. Contract/data/authorization/release/operations: none; frontend sudah meneruskan `unfiledOnly` ke kontrak query yang ada.
- **Decision Snapshot:** Menggunakan query `unfiledOnly=true` yang sudah ada daripada folder palsu/array browser. Kelebihan: state dapat dibagikan, filter backend, tidak mengubah data. Konsekuensi: scope Kanban stale-feature tetap bukan bagian slice ini. Rollback: hapus query UI dan komponen; tidak ada data recovery.
- **Agent handoff and independent verification:** Baseline `54867ee`; executor menjalankan E2/E4 primary evidence. Tidak ada handoff verifier tambahan tersedia dalam slice ini; status berdasarkan bukti primer.
- **Quality review:** Reuse/DRY resolved: `FolderLocationSelect` menggantikan tiga select folder duplikat pada modal AI dan satu pada modal biasa. Duplicate/overlap none found pada empat surface pembuatan Feature; pemilih folder Task Detail yang memakai teks lama adalah surface edit/detail terpisah dan sengaja tidak diubah karena di luar scope. Obsolete/unused resolved: helper flatten lokal pada dua organisme pembuatan dihapus. Boundary/best practice accepted: tidak ada logika data browser, mutasi, atau perubahan API. Regression evidence accepted: 30 focused test, typecheck/build/theme/docs/diff, dan UAT enam kombinasi viewport/tema.
- **Cross-layer quality gates:** Atomic decomposition accepted: atom `Select` dipakai oleh molecule `FolderLocationSelect`, kemudian organisme modal. Kontrol FolderTree memakai `button` native dengan target minimum `min-h-10`; state fokus bawaan tetap tersedia. UAT memperlihatkan daftar/kartu ponsel 390×844 dan tabel tablet/desktop 768×1024/1440×900 pada kedua tema. Data/performance/AI technology gate N/A; tidak ada akses baru atau keputusan model AI.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md), [Workflow and Roles](../2_WORKFLOW_AND_ROLES.md), [UI Atomic Design System](../3_UI_ATOMIC_DESIGN_SYSTEM.md), dan [Agent Development Guidelines](../4_AGENT_DEV_GUIDELINES.md).
- **Policy IDs:** `UI-001`, `UI-002`, `UI-003`, `UI-004`, `UI-005`, `SDLC-001`, `SDLC-002`, `DOC-004`.
- **Data/interface impact:** Memakai parameter query Task yang sudah ada; tidak ada endpoint, shared contract, data fixture, atau schema baru.
- **Authorization impact:** None; query tetap melalui backend terautentikasi dan tidak menambah tindakan.
- **Migration risk:** None.

## Changed files

- `apps/web/src/lib/utils/taskHubQueryState.ts` — state URL dan normalisasi scope folderless.
- `apps/web/src/components/ui/templates/TaskHubDashboardTemplate.tsx` — meneruskan scope ke fetch Task dan menamai scope aktif.
- `apps/web/src/components/layout/Sidebar.tsx` dan `apps/web/src/components/ui/organisms/FolderTree.tsx` — navigasi `Tanpa Folder` desktop/mobile.
- `apps/web/src/components/ui/molecules/FolderLocationSelect.tsx` — pemilih folder reusable, token Light/Dark, dan bantuan navigasi.
- `apps/web/src/components/ui/organisms/CreateTaskModal.tsx` dan `AiTaskGeneratorModal.tsx` — memakai molecule lokasi folder.
- Test terkait, Quick Card, dan `TODO.md` — regression/traceability.

## Validation

- `npm --prefix apps/web run test -- --run src/lib/utils/__tests__/taskHubQueryState.test.ts src/components/ui/organisms/__tests__/FolderTree.test.tsx src/components/ui/organisms/__tests__/CreateTaskModal.test.tsx src/components/ui/organisms/__tests__/AiTaskGeneratorModal.test.tsx` — exit 0; 4/4 file, 30/30 test, 0 failed/skipped.
- `npm --prefix apps/web run typecheck` — exit 0.
- `npm --prefix apps/web run build` — exit 0; Vite production build sukses, tidak ada warning yang perlu tindak lanjut.
- `npm run theme:check` — exit 0; theme coverage passed.
- `npm run docs:check` — exit 0; 10/10 lulus.
- `npm run docs:completeness` — exit 0; 91 baseline gap, 0 gap baru, 0 gap selesai.
- `npm run sdlc:check` — exit 0; skipped karena tidak ada base commit pembanding.
- `node scripts/checkTier.mjs HEAD~1 HEAD` — exit 0; Tier 1, tidak ada path Tier 2; commit implementasi `f8cc81f` dipush ke [PR #59](https://github.com/oneilreyand/qlickhub/pull/59).
- `git diff --check` — exit 0.
- UAT PO `localhost:3000` — accepted; Light/Dark pada 390×844, 768×1024, dan 1440×900, tidak ada submit/mutasi data.

## Risks or follow-up

Perilaku Kanban ketika `kanbanFeatureId` stale setelah user mengganti scope folder bukan bagian task ini dan tetap menjadi follow-up terpisah. Tidak ada risiko data atau migrasi dari slice ini.

## Human decision summary

Owner memilih model navigasi satu-band-ing-satu: Feature unfiled memiliki kategori eksplisit, bukan disembunyikan atau dimasukkan ke folder buatan. Implementasi menjaga backend dan data tetap utuh, dan sekarang pengguna diberi konteks yang sama sebelum memilih folder pada pembuatan Feature biasa maupun AI.

## TODO update

- `UI-WORKSPACE-REFRESH` → In progress; P3.4 completed in branch, sementara AC lain tetap terbuka.
