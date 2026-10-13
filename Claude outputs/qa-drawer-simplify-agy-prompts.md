# QA drawer: simplifikasi UI/UX + prompt agy (12 Okt 2026)

Basis: kode `main` 4386d4d (setelah PR #30) + screenshot Owner (subtask "Unit Testing untuk State Machine Logic", peran QA).

## Temuan dari kode

| # | Keluhan Owner | Penyebab di kode |
|---|---|---|
| 1 | QA melihat tab "Pengerjaan Dev" | `MyTaskDetailWorkspaceDrawer.tsx` ±L211: `developerReviewTabs` (Dev + QA) dipakai untuk peran dev **dan** qa. |
| 2 | Kartu Feature atas berantakan | `MyTaskFeatureContext.tsx`: untuk non-dev menampilkan `DeliveryTraceSignal` + `ReleaseReadinessSignal showReason` (4 gate rilis = urusan PO). Status juga muncul 3x: kartu Feature, kartu "Area Pengujian & Mutu QA" (`QaTestingDesk.tsx` ±L210), strip "Feature: subtask" di tab Test Case. Branch `fix/qa-feature-context-layout` tidak pernah masuk main, dan tidak perlu lagi karena desain baru menggantikannya. |
| 3 | Test case tidak bisa dihapus | Tidak ada route DELETE di `apps/api/src/modules/testManagement/testManagementRoutes.ts` atau di `testManagementService.ts` web. Hanya PO yang bisa mengarsipkan, dan itu pun hanya dari status `active`. |
| 4a | "Aktifkan" gagal (PATCH 403 di console) | `assertCanUpdateTestCase` (`policies/testManagementPolicy.ts`): QA hanya boleh draft→active bila `findQaDirectActivationScope` menemukan scope. Syaratnya: test case punya Requirement, setiap Requirement tertaut ke task di **satu** Feature, dan ada subtask `deliveryArea='qa'` milik QA itu yang belum selesai. Kalau satu syarat saja gagal, hasilnya 403 tanpa penjelasan yang bisa ditindaklanjuti. |
| 4b | "Tetapkan Versi Uji" gagal | `createQaTestCycle` mewajibkan **Feature Readiness Baseline** (409 CONFLICT), padahal baseline hanya bisa dibuat PO (`featureReadinessRoutes.ts`, role owner/admin/po). Akibatnya QA ditawari tombol yang pasti gagal. |
| 4c | Konsep membingungkan | Ada 3 langkah sebelum test bisa dijalankan: Versi Uji → Aktifkan → (opsional) Minta Masukan PO + Petakan AC. Ditambah 5 tab dan kartu "Langkah Berikutnya". |
| 5 | Bug & Retest, Persetujuan & Riwayat | Bug: tab terpisah, panel Feature penuh (`BugExperiencePanel` mode feature). "Catat Bug" disabled sampai ada hasil gagal; retest dimulai di tab Bug lalu melompat ke tab Test Case. Persetujuan: `ReleaseAssurancePanel` mode qa (panel PO yang dipakai ulang) dengan pemilihan Versi Uji lagi di dialog. Ditambah: `QaSignOffTab` diberi `featureTaskId={parentTask?.id \|\| subtask.id}`, sehingga sebelum parentTask termuat ia mengirim ID subtask sebagai Feature (kandidat GET 400). |

## Desain target: satu layar kerja QA

```
[Judul subtask]                         Sedang Dikerjakan · Terlambat 2h
Feature: Implementasi Sistem Manajemen Tugas ↗   (1 baris, tanpa gate rilis)
────────────────────────────────────────────────
▶ LANGKAH BERIKUTNYA: <1 kalimat>              [ 1 tombol utama ]
   (jika terblokir: alasan + siapa yang bisa membuka + [Ingatkan PO])
────────────────────────────────────────────────
Tab: Pengujian (n) | Spesifikasi | Diskusi (n)

Pengujian:
  Versi diuji: build 1.4.2 · staging  [ganti]
  [+ Test Case] [Impor]
  ☐ TC-01 Login valid        Belum dijalankan   [Jalankan] [⋯ Edit/Hapus]
  ✕ TC-02 Token kadaluarsa   Gagal · Bug #12 Menunggu fix  [Retest]
  ✓ TC-03 ...                Lulus
  ▸ Riwayat persetujuan (collapsed)
```

Prinsip:
1. **QA hanya melihat desk QA.** Tab peran hanya untuk PO/Admin. Info Dev yang QA perlukan (PR, staging URL, status Dev selesai/belum) tampil sebagai 1 baris di tab Spesifikasi.
2. **Kartu Feature menjadi 1 baris** berisi judul + link. Gate rilis, cakupan, dan persetujuan hanya untuk PO. Kartu "Area Pengujian & Mutu QA" dihapus; status + jadwal pindah ke header.
3. **Test case langsung siap dijalankan.** Test case yang dibuat QA di scope subtask QA-nya sendiri langsung `active`. Tombol "Aktifkan" dihapus. "Minta masukan PO" menjadi opsional dan tidak memblokir. PO tetap bisa minta revisi (active→draft) atau mengarsipkan.
4. **Hapus test case.** QA boleh menghapus test case buatannya yang belum pernah dijalankan. Test case yang sudah punya run cukup diarsipkan oleh PO, karena jejak audit harus tetap ada.
5. **Versi uji tidak ditanya dua kali.** Versi uji diisi otomatis dari handoff Dev (staging URL/build) saat "Mulai Tugas QA". Kalau baseline Feature belum dikunci PO, kartu menampilkan status "Menunggu PO mengunci kesiapan Feature" + tombol "Ingatkan PO", bukan tombol yang pasti gagal.
6. **Bug menempel di test case yang gagal.** Status bug dan tombol Retest ada di baris test case, dan "Catat Bug" muncul langsung setelah hasil Gagal/Terblokir disimpan. Tab Bug terpisah dihapus.
7. **Persetujuan QA menjadi langkah terakhir kartu Langkah Berikutnya** (dialog ringkas, versi uji sudah terpilih). Riwayat persetujuan ada di bagian bawah tab Pengujian, dalam keadaan collapsed.
8. Tab berkurang dari 5 (Konteks, Test Case, Bug, Persetujuan, Diskusi) menjadi 3 (Pengujian, Spesifikasi, Diskusi).

## Keputusan Owner yang dibutuhkan
- **D1 — Aktivasi otomatis** (poin 3) mengubah tata kelola ADR-015: QA tidak lagi melewati status draft. Rekomendasi: setuju, karena backend sudah mengizinkan QA mengaktifkan langsung di dalam scope.
- **D2 — Hapus**: hard delete hanya untuk test case yang belum pernah dijalankan, dan dicatat di activity log. Rekomendasi: setuju.
- **D3 — Baseline**: tetap wajib dikunci PO (QA melihat status menunggu), atau dibuat otomatis saat QA menetapkan versi uji. Rekomendasi: tetap wajib PO, tapi kebutuhannya ditampilkan jelas sejak awal.
- **D4 — Draft = label, bukan gerbang** (praktik umum TestRail/Zephyr/Xray): review PO opsional dan async; kontrol mutu dipindah ke Keputusan Rilis PO (peringatan "n test case belum direview", "AC belum dicakup"; PO bisa memblokir rilis). Rekomendasi: setuju.
- **D5 — Edit test case active oleh QA** = revisi baru (hasil lama tetap menempel ke revisi lama). Rekomendasi: setuju.

## Audit e2e role QA (12 Okt, dari kode + spec Playwright)

Spec yang ada: `apps/web/e2e/specs/qa-desk-flow-integration.spec.ts` (alur pass, alur bug→retest) dan `qa-role-isolation.spec.ts` (akses/izin).

**Alur pass (spec 1):** buka task → Mulai Tugas QA → isi build → Simpan & Aktifkan → Jalankan → Catat Hasil → Tambah Tautan + isi → Simpan → Selesaikan Tugas QA → Beri Persetujuan QA (pindah tab) → Catat Persetujuan QA → Konfirmasi = **12 klik, 3 dialog**. Untuk jalur bahagia ini cukup baik.

**Alur gagal → bug → retest (spec 2):** tab Bug → Catat Bug → pilih hasil + developer + 2 field → Kirim → (Dev memperbaiki) → tab Test Case → Tetapkan Versi Uji → isi build → Simpan → tab Bug → Retest → Catat Hasil → Tambah Tautan → Catat → Selesaikan → Beri Persetujuan → Catat Persetujuan → Catat Keputusan = **±15 klik, 4 dialog, 4× pindah tab**. Ini yang terasa ribet.

**Celah: e2e lulus karena seed melewati langkah dunia nyata.** `e2e/support/qaDeskFlowSeed.ts` menulis langsung ke DB: Feature Readiness Baseline, tautan TaskRequirement, test case **status active**, dan test cycle. Akibatnya e2e tidak pernah menguji:
1. QA membuat test case sendiri lewat "Test Case Baru" → draft → Aktifkan (jalur yang 403 di screenshot Owner).
2. Feature tanpa baseline → "Tetapkan Versi Uji" gagal (409).
3. Requirement belum tertaut ke subtask → aktivasi ditolak.
4. Edit/hapus test case (fiturnya belum ada).
5. QA tidak melihat tab "Pengerjaan Dev" (tidak ada assertion).
6. Tombol "Catat Persetujuan QA" di spec 2 diklik lewat `evaluate(el => el.click())` + scrollIntoView, bukan klik biasa. Ini tanda tombol tertutup elemen lain/susah dijangkau; perlu diperiksa sebagai bug UI, bukan diakali di test.

Kesimpulan: jalur bahagia memang mudah, tapi jalur yang paling sering dialami QA sungguhan (mulai dari Feature yang belum disiapkan sempurna) belum diuji dan memang gagal/membingungkan.

## Urutan PR
| # | PR | Tier | Risiko |
|---|---|---|---|
| A | Drawer QA: hapus tab Dev, header ringkas, Feature 1 baris, perbaiki featureTaskId | Auto-merge | Rendah |
| B | Siklus test case: auto-active, hapus draf, prasyarat Versi Uji/aktivasi yang jelas | `owner-approved`, plan dulu | Tinggi (API + policy) |
| C | Tab 5→3: bug inline di test case, persetujuan di kartu Langkah Berikutnya | `owner-approved`, plan dulu | Sedang |

---

## Prompt A — Drawer QA ringkas (frontend only)

```
Repo: oneilreyand/qlickhub (main ≥ 4386d4d). Ikuti AGENTS.md, docs/3_UI_ATOMIC_DESIGN_SYSTEM.md, tutup dengan AGENT_REPORT_TEMPLATE.md.

Approval Window (dari Owner): task ini saja, 1 PR, frontend only, tanpa ubah API/schema.
Hapus branch lama `fix/qa-feature-context-layout` dari pertimbangan; jangan di-merge (digantikan PR ini).

Kerjakan:
1. apps/web/src/components/ui/organisms/myTasks/MyTaskDetailWorkspaceDrawer.tsx
   - Tab peran (Ringkasan PO / Pengerjaan Dev / Pengujian QA) HANYA untuk isPlanner (owner/admin/po).
   - Peran qa: tidak ada tab; selalu desk QA. Peran dev: tidak ada tab; selalu desk Dev. Hapus `developerReviewTabs`.
   - Toolbar untuk dev/qa cukup label peran (pakai cabang non-tab yang sudah ada).
2. MyTaskFeatureContext.tsx: untuk peran dev DAN qa tampilkan versi ringkas 1 baris: ikon + "Feature:" + judul (truncate 1 baris) + tombol/link "Buka Feature". Tanpa DeliveryTraceSignal, tanpa ReleaseReadinessSignal, tanpa status badge Feature. Detail Requirement & AC tetap bisa dibuka (collapsed). Tampilan lengkap (sinyal + gate) tetap untuk planner.
3. QaTestingDesk.tsx: hapus kartu "Area Pengujian & Mutu QA"; pindahkan TaskStatusBadge + TaskScheduleHealthBadge ke baris header di atas kartu Langkah Berikutnya (atau subtitle drawer). Tombol aksi untuk non-assignee (Mulai/Selesaikan/Review) tetap ada, dipindah ke baris yang sama.
4. QaTestCaseExecutionTab.tsx: hapus strip "<Feature>: <subtask>  Lihat Spesifikasi & Prasyarat" (duplikat judul).
5. featureTaskId salah: QaSignOffTab (QaTestingDesk.tsx ±L509) dipanggil dengan `parentTask?.id || subtask.id` → ganti dengan `deskData.featureTaskId` dan JANGAN render/fetch panel yang butuh featureTaskId sampai ID Feature pasti (bukan ID subtask). Cek semua pemanggilan serupa (grep `|| subtask.id`).
6. Reproduksi GET 400 yang muncul saat membuka drawer QA (lihat network tab: endpoint & query). Tulis endpoint + penyebab di report dan perbaiki bila penyebabnya di frontend.

AC:
- Test MyTaskDetailWorkspaceDrawer: qa & dev tidak melihat tablist peran; po melihat 3 tab.
- Test MyTaskFeatureContext: qa/dev tidak merender gate rilis/cakupan; po merender.
- Tidak ada request API dengan ID subtask sebagai featureTaskId (test hook/komponen).
- lint, typecheck, prettier, docs:check, vitest web hijau; screenshot before/after QA desktop 1100px gelap/terang + 390px.
Judul PR: "feat(qa-desk): drawer QA ringkas tanpa tab Dev dan gate rilis".
```

---

## Prompt B — Siklus test case sederhana (plan dulu)

```
Repo: oneilreyand/qlickhub. Ikuti AGENTS.md (WRA, Change Impact Map, Decision Snapshot), docs/2_WORKFLOW_AND_ROLES.md, ADR terkait test case lifecycle (ADR-015).

LANGKAH 1 — PLAN SAJA, JANGAN UBAH KODE. Tunggu persetujuan saya.

Masalah (sudah diverifikasi di kode main 4386d4d):
- QA klik "Aktifkan" → PATCH /test-cases/:id 403. assertCanUpdateTestCase hanya mengizinkan draft→active jika findQaDirectActivationScope (apps/api/src/modules/testManagement/testManagementService.ts ±L112) menemukan scope; gagal diam-diam bila Requirement test case tidak tertaut task di Feature yang sama atau subtask QA bukan milik user/deliveryArea≠qa.
- "Tetapkan Versi Uji" → createQaTestCycle melempar CONFLICT bila belum ada FeatureReadinessBaseline, yang hanya bisa dibuat owner/admin/po. QA tetap ditawari tombolnya.
- Tidak ada cara menghapus test case (tidak ada route DELETE).

Target (keputusan Owner D1–D5):
D1. Test case yang dibuat QA dari desk subtask QA miliknya (kirim qaSubtaskId) langsung berstatus active + revisi active, jika scope valid (pakai ulang logika findQaDirectActivationScope). Jika scope tidak valid: tolak pembuatan dengan pesan Indonesia yang menyebut syarat yang kurang (mis. "Requirement X belum ditautkan ke subtask di Feature ini"). Impor spreadsheet: perilaku sama (create_only → active dalam scope). Hapus tombol "Aktifkan" & state 'activate_test_case' di QaNextActionCard untuk test case baru; test case draft lama tetap bisa diaktifkan. "Minta masukan PO" opsional, tidak memblokir eksekusi. PO tetap bisa active→draft (minta revisi) dan archive.
D2. DELETE /workspaces/:ws/test-cases/:id: hanya QA pembuat (atau owner/admin/po), hanya jika belum pernah ada TestRun/TestResult; hapus revisi, mapping AC, link requirement dalam satu transaksi; catat activity log. Jika sudah pernah dijalankan → 409 dengan pesan "Sudah pernah dijalankan; minta PO mengarsipkan". UI: menu ⋯ pada baris test case berisi Edit / Hapus (dengan dialog konfirmasi) / disabled + alasan bila sudah dijalankan.
D3. Baseline tetap wajib PO. Tambahkan ke workflow summary (getQaWorkflowSummary) blocker baru 'feature_baseline_missing'. QaNextActionCard: bila blocker ini ada, tampilkan "Menunggu PO mengunci kesiapan Feature", tombol utama "Ingatkan PO" (kirim notifikasi/komentar ke PO Feature), dan sembunyikan/disable "Tetapkan Versi Uji" dengan alasan terlihat. Versi Uji di-prefill dari deliverable Dev ("URL Staging" / Tautan PR yang di-parse oleh apps/web/src/components/ui/organisms/myTasks/devDeliverables.ts pada subtask Dev terkait).
D4. Draft = label, bukan gerbang. Status test case tidak memblokir eksekusi bagi QA di scope-nya. "Minta masukan PO" async & opsional. Pindahkan kontrol mutu ke Keputusan Rilis PO (ReleaseAssurancePanel mode release / release readiness gates): tampilkan peringatan "n test case belum direview PO" dan "AC belum dicakup"; PO bisa menandai "sudah direview" atau meminta revisi dari sana, dan memutuskan memblokir rilis. Tentukan di plan apakah ini gate baru (blocking) atau peringatan (non-blocking) — usulkan peringatan + PO wajib centang konfirmasi saat override.
D5. Edit test case: TestCaseFormModal sudah punya mode edit (prop initialTestCase) tapi QaDeskModals.tsx tidak pernah mengirimnya — sambungkan. Belum pernah dijalankan = ubah langsung; sudah active/dijalankan = revisi baru tanpa mengubah hasil lama (perlu ubah assertCanUpdateTestCase yang kini hanya mengizinkan QA mengedit draft).
Juga: semua 403/409 di alur ini dipetakan ke pesan Indonesia yang bisa ditindaklanjuti (bukan "Forbidden").

E2E wajib (tambahkan spec baru, seed "realistis" yang TIDAK menulis test case active/cycle/baseline langsung):
- QA buat test case manual → langsung bisa dijalankan → lulus.
- QA edit lalu hapus test case yang belum dijalankan; hapus ditolak setelah dijalankan.
- Feature tanpa baseline → kartu menampilkan "Menunggu PO…" dan tidak ada tombol yang menghasilkan 4xx; setelah PO mengunci baseline, alur lanjut.
- Requirement belum tertaut → pesan jelas sebelum klik, bukan 403.
- PO melihat peringatan "belum direview" di Keputusan Rilis.
- Assertion: tidak ada respons 4xx di console/network selama alur QA normal.

Plan wajib memuat: perubahan API/contract (@qlick/contracts), migrasi (jika ada), dampak ke test integrasi API & e2e QA (qa-role-isolation, pass/retest), dan pembagian PR (backend dulu, lalu frontend).
```

---

## Prompt C — QA desk 3 tab, bug inline, persetujuan di Langkah Berikutnya (plan dulu)

```
Repo: oneilreyand/qlickhub. Ikuti AGENTS.md, docs/3_UI_ATOMIC_DESIGN_SYSTEM.md. Mulai setelah PR A & B merge.

LANGKAH 1 — PLAN SAJA (format AGENTS.md + Decision Snapshot). Tunggu persetujuan saya.

Target di apps/web/src/components/ui/organisms/myTasks/QaTestingDesk.tsx + qaDesk/*:
1. Tab 5 → 3: "Pengujian" (default), "Spesifikasi", "Diskusi". Hapus tab "Bug & Retest" dan "Persetujuan & Riwayat" sebagai tab.
2. Pengujian: baris versi uji (+ ganti), tombol Test Case/Impor, daftar test case dengan satu status per baris (Belum dijalankan / Berjalan / Lulus / Gagal / Terblokir) dan satu aksi kontekstual (Jalankan / Catat Hasil / Retest). Detail test case dibuka inline (expand), bukan panel terpisah.
3. Bug inline: test case Gagal/Terblokir menampilkan bug tertaut (judul, status, developer). Jika belum ada bug → tombol "Catat Bug" di baris itu (prefill dari hasil). Jika bug sudah diperbaiki Dev → tombol "Retest" di baris itu (pakai alur retest BugExperiencePanel yang ada, tanpa pindah tab). Filter chip "Bug terbuka (n)".
4. Persetujuan QA: jadi langkah terakhir di QaNextActionCard → dialog ringkas (keputusan Setuju/Tolak + catatan), versi uji otomatis = versi aktif (tidak dipilih ulang). Riwayat persetujuan + riwayat bug/retest: section collapsed di bawah tab Pengujian.
5. Spesifikasi: deskripsi subtask, Requirement & AC, dan 1 baris info Dev (status subtask Dev, PR, staging URL) read-only.
6. Hapus komponen/teks yang tidak lagi dipakai (grep), pertahankan BugExperiencePanel & ReleaseAssurancePanel untuk halaman lain.

Ukuran sukses (tulis di report, ukur sebelum/sesudah dengan penghitung klik di e2e):
- Alur pass (spec qa-desk-flow-integration test 1): sekarang 12 klik / 3 dialog → target ≤ 8 klik / ≤ 2 dialog (gabungkan "Selesaikan Tugas QA" + "Catat Persetujuan" jadi satu dialog akhir).
- Alur gagal→bug→retest→lulus (test 2): sekarang ±15 klik / 4 dialog / 4× pindah tab → target ≤ 10 klik / 0 pindah tab.
- Hapus workaround `evaluate(el => el.click())` untuk tombol "Catat Persetujuan QA" di spec; tombol harus bisa diklik normal (perbaiki overlap/sticky yang menutupinya).
- Tambah assertion: QA tidak melihat tab "Pengerjaan Dev".
AC: e2e QA pass/retest diperbarui & hijau, vitest/lint/typecheck hijau, screenshot 1100px & 390px.
```
