# UI-WORKSPACE-REFRESH — Tahap 1: Opsi Solusi (Decision Snapshot)

**Status:** Disetujui
**Gerbang:** G1 — disetujui oleh Owner
**Problem:** [problem.md](problem.md)
**ADR:** Tidak perlu — tidak ada perubahan policy, workflow, contract, atau authorization.
**Applicable Policy IDs:** UI-001, UI-002, UI-003, UI-004, SDLC-001

Format mengikuti Decision Snapshot di `docs/4_AGENT_DEV_GUIDELINES.md` §2A.E; dokumen ini tidak
mengubah aturan tersebut.

## 1. Kondisi sekarang

`/work` mengorkestrasi table/timeline dan drawer detail lewat `TaskHubDashboardTemplate`; `/my-tasks`
menyajikan queue berbasis role; `/reports` memakai timeline kapasitas backend. Tema disimpan pada key
browser `theme`; bootstrap ada di `apps/web/index.html` dan provider di `ThemeContext.tsx`.

## 2. Opsi

Minimal dua opsi nyata ditambah opsi "tidak dikerjakan".

|                   | Opsi A — refresh bertahap                                                | Opsi B — redesign sekaligus                              | Opsi 0 — tidak dikerjakan                               |
| ----------------- | ------------------------------------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------- |
| Ringkasan         | Perbaiki shell/theme → Task Hub → Kanban read-only → Tugas Saya/Laporan. | Ganti semua halaman dan pola sekaligus.                  | Biarkan pola saat ini.                                  |
| Pro               | Risiko kecil, tiap slice dapat diuji dan dikembalikan.                   | Tampilan dapat homogen cepat bila semua keputusan benar. | Tidak ada perubahan perilaku.                           |
| Kontra            | Membutuhkan beberapa phase dan evidence terpisah.                        | Risiko regresi lintas role, sulit mengisolasi failure.   | Masalah overflow, konteks, dan theme mismatch bertahan. |
| Lapisan terdampak | FE + dokumentasi; API/DB N/A pada v1.                                    | FE luas; berpotensi memerlukan API/DB.                   | —                                                       |
| Data / migrasi    | Tidak ada.                                                               | Tidak direncanakan, tetapi risiko meningkat.             | —                                                       |
| Authorization     | Dipertahankan; backend tetap sumber keputusan.                           | Harus diaudit ulang luas.                                | —                                                       |
| Shared contract   | Menggunakan kontrak baca yang ada.                                       | Berisiko meminta kontrak baru.                           | —                                                       |
| Estimasi WRA      | 7/16, Ready after split.                                                 | >8/16 sebelum dianalisis.                                | —                                                       |
| Risiko & rollback | Per-phase revert tanpa data rollback.                                    | Revert besar dan regresi lintas halaman.                 | Risiko produk berlanjut.                                |

## 3. Rekomendasi

Pilih Opsi A. Kanban v1 bersifat baca-saja per Feature, mengambil subtask paginated melalui interface
yang sudah ada. Light/dark memakai semantic token dan mekanisme theme yang sudah ada, bukan sistem tema
paralel. Ini mengurangi risiko N+1, perubahan state lifecycle, dan kalkulasi bisnis di browser.

## 4. Dampak policy

- [x] Tidak mengubah policy → tidak perlu ADR.
- [ ] Mengubah policy → ADR baru dibuat **sebelum** tahap 2, lalu SSoT terdampak diperbarui (`DOC-002`)

## 5. Keputusan

**Dipilih:** Opsi A — User, 2026-10-23, pesan `ok kerjakan` setelah menerima rencana.
**Ditolak:** Opsi B karena scope lintas halaman dan role tidak dapat dibuktikan aman dalam satu batch;
Opsi 0 karena masalah E4 telah direproduksi.
