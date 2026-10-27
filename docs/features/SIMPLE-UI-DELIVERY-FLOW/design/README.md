# SIMPLE-UI-DELIVERY-FLOW — Design Exports

**Status:** Diekspor 2026-10-27 — render lokal dari sumber canvas (Chromium/Playwright); font Inter tidak termuat, jadi teks memakai font sans sistem
**Sumber kerja:** canvas Design "Qlick Hub — Simple UI" (privat, bukan acuan resmi)
**Acuan resmi:** gambar di folder ini setelah [ADR-035](../../../adr/ADR-035-SIMPLIFIED-SHELL-AND-FEATURE-DETAIL-PAGE.md) diterima

Ekspor setiap artboard sebagai PNG dengan nama di bawah. Varian Dark dan Phone memakai akhiran
`-dark` dan `-phone`. Varian Dark dan Phone dibuat untuk 5 layar utama (artboard berawalan "Dark ·" dan
"HP ·"). Layar lain mengikuti pola yang sama: di HP Sidebar menjadi menu dan panel kanan turun ke bawah;
di Dark warna dipetakan dengan tabel di bawah.

| File                        | Artboard canvas                                 | Light | Dark           | Phone         |
| --------------------------- | ----------------------------------------------- | ----- | -------------- | ------------- |
| `01-task-hub.png`           | Task Hub — versi sederhana                      | Ada   | Ada            | Ada           |
| `02-feature-plan.png`       | 1 · Plan                                        | Ada   | Ikuti pemetaan | Ikuti pola HP |
| `03-feature-prd.png`        | 2 · PRD                                         | Ada   | Ikuti pemetaan | Ikuti pola HP |
| `04-feature-task.png`       | 3 · Task                                        | Ada   | Ada            | Ada           |
| `05-feature-apply.png`      | 4 · Apply                                       | Ada   | Ikuti pemetaan | Ikuti pola HP |
| `06-work-developer.png`     | Detail kerjaan · Developer (subtask)            | Ada   | Ikuti pemetaan | Ikuti pola HP |
| `07-work-po-release.png`    | Detail kerjaan · PO (keputusan rilis)           | Ada   | Ikuti pemetaan | Ikuti pola HP |
| `08-work-qa.png`            | Detail kerjaan · QA (uji subtask)               | Ada   | Ikuti pemetaan | Ikuti pola HP |
| `09-qa-test-case-form.png`  | QA · Tambah Test Case                           | Ada   | Ikuti pemetaan | Ikuti pola HP |
| `10-qa-test-case-run.png`   | QA · Jalankan Test Case + bukti                 | Ada   | Ada            | Ada           |
| `11-my-tasks-po.png`        | Tugas Saya · PO                                 | Ada   | Ikuti pemetaan | Ikuti pola HP |
| `12-my-tasks-developer.png` | Tugas Saya · Developer                          | Ada   | Ada            | Ada           |
| `13-my-tasks-qa.png`        | Tugas Saya · QA                                 | Ada   | Ikuti pemetaan | Ikuti pola HP |
| `14-flow-roles.png`         | Alur kerja PO ↔ Developer ↔ QA                  | Ada   | —              | —             |
| `15-release-verify.png`     | Rilis · Verifikasi Production & penerimaan user | Ada   | Ada            | Ada           |
| `16-release-monitor.png`    | Rilis · Pemantauan pasca-rilis                  | Ada   | Ikuti pemetaan | Ikuti pola HP |
| `17-release-flow.png`       | Alur rilis Production sampai tutup              | Ada   | —              | —             |

## Pemetaan warna Light → Dark (acuan desain)

Nilai final tetap dari token semantik di `tailwind.config.js` dan ADR-034; tabel ini hanya menjelaskan
maksud desain.

| Peran warna              | Light                      | Dark                       |
| ------------------------ | -------------------------- | -------------------------- |
| Kanvas halaman           | `#F7F7F5`                  | `#141413`                  |
| Permukaan kartu          | `#FFFFFF`                  | `#1C1A19`                  |
| Permukaan sekunder       | `#F5F5F4`                  | `#292524`                  |
| Garis batas              | `#E7E5E4`                  | `#34302D`                  |
| Teks utama               | `#1C1917`                  | `#F5F5F4`                  |
| Teks sekunder            | `#57534E`                  | `#A8A29E`                  |
| Aksen teks               | `#3F6212`                  | `#B1E743`                  |
| Isi aksen (tombol utama) | `#B1E743` + teks `#141413` | `#B1E743` + teks `#141413` |
| Latar status sukses      | `#F1F9DC`                  | `#253014`                  |
| Latar peringatan         | `#FEF3C7` / teks `#92400E` | `#3B2F0B` / teks `#FCD34D` |
| Latar gagal              | `#FFF7ED` / teks `#9A3412` | `#2B1B10` / teks `#FDBA74` |
