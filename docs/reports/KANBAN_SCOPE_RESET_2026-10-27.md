## Task

KANBAN-SCOPE-RESET — hapus pemilihan Feature Kanban yang stale saat scope folder berubah.

## Outcome

Memilih folder lain atau `Tanpa Folder` saat Kanban aktif kini membuang `kanbanFeatureId` dari URL kecuali pemanggil secara eksplisit memberikan Feature baru. Sidebar desktop dan mobile memakai normalisasi query bersama. Kanban kemudian meminta pengguna memilih Feature yang tersedia pada scope baru, sehingga tidak dapat mempertahankan subtask dari folder sebelumnya.

## Work assurance

- **SDLC stage and path (`SDLC-001`):** Quick path; [Quick Card](../plans/quick/KANBAN-SCOPE-RESET.md) selesai (`SDLC-002`).
- **Work Readiness Assessment:** 4/16, `Ready`; perubahan frontend state kecil, E2 dan UAT E4 lokal, tanpa API, kontrak, data, otorisasi, atau migrasi.
- **User plan approval:** Owner menyetujui scope dan Approval Window melalui pesan “ok setuju” pada 2026-10-27.
- **Approval Window / high-risk decisions:** `KANBAN-SCOPE-RESET @ 067c04f`; path query state, Sidebar, test, Quick Card/TODO/laporan; edit → test → docs → UAT read-only → review → commit/push PR #58; tanpa merge `main`, deploy, mutasi data, API, RBAC, atau schema. Jendela selesai tanpa stop condition.
- **Agent capability and access:** Executor dapat membaca implementasi frontend, menjalankan test/build lokal, serta UAT PO pada `localhost:3000`. Tidak ada akses database langsung atau form mutasi yang digunakan.
- **AC-to-evidence matrix:**

| Acceptance Criterion                                                                                                | Required / achieved evidence level (E0–E4) | Primary evidence and environment                                                                                            | Verification status |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Perubahan scope folder atau `Tanpa Folder` menghapus `kanbanFeatureId` lama sambil mempertahankan view/filter lain. | E2 / E4                                    | Dua unit test query state; UAT PO folder Oktober pada `localhost:3000`.                                                     | Accepted            |
| Sidebar desktop/mobile memakai normalisasi URL yang sama.                                                           | E2 / E4                                    | `Sidebar` memanggil `patchTaskHubQueryState`; UAT navigasi folder pada desktop dan tombol menu seluler tersedia di 390×844. | Accepted            |
| Tidak ada kontrak atau visual baru; kontrol tetap responsif dan memenuhi strategi Light/Dark.                       | E2 / E4                                    | typecheck/theme check; UAT 390×844, 768×1024, 1440×960.                                                                     | Accepted            |

- **Evidence outcomes:** Focused web test 2/2 file dan 17/17 test lulus. Typecheck, production build, theme check, docs check, completeness, dan diff check lulus. `sdlc:check` keluar 0 namun melewati perbandingan otomatis karena tidak ada baseline pembanding; Quick Card diperiksa manual. UAT berpindah dari Feature unfiled terpilih `46252677-4581-4cdc-971d-7934c53a7ca7` ke folder Oktober: URL tidak lagi mengandung `kanbanFeatureId`; selector menawarkan satu Feature yang scope-valid; setelah dipilih, Kanban menampilkan 3 subtask Belum Dikerjakan dan 1 Sedang Dikerjakan. Tidak ada submit/mutasi data.
- **Change Impact Map:** Function/UI URL state dan navigasi folder. Module: `taskHubQueryState` dan `Sidebar`; consumer: template/board Kanban yang sudah membaca query tersebut. Contract/data/authorization/release/operations: none; browser hanya meneruskan scope ke kontrak fetch yang ada.
- **Decision Snapshot:** Opsi A, menghapus query hanya di dua handler Sidebar, cepat namun memperbanyak invarians URL. Opsi B (dipilih), `patchTaskHubQueryState` menghapus Feature Kanban ketika patch mengubah folder/unfiled scope kecuali Feature eksplisit diberikan. Opsi B memusatkan aturan, melindungi pemanggil lain, dan tetap mempertahankan deep-link ketika scope tidak berubah. Rollback cukup mengembalikan fungsi/handler; tidak ada recovery data.
- **Agent handoff and independent verification:** Baseline `067c04f`; executor menjalankan E2/E4 primary evidence. Tidak ada handoff verifier tambahan tersedia; hasil berdasarkan bukti primer yang dapat diulang.
- **Quality review:** Reuse/DRY resolved: Sidebar memakai utility query state alih-alih mutation `URLSearchParams` lokal. Duplicate/overlap none found: satu invariant scope berada di `patchTaskHubQueryState`. Obsolete/unused resolved: manipulasi `folderId`/`unfiledOnly` manual di Sidebar digantikan. Boundary/best practice accepted: tidak ada state data browser, mutasi, atau perubahan API. Regression evidence accepted: 17 focused test, typecheck/build/theme/docs/diff, serta UAT scope switching.
- **Cross-layer quality gates:** Atomic decomposition accepted: tidak ada markup atau komponen visual baru; Sidebar tetap layout coordinator dan utility menangani state URL. UAT mempertahankan kontrol tab/select Kanban pada 390×844, 768×1024, dan 1440×960. `theme:check` lulus untuk cakupan Light/Dark dan UAT visual mode gelap lulus; tidak ada utility warna/komponen baru. Data/performance/AI gate N/A: tidak ada query backend atau keputusan model baru.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md), [Workflow and Roles](../2_WORKFLOW_AND_ROLES.md), [UI Atomic Design System](../3_UI_ATOMIC_DESIGN_SYSTEM.md), dan [Agent Development Guidelines](../4_AGENT_DEV_GUIDELINES.md).
- **Policy IDs:** `UI-001`, `UI-002`, `UI-003`, `UI-004`, `UI-005`, `SDLC-001`, `SDLC-002`, `DOC-004`.
- **Data/interface impact:** Tidak ada endpoint atau kontrak baru; format query Task Hub yang ada menjadi deterministik ketika scope berubah.
- **Authorization impact:** None; tidak ada tindakan baru dan data tetap melewati backend terautentikasi.
- **Migration risk:** None.

## Changed files

- `apps/web/src/lib/utils/taskHubQueryState.ts` — menghapus `kanbanFeatureId` stale pada patch folder/unfiled.
- `apps/web/src/components/layout/Sidebar.tsx` — memakai normalisasi query yang sama pada navigasi folder dan Tanpa Folder.
- `apps/web/src/lib/utils/__tests__/taskHubQueryState.test.ts` — regresi scope folder dan folderless.
- `docs/plans/quick/KANBAN-SCOPE-RESET.md`, `TODO.md`, dan laporan ini — approval/evidence/traceability.

## Validation

- `npm --prefix apps/web run test -- --run src/lib/utils/__tests__/taskHubQueryState.test.ts src/components/ui/organisms/taskHub/__tests__/TaskHubViews.test.tsx` — exit 0; 2/2 file, 17/17 test, 0 failed/skipped.
- `npm --prefix apps/web run typecheck` — exit 0; tanpa error tipe.
- `npm --prefix apps/web run build` — exit 0; Vite production build sukses, tanpa warning yang perlu tindak lanjut.
- `npm run theme:check` — exit 0; theme coverage passed.
- `npm run docs:check` — exit 0; 10/10 test lulus, 0 gagal/skipped; Documentation governance passed.
- `npm run docs:completeness` — exit 0; 91 gap baseline, 0 gap baru, 0 gap selesai.
- `npm run sdlc:check` — exit 0; skipped karena baseline pembanding tidak tersedia.
- `node scripts/checkTier.mjs HEAD~1 HEAD` — exit 0; Tier 1, tidak ada path Tier 2; commit `a102e8d` dipush ke [PR #58](https://github.com/oneilreyand/qlickhub/pull/58).
- `git diff --check` — exit 0.
- UAT PO `localhost:3000` — accepted; view Kanban menunjukkan reset aman setelah scope folder berubah, kemudian memuat 4 subtask Feature yang benar. Responsif di 390×844, 768×1024, dan 1440×960; tidak ada submit/mutasi data.

## Risks or follow-up

Tidak ada risiko data atau migrasi. Deep-link yang diketik manual dengan Feature yang tidak berada pada scope tetap menunjukkan state pemilihan aman sampai pengguna memilih Feature valid; slice ini menjamin navigasi scope produk tidak lagi menghasilkan ID stale.

## Human decision summary

Owner menyetujui invariant bahwa memilih scope folder harus memutus Feature Kanban sebelumnya. Pilihan ini mencegah tampilan kosong yang tampak sebagai kehilangan data tanpa mengubah data, backend, atau alur status Kanban.

## TODO update

- `UI-WORKSPACE-REFRESH` → In progress; P3.5 selesai, sementara AC hard refresh/filter/detail drawer tetap terbuka.
