# Laporan Serah Terima: SIMPLIFY-PRODUCT-BRIEF-LABEL

## Task

SIMPLIFY-PRODUCT-BRIEF-LABEL — Sederhanakan semua label UI “Ringkasan Produk” menjadi “Ringkasan” pada konteks tab Product Brief di detail Feature (`TaskDetailDrawer`), serta hilangkan ambiguitas dengan menamai tab Task overview menjadi “Ringkasan Task”.

## Outcome

1. **Penyederhanaan Label Tab & Form Product Brief**:
   - Tab Product Brief pada Feature root task disederhanakan dari `"Ringkasan Produk"` menjadi `"Ringkasan"`.
   - Heading komponen disederhanakan dari `"Ringkasan Produk"` menjadi `"Ringkasan"`.
   - Input judul disederhanakan dari `label="Judul Ringkasan Produk"` menjadi `label="Judul Ringkasan"` dengan validasi error `"Judul Ringkasan wajib diisi."`.
   - Judul default fallback disederhanakan menjadi `"Ringkasan ${task.title}"`.
   - Pesan error dan peringatan disederhanakan:
     - Error memuat: `"Ringkasan tidak dapat dimuat."`
     - Error ketersediaan: `"Ringkasan tidak tersedia"`
     - Error penyimpanan: `"Ringkasan tidak dapat disimpan."`
     - Empty state read-only: `"Ringkasan belum tersedia"`
     - Read-only alert non-planner: `"Ringkasan hanya dapat dilihat"`
     - Dialog peringatan draf belum disimpan: `"Simpan Ringkasan sebagai versi baru agar perubahan tidak hilang."`
2. **Disambiguasi dengan Tab Task**:
   - Tab pertama (Task overview) dinamai secara eksplisit `"Ringkasan Task"` yang memuat ringkasan status, jadwal, kesiapan rilis, dan editor `"Ringkasan & Deskripsi Task"`.
   - Menghilangkan ambiguitas visual dan konflik accessible name WAI-ARIA di mana sebelumnya berisiko memiliki dua tab bertuliskan "Ringkasan" yang kembar.
3. **Hardening Komponen Terkait**:
   - `BugExperiencePanel.tsx` diberikan optional chaining pada `bug.originatingTestCase?.availability` untuk mencegah unhandled exceptions pada mock bug atau bug tanpa snapshot test case lengkap.
4. **Pengujian Menyeluruh**:
   - Seluruh 32 unit test `TaskDetailDrawer.test.tsx` lulus.
   - Seluruh 6 unit test `TaskDetailProductBriefTab.test.tsx` (termasuk tes baru empty state, error reload, dan title validation) lulus.
   - Seluruh 514 tes pada 93 suite `apps/web` lulus tanpa kegagalan.

## Source of truth and impact

- **Applicable SSoT:** [`docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`](../3_UI_ATOMIC_DESIGN_SYSTEM.md) dan [`docs/4_AGENT_DEV_GUIDELINES.md`](../4_AGENT_DEV_GUIDELINES.md).
- **Policy IDs:** `UI-001`, `UI-002`, `TEST-001`, `DOC-004`.
- **Data/interface impact:** Tidak ada perubahan kontrak API, payload request/response, database schema, atau migrasi. Perubahan murni pada copy UI dan label presentation. Istilah teknis backend `ProductBrief`, route controller, and audit logs tetap dipertahankan.
- **Authorization impact:** Tidak ada. Aturan otorisasi peran (Owner/Admin/PO dapat mengedit draf Product Brief, Dev/QA hanya baca) tetap ditegakkan melalui backend policy yang ada.
- **Migration risk:** Tidak ada (zero migration risk).

## Changed files

- `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx` — Mengubah label tab `overview` menjadi `"Ringkasan Task"`, tab `brief` menjadi `"Ringkasan"`, pesan error fallback memuat dokumen, dan teks peringatan draf belum disimpan.
- `apps/web/src/components/ui/organisms/taskDetail/TaskDetailProductBriefTab.tsx` — Menyederhanakan copy heading, judul default fallback, label input judul, pesan validasi kosong, alert error, empty state, dan alert read-only.
- `apps/web/src/components/ui/organisms/BugExperiencePanel.tsx` — Menambahkan optional chaining `bug.originatingTestCase?.availability` untuk keandalan rendering drawer.
- `apps/web/src/components/ui/organisms/taskDetail/__tests__/TaskDetailProductBriefTab.test.tsx` — Memperbarui ekspektasi heading/alert dan menambahkan skenario pengujian untuk empty state, error state, dan validasi form.
- `apps/web/src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx` — Memperbarui pengujian toolbar tabs, interaksi tab Ringkasan, dan mock bug schema.
- `TODO.md` — Mencatat progres dan penyelesaian tugas.

## Validation

- `npm --prefix apps/web test src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx src/components/ui/organisms/taskDetail/__tests__/TaskDetailProductBriefTab.test.tsx` — Lulus 38/38 tes (2 file).
- `npm --prefix apps/web test` — Lulus 514/514 tes di seluruh 93 file test `apps/web`.
- `npm run typecheck` — Lulus 0 error di ketiga paket (`contracts`, `api`, `web`).
- `npm run lint` — Lulus 0 error (22 warning lama pada modul lain tidak bertambah).
- `npm run build:web` — Lulus, 1.713 modul Vite berhasil dikompilasi ke `dist/`.
- `npm run docs:check` — Lulus 5/5 governance checks.

## Risks or follow-up

- None. Perubahan UI terisolasi, ramah aksesibilitas, dan seluruh regresi frontend lulus.

## TODO update

- `SIMPLIFY-PRODUCT-BRIEF-LABEL` → `Done`
