# SUBTASK-SCHEDULE-WITHIN-FEATURE — Tahap 1: Opsi Solusi

**Status:** Disetujui
**Gerbang:** G1 — Owner
**Applicable Policy IDs:** SDLC-001, AI-006, DOC-002, AUTH-002, CONTRACT-001, FLOW-007

## 1. Fakta dan opsi

Lihat [problem.md](problem.md) untuk sumber primer. Invariant baru harus berlaku pada lifecycle
Task dan penyimpanan Plan; validasi client saja tidak mencakup caller lain atau request concurrent.

| Aspek         | A: guard server transaksional + UI                                        | B: geser child otomatis                                                 | 0: tidak dikerjakan                    |
| ------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------- |
| Hasil         | Tolak perubahan invalid, jelaskan konflik; tandai legacy                  | Ubah jadwal child mengikuti parent                                      | Status quo                             |
| Pro           | Tidak mengubah komitmen child diam-diam; semua caller memakai aturan sama | Planner lebih sedikit langkah                                           | Tidak ada risiko rilis baru            |
| Kontra        | Planner memperbaiki tanggal sendiri; kontrak baca bertambah               | Keputusan produk/data lebih luas, audit/notifikasi/rollback lebih rumit | Konflik jadwal tetap tidak terlindungi |
| Impact        | BE/FE/contracts dan policy documentation                                  | BE/FE/data/workflow lebih luas                                          | Tidak ada                              |
| Migration     | Tidak                                                                     | Desain tambahan diperlukan                                              | Tidak                                  |
| Authorization | Reuse policy saat ini                                                     | Perlu keputusan kewenangan cascade                                      | Tetap                                  |
| WRA           | 6/16 setelah keputusan disetujui                                          | Di luar scope F1 yang diminta                                           | 0/16                                   |
| Recovery      | Revert patch sebelum rilis; data lama tidak diubah                        | Pemulihan jadwal yang bergeser diperlukan                               | Tidak berlaku                          |

Opsi A disetujui Owner pada 2026-11-07. B bukan izin implementasi. Tidak ada solusi UI-only karena
aturan harus ditegakkan backend; FLOW-007 konflik kapasitas tetap advisory dan tidak diubah.

## 2. Keputusan Owner yang dibutuhkan

| ID                       | Konflik/pertanyaan                                                                                                                     | A (rekomendasi)                                                                                                                                                            | B                                                                                                                | Status                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| K1 (tabel rencana induk) | Tolak atau geser otomatis?                                                                                                             | Tolak saja, 409/400 sesuai rencana                                                                                                                                         | Geser otomatis di luar scope                                                                                     | Disetujui A — Owner 2026-11-07 |
| L1 (khusus F1)           | Aturan utama meminta containment penuh; tabel risiko menyebut hanya perubahan yang memperburuk ditolak. Bagaimana edit tanggal legacy? | Edit metadata/status tanpa mengubah tanggal tetap boleh; bila tanggal diubah, hasil harus valid penuh. Penyempitan root ditolak bila masih menyisakan child aktif di luar. | Izinkan perbaikan parsial yang tidak memperburuk; perlu definisi jarak pelanggaran dan AC tambahan sebelum build | Disetujui A — Owner 2026-11-07 |
| L2 (khusus F1)           | Child terminal yang diabaikan kembali aktif dengan tanggal di luar parent                                                              | Tolak aktivasi 400 dengan rentang; Planner perbaiki jadwal dahulu. Tidak memperluas role/status permissions                                                                | Biarkan reopen menjadi legacy dan beri penanda; invariant menjadi lebih lemah                                    | Disetujui A — Owner 2026-11-07 |

K2–K7 tetap Belum dan milik F2–F4; tidak dikerjakan atau diisi oleh agent.
Data legacy tidak digeser/diperbaiki massal dalam kedua opsi L1.

## 3. Dampak policy dan desain

Aturan containment adalah invariant domain baru; [Workflow §4](../../2_WORKFLOW_AND_ROLES.md#aturan-transisi-subtask)
pada baseline inspeksi hanya mewajibkan pasangan/urutan tanggal. Sesuai DOC-002, sebelum kode runtime:
Owner menyetujui keputusan, kemudian ADR baru dan SSoT Workflow/Architecture yang relevan
mencatat aturan tersebut. Nomor ADR ditetapkan dari indeks terbaru saat approval, bukan dipesan di sini.
ADR-042 Accepted dan SSoT DOMAIN-005 sudah dicatat sebelum implementasi; konflik policy baru tetap stop condition.

Rekomendasi teknis untuk approval: satu guard assertSubtasksWithinFeatureSchedule pada transaksi
caller, Workspace scoped, lock root yang sama untuk semua perubahan jadwal/status relevan dan
create child. Baca nilai tersimpan terbaru setelah lock; root dikunci sebelum child untuk
menghindari siklus lock. Periksa Plan sync dan Apply agar tidak ada jalan pintas. Query legacy
memakai parent batch per halaman, tanpa satu query tambahan per child.

## 4. Rollout dan kompatibilitas

Tidak ada tabel/kolom baru atau backfill. Error 400/409 baru untuk mutation yang sebelumnya bisa
berhasil; penambahan metadata read bersifat additive. Perubahan boundary dan text bukan diasumsikan
sudah kompatibel: tes API/contract, pagination dan frontend wajib membuktikannya.
Rollback aplikasi tidak mengembalikan tanggal karena tidak ada cascade rewrite.

## Persetujuan Owner — 2026-11-07

Owner menjawab `ok` atas permintaan persetujuan G0–G3: K1 tolak tanpa auto-shift;
L1 edit tanggal harus valid penuh, metadata tetap boleh; L2 tolak reopen di luar rentang.
ADR/SSoT dicatat dahulu, lalu Phase 1 lokal. Tidak mencakup commit/push/PR/merge/deploy.
Catatan Blocked/Belum sebelumnya adalah snapshot sebelum keputusan ini, bukan keputusan terbaru.
