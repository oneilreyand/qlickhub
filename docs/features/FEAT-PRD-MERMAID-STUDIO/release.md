# FEAT-PRD-MERMAID-STUDIO — Release & Close

**Status:** Draft

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
