# QUICK — UX-NAV-CLARITY Nama menu dan satu tempat mengelola orang

**Status:** Selesai
**WRA:** 4/16 — perubahan label lintas beberapa layar (1), satu lapisan frontend (1), aksi anggota dipindah antarhalaman memakai endpoint yang sudah ada (1), alur Owner/Admin berubah tempat (1); tanpa data/kontrak/migrasi/otorisasi baru (0).

Status yang diizinkan: Draft, Menunggu persetujuan, Disetujui, Selesai, Blocked.

## Problem

- Gejala: pengguna bingung karena nama menu tumpang tindih — menu "Ringkasan" dan tab Leader Hub "Ringkasan"; "Anggota & Akses" dan tab "Anggota" di Pengaturan Workspace sama-sama bisa mengubah anggota; tab desain "Bug & SLA" di Leader Hub mirip menu "Bug & Tiket".
- Bukti: Owner di chat, 2026-11-19 — "aku agak kebingungan dari sisi uxnya".
- Penyebab: fitur bertambah per program (WORK-FOUNDATION, MEMBER-ACCESS-HUB, LEADER-PIPELINE-HUB) tanpa peta navigasi bersama.

## Perubahan

- Nama: menu "Ringkasan" → "Beranda"; tab Leader Hub "Ringkasan" → "Ikhtisar", "Laporan" → "Laporan tim"; "Anggota & Akses" → "Tim & Akses" (menu, judul halaman, label header, halaman akses ditolak).
- Tim & Akses menjadi satu-satunya tempat mengelola orang: klik nama membuka panel orang (`features/memberAccess/MemberPersonPanel.tsx`) berisi ringkasan akses per workspace, kapasitas & cuti (`MyCapacitySettings userId`), dan reset kata sandi lewat salah satu workspace yang dikelola (backend tetap menegakkan aturan Owner/Admin).
- Pengaturan Workspace › tab "Anggota" → "Daftar anggota" yang hanya dibaca, dengan tautan ke Tim & Akses untuk Owner/Admin; aksi undang, ubah peran, keluarkan, kapasitas, dan reset kata sandi dihapus dari halaman ini.
- Leader Hub tetap hanya untuk membaca. Tab "Bug & SLA" dihapus dari desain; angka bug/SLA nanti masuk Alur & Kualitas (setelah BUG-INTAKE-SLA G0/G1).
- Dokumen: PRD dan breakdown LEADER-PIPELINE-HUB (REQ-11 "Laporan tim"), README MEMBER-ACCESS-HUB, 3_UI_ATOMIC_DESIGN_SYSTEM, FEATURE_CATALOG, README desain; canvas desain dan gambar 02, 03, 06–10 diperbarui.
- Bukan scope: route (tetap `/work?tab=overview`, `/members`, `/leader`), API, kontrak, migrasi, dokumen ADR/Tier 2, fase historis.

## Acceptance Criteria → bukti

| AC | Bukti (E-level) | Perintah / observasi |
| -- | --------------- | -------------------- |
| AC-1: Sidebar menampilkan Beranda dan Tim & Akses; header mengikuti; tab Leader Hub Ikhtisar, Beban kerja, Alur & Kualitas, Laporan tim. | E2 | `Sidebar.test`, `Header.test`, `LeaderHubPage.test` |
| AC-2: Klik nama di Tim & Akses membuka panel dengan kapasitas & cuti orang itu dan reset kata sandi lewat workspace yang dikelola; tidak ada reset untuk diri sendiri atau orang yang belum aktif. | E2 | `MemberAccessPage.test` |
| AC-3: Pengaturan Workspace › Daftar anggota tidak punya aksi ubah dan menautkan ke `/members`. | E2 | `WorkspaceSettingsPage.test` |
| AC-4: Typecheck, lint, theme, docs governance, dan suite web lulus. | E2, E4 | `npm run validate`, `npx vitest run` di apps/web |

## Approval Window

- Task / baseline: UX-NAV-CLARITY @ faa756e
- Path yang diizinkan: path di bagian Perubahan dan kartu ini
- Urutan aksi: edit → test → commit → PR → merge oleh Owner
- Stop condition: berhenti bila perlu mengubah route, API, kontrak, atau path Tier 2.

**Disetujui:** Owner melalui chat, 2026-11-19 — "coba fix semua ambiguitas jadi user tidak bingung" (usulan nama dan pemindahan aksi anggota).

## Hasil

- Suite web penuh (`npx vitest run` di apps/web) — exit 0 — 156 file, 936 test lulus.
- `npm run validate` — docs, theme, lint (0 error; 16 warning lama di file lain), typecheck lulus setelah import tak terpakai di test dihapus.
- Screenshot Playwright pada harness lokal sementara (tidak di-commit): panel orang di Tim & Akses desktop 1280 dan HP 390.
- Canvas desain diperbarui; gambar 02, 03, 06–10 diekspor ulang dengan label baru.
- Tier: Tier 1 (tidak menyentuh path Tier 2).
- Gap: sidebar di gambar 01, 04, 05 dan artboard canvas lain masih memakai label lama; "Ringkasan" masih dipakai sebagai nama bagian di dalam beberapa halaman (bukan nama menu).
