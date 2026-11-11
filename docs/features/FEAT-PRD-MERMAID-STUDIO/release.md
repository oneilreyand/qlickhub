# FEAT-PRD-MERMAID-STUDIO — Release & Close

**Status:** Selesai
**Disetujui:** Owner (Reyand), 2026-11-11 — G6 lewat chat (`ok`) setelah smoke Production terautentikasi

Kandidat lokal pada `codex/prd-mermaid-studio`; belum ada push, PR, merge atau deployment.
Scope saat ini Tier 1: tidak menyentuh file pola Tier 2. Klasifikasi harus dihitung lagi jika diff
berubah. Merge kelak hanya melalui tiered auto-merge, dan agent tidak memasang label Owner.

Rollback: batalkan perubahan scoped pada branch; data lama tetap berupa Markdown, tanpa migrasi
atau backfill. Diagram managed masih berisi fenced Mermaid biasa, sehingga source tidak hilang.

Sisa gerbang: review independen G5, lalu keputusan publikasi/rilis G6 sesuai otorisasi. MCP/OAuth
berada pada Feature terpisah; tidak diaktifkan. Lihat [laporan](../../reports/FEAT_PRD_MERMAID_STUDIO_2026-11-09.md).

## Approval Window rilis — 2026-11-09

Owner menginstruksikan **“deploy ke prod”** setelah menerima laporan kandidat lokal. Ini memperluas
window P1–P2 ke commit, push branch non-protected, PR ke main, tiered auto-merge ADR-028, dan
verifikasi deployment Production melalui Git integration existing. Baseline tetap `94134da1`;
origin/main telah diperiksa sama dengan baseline. Task tetap FEAT-PRD-MERMAID-STUDIO.

Urutan: preflight → review Standards dan Spec → perbaikan dalam scope dan pemeriksaan terkait →
commit/push branch → PR dan auto-merge → required CI (termasuk PostgreSQL) → observasi deployment
Vercel Production → smoke root/login/API/health/CORS/auth guard dan sesi terautentikasi bila tersedia →
catat hasil. Window berlaku selama rilis ini, paling lama 2026-11-16 23:59 WIB.

Tidak ada migrasi atau mutasi data bisnis Production yang diperlukan. Secret/dependency/policy dan
label owner-approved tidak diubah. Jika target/tier berubah atau CI memerlukan perubahan di luar
scope, berhenti dan laporkan. Recovery memakai deployment Production sehat sebelum rilis; tidak
melakukan undo schema atau reset database. PR Tier 1 tidak mempunyai file yang cocok pola Tier 2.

WRA rilis 5/16 (kejelasan 0, layer 1, data/migrasi 0, authorization 0, contract 0,
ketersinggungan 1, validasi 2, eksternal 1). Jalur evidence: review diff → CI → Vercel SHA/status →
smoke HTTP/browser. Status Ready untuk pengiriman melalui existing Git integration; authenticated
Production smoke hanya dilakukan bila sesi/credential yang sah tersedia, tanpa membuat sesi palsu.

Bukti rilis: [laporan rilis](../../reports/FEAT_PRD_MERMAID_STUDIO_RELEASE_2026-11-09.md).

## Penutupan G6 — 2026-11-11

Kalimat pembuka di atas menggambarkan kandidat lokal 2026-11-09 dan dipertahankan sebagai histori.
Keadaan akhir:

| Item                                                   | Bukti                                                                                                                                           |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Merge                                                  | PR #119 (`4f0938a2`, Studio Mermaid), PR #121 (`431fcac8`, satu pintu masuk Studio)                                                             |
| Deploy                                                 | Production melayani bundle setelah tiap merge; health `ok`, 81 migrasi; tanpa migrasi untuk Feature ini                                         |
| Smoke terautentikasi (Owner, Feature uji `[UJI F1F2]`) | Sisip diagram → simpan Brief (`PUT` 200) → edit ulang → simpan; GET: satu blok `qlick-diagram:v1`, `revision` 2; ringkasan PRD merender diagram |
| Temuan Production                                      | Tombol `Tambah Diagram` ganda — diperbaiki PR #121 dan diverifikasi di Production                                                               |
| Keputusan                                              | G6 diterima Owner lewat chat 2026-11-11 (`ok`)                                                                                                  |

Bukti: [smoke Production](../../reports/PRODUCTION_SMOKE_F1_F2_MERMAID_2026-11-11.md),
[bukti baca-saja](../../reports/PRODUCTION_READONLY_EVIDENCE_2026-11-11.md), [testing](testing.md).

Gap yang diterima: role Developer/QA (view-only), viewport phone/tablet dan Dark tidak diulang di
Production; bukti lokal MMD-04 dan MMD-07 tetap berlaku. Tampilan Brief non-sederhana masih punya
tombol kepala dan tombol toolbar editor. Data uji tertinggal di Feature `[UJI F1F2]`.
Rollback: revert PR #121/#119 lewat gate yang sama; tidak ada schema undo.
