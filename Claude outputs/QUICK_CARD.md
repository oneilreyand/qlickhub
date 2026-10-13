# Quick Card — jalur Cepat

Dipakai hanya bila **semua** benar: WRA 0–4, satu layer, tidak mengubah shared contract, data/migrasi,
authorization, atau release gate. Jika salah satu tidak terpenuhi, pindah ke jalur Standar.

Disimpan sebagai bagian plan/report task (bukan Feature folder).

```md
# QUICK — <TASK-ID> <judul>

**Status:** Draft | Menunggu persetujuan | Selesai | Blocked
**WRA:** <skor>/16 — alasan singkat per dimensi yang bernilai > 0

## Problem
- Gejala: <apa yang salah>
- Bukti: <screenshot / langkah reproduksi / file:baris / log>
- Penyebab (bila sudah terbukti): <...> atau `unknown`

## Perubahan
- File/path: <daftar>
- Bukan scope: <yang sengaja tidak disentuh>

## Acceptance Criteria → bukti
| AC | Bukti yang dibutuhkan (E-level) | Perintah / observasi |
| --- | --- | --- |
| AC-1 <...> | E2 | `npm test -- <file>` |

## Approval Window
Task · baseline commit · path · urutan aksi (edit → test → commit → PR) · masa berlaku · stop condition

## Hasil (diisi setelah build)
- Perintah — exit code — pass/fail/skip
- Tier merge & PR
- Gap: <atau "Tidak ada">
```
