# FEATURE-REFERENCES-MEDIA — Testing Strategy & Evidence Plan

**Status:** Selesai Terverifikasi
**Gerbang:** G5 — Lolos Pengujian
**Applicable Policy IDs:** TEST-001, AUTH-001, AUTH-002, CONTRACT-001, DATA-001, UI-001, UI-002, UI-003, UI-004, UI-005

## 1. Strategi Pengujian

Pengujian dilakukan berlapis (Backend Integration + Frontend Component + Accessibility/Theme):

1. **Database & API Integration Tests (PostgreSQL Disposable)**:
   - Validasi pembuatan tautan dengan URL `https://` yang sah (`201 Created`).
   - Penolakan skema non-https atau berbahaya (`400 Bad Request`).
   - Enforcement RBAC: request mutasi (`POST`, `PATCH`, `DELETE`, `PUT /reorder`) oleh Developer atau QA ditolak (`403 Forbidden`).
   - Integritas relasi: jika Feature induk dihapus, seluruh baris `task_links` terkait terhapus secara otomatis (`ON DELETE CASCADE` + soft-deletion cleanup).
   - Pengubahan urutan (`sort_order`) tersimpan dan terbaca sesuai urutan yang ditentukan.
2. **Frontend Component & Interaction Tests**:
   - Memastikan kartu tautan menampilkan ikon jenis, judul, domain, dan tombol yang membuka link eksternal di tab baru (`target="_blank" rel="noopener noreferrer"`).
   - Memastikan galeri gambar menampilkan preview gambar dan dapat dibuka dalam modal lightbox.
   - Memastikan video YouTube dapat diputar melalui embedded player.
   - Memastikan tombol Tambah, Edit, Hapus, dan Upload tersembunyi ketika diakses oleh Developer atau QA.
3. **Responsive & Accessibility Baseline**:
   - Teruji pada 3 ukuran layar: Desktop (1440px), Tablet (768px), dan Mobile (390px).
   - Lulus pengecekan tema Light dan Dark (`npm run theme:check`).
   - Fokus keyboard dan accessible label pada semua elemen interaktif.

## 2. Pemetaan Acceptance Criteria ke Bukti Pengujian

| Acceptance Criteria                   | Layer   | File Test                                                             | Skenario / Bukti                                                       | Hasil |
| :------------------------------------ | :------ | :-------------------------------------------------------------------- | :--------------------------------------------------------------------- | :---- |
| **AC-F2.1** (Penyimpanan Tautan)      | BE      | `taskLinksIntegration.test.ts`                                        | POST tautan valid dan verifikasi persistensi baris di PostgreSQL       | PASS  |
| **AC-F2.2** (Validasi URL https)      | BE      | `taskLinksIntegration.test.ts`                                        | POST URL `http://` atau `javascript:` ditolak dengan HTTP 400          | PASS  |
| **AC-F2.3** (Direct Redirect Link)    | FE      | `FeatureReferencesAndMedia.test.tsx`                                  | Kartu tautan memuat anchor dengan `target="_blank"` dan URL yang benar | PASS  |
| **AC-F2.4** (Reorder Tautan)          | BE & FE | `taskLinksIntegration.test.ts` & `FeatureReferencesAndMedia.test.tsx` | PUT `/reorder` mengubah `sort_order` dan UI terurut                    | PASS  |
| **AC-F2.5** (Multi-Gambar & Lightbox) | FE      | `FeatureReferencesAndMedia.test.tsx`                                  | Render grid gambar dan klik membuka modal viewer besar                 | PASS  |
| **AC-F2.6** (YouTube Inline Embed)    | FE      | `FeatureReferencesAndMedia.test.tsx`                                  | Render iframe YouTube player untuk URL YouTube yang sah                | PASS  |
| **AC-F2.7** (RBAC Enforcement 403)    | BE & FE | `taskLinksIntegration.test.ts` & `FeatureReferencesAndMedia.test.tsx` | Developer/QA mutasi ditolak HTTP 403; UI menyembunyikan tombol mutasi  | PASS  |
| **AC-F2.8** (Read-Only di Subtask)    | FE      | `FeatureReferencesAndMedia.test.tsx`                                  | Panel referensi tampil tanpa kontrol mutasi saat viewed by dev/qa      | PASS  |
| **AC-F2.9** (Cascade Deletion)        | BE      | `taskLinksIntegration.test.ts`                                        | Menghapus parent task membersihkan baris di `task_links`               | PASS  |

## 3. Rekapitulasi Bukti Eksekusi (Primary Evidence)

1. **Backend Integration Tests (PostgreSQL):**
   - Command: `NODE_ENV=test node --test dist/modules/tasks/__tests__/taskLinksIntegration.test.js`
   - Hasil: 7 passed, 0 failed.
   - Total backend suite: 678 passed, 0 failed (133 suites).
2. **Frontend Component & RBAC Tests (Vitest & Testing Library):**
   - Command: `npx vitest run src/components/ui/organisms/taskDetail/__tests__/FeatureReferencesAndMedia.test.tsx`
   - Hasil: 10 passed, 0 failed.
   - Total taskDetail suite: 69 passed, 0 failed (9 test files).
3. **Repository Validation Gate:**
   - Command: `npm run validate`
   - Hasil: Exit code 0 (docs governance, docsys, env examples, SDLC, migrations prod, agent policy, tier paths, theme check, lint, typecheck all passed).
