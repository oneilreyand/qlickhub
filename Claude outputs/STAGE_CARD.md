# Stage Card — format wajib di chat

Agent menampilkan kartu ini **setiap kali** menyelesaikan tahap atau meminta persetujuan gerbang.
Kartu juga disalin ke Stage Tracker di `README.md` folder Feature (satu baris per tahap).

```md
### Tahap <N>/6 — <Problem | Opsi Solusi | PRD | Breakdown | Build Phase NN | Test & Review | Release>

**Feature:** <FEATURE-ID> — <nama singkat>
**Jalur:** <Cepat | Standar | Penuh> (WRA <skor>/16)
**Status tahap:** <Draft | Menunggu persetujuan | Disetujui | Blocked>
**Dokumen:** <link ke file tahap ini>

**Ringkasan (≤5 baris):**
- ...

**Fakta terkonfirmasi (dengan sumber):**
- <fakta> — <file:baris / commit / query / output perintah>

**Unknown / unverified:**
- <hal yang belum terbukti> — <cara membuktikannya>  (tulis "Tidak ada" bila kosong)

**Keputusan yang kamu perlukan:**
1. <pertanyaan> — Opsi A / B, rekomendasi: <...> karena <...>

**Gerbang berikutnya:** G<N> — disetujui oleh <PO | Owner | verifier>
**Balas:** `setuju G<N>` · `revisi tahap <N>: <catatan>` · `stop`
```

## Aturan

1. Satu kartu per tahap; jangan menggabungkan dua gerbang dalam satu persetujuan, kecuali jalur Cepat.
2. Bagian "Fakta terkonfirmasi" hanya berisi hal yang punya sumber primer (minimal E1).
3. Bila "Unknown" berisi hal yang memengaruhi AC, status tahap = `Blocked` atau keputusan diminta — bukan diisi tebakan.
4. Untuk tahap 4–5, tambahkan ringkasan perintah: `perintah — exit code — pass/fail/skip`.
5. Untuk tahap 6, tambahkan: tier merge, nomor PR, apakah merge memicu deploy Production, dan environment tempat AC diverifikasi.

## Contoh singkat (tahap 3)

```md
### Tahap 3/6 — Breakdown

**Feature:** LEADER-HUB — Dashboard lintas workspace
**Jalur:** Penuh (WRA 12/16)
**Status tahap:** Menunggu persetujuan
**Dokumen:** docs/features/LEADER-HUB/breakdown.md

**Ringkasan:**
- 3 phase: P1 akses + daftar workspace, P2 timeline & konflik, P3 metrik kualitas & digest
- Tiap phase WRA ≤ 8; P1 punya task BE (endpoint + policy), FE (halaman + state), QA (tes 403 + UAT)

**Fakta terkonfirmasi:**
- AUTH-011 mewajibkan redaksi data workspace lain — docs/1_ARCHITECTURE.md §5

**Unknown / unverified:**
- Apakah Admin boleh melihat workspace yang bukan miliknya — perlu keputusan Owner

**Keputusan yang kamu perlukan:**
1. Batas akses Admin — A: hanya workspace tempat ia Admin (rekomendasi) / B: semua

**Gerbang berikutnya:** G3 — Owner (sekaligus Approval Window Phase 1)
**Balas:** `setuju G3` · `revisi tahap 3: ...` · `stop`
```
