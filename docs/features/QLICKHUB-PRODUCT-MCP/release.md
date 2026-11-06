# QLICKHUB-PRODUCT-MCP — Tahap 6: Release & Close

**Status:** Belum mulai
**Gerbang:** G6 — PO/Owner
**Applicable Policy IDs:** AI-013, AI-020, DOC-003, RELEASE-001, RELEASE-002

Belum ada PR, deployment, endpoint final, client UAT, QA sign-off, atau keputusan rilis.
G0–G3 tetap draft.

Rencana rollout: bukti disposable PostgreSQL → MCP Inspector lokal → staging read-only →
staging publish akun Planner → UAT Codex/Claude/Antigravity → review keamanan dan QA →
persetujuan deploy → pilot tim terbatas → evaluasi sebelum perluasan.

Rencana recovery: matikan MCP write/endpoint dan cabut grants terkait; UI/REST normal tetap tersedia.
Pertahankan receipt/audit dan data Feature yang telah dipublish; rollback tidak menghapus data user.
Migration additive diverifikasi clean dan recovery-nya sebelum deployment. Rekonsiliasi timeout
memakai idempotency receipt, bukan mencoba key baru.

PR masa depan mengikuti tiered auto-merge. File auth, app wiring, migration/dependency, ADR/SSoT
termasuk kandidat Tier 2 menurut quality/tier2-paths.txt. Owner memasang owner-approved.
Merge ke main dapat memicu Production: cek kondisi host aktual dan persetujuan sebelum merge.
Dokumentasi draft sekarang tidak memberi izin deploy atau mengubah credential.

Tutup Feature hanya setelah seluruh AC memiliki evidence, verifier, QA/PO release decision,
metrik pilot dan link laporan. TODO tetap terbuka selama keputusan desain/implementasi belum selesai.
