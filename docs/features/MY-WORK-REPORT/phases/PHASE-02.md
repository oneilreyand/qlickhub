# MY-WORK-REPORT — Tahap 4: Build Phase 02 — Beban harian lintas Workspace

**Status:** Kandidat teruji
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-2.1, AC-2.2
**Applicable Policy IDs:** AI-009, AI-013, AI-014, FLOW-012, FLOW-013

Dibangun dan diuji bersama Phase 01 dalam satu PR; Approval Window, pemeriksaan, dan hasil ada di
[PHASE-01.md](PHASE-01.md).

## Log perubahan

| Task    | File berubah                                                                                                                     | Ringkasan                                                                                                                                                                                                                                                                                                                                                                    | Commit      |
| ------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| P2-BE-1 | `modules/myWork/workReportRules.ts`                                                                                              | `computeDailyLoad`: Σ(poin effort ÷ hari kerja Subtask) per hari ÷ (kapasitas mingguan efektif ÷ hari kerja orang itu = gabungan hari kerja Workspace-nya); libur Workspace task dan cuti tidak dihitung; Subtask dibatalkan tidak dihitung; Subtask berjadwal tanpa effort masuk `unmeasuredTaskIds`; hari >100% menyertakan task penyebab terurut dari penyumbang terbesar | PR phase 01 |
| P2-FE-1 | `DailyLoadChart` (catatan "beban belum diukur"), `mapMyWorkReport.ts`, `MyWorkReportPage.tsx` (dialog "Penyebab beban berlebih") | Grafik memakai data backend; "Lihat penyebab" membuka daftar kerjaan penyebab per hari                                                                                                                                                                                                                                                                                       | PR phase 01 |

## Contoh angka (diuji)

Kapasitas 10 poin/minggu, 5 hari kerja → 2 poin/hari. Senin: M Sen–Sel 1,5 + XS Sen–Jum 0,2 + S Sen–Rab
0,67 = 118%. Selasa: + L Sel–Rab 2,5 = 243%. Rabu: 168%. Kamis/Jumat: 10%.

## Deviasi

| Deviasi                                                       | Alasan                                                                                             | Masih dalam scope? | Persetujuan baru? |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------ | ----------------- |
| Subtask yang sudah selesai tetap dihitung pada hari jadwalnya | Grafik menunjukkan beban yang direncanakan; tidak merekonstruksi kapan kerja benar-benar dilakukan | Ya                 | Tidak             |
