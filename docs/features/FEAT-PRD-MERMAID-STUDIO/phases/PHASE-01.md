# FEAT-PRD-MERMAID-STUDIO — Build P1–P2

**Status:** Kandidat teruji
**Disetujui:** Owner (Reyand), 2026-11-09, balasan `ok` atas plan + Approval Window P1–P2.

Approval Window, WRA dan AC: [breakdown.md](../breakdown.md). Branch `codex/prd-mermaid-studio`, baseline `94134da1`. Implementasi dan pemeriksaan lokal; tanpa push/PR/merge/deploy.

## Perubahan

- Shared parser/serializer membungkus source sekali, menjaga identitas, revision dan rentang konten lain.
- Studio sekarang judul + Mermaid + preview; footer shared Modal tetap terlihat pada phone.
- Semua entrypoint mengirim dokumen utuh dan memperbarui blok, bukan append snippet ulang.
- Diagram legacy dan chart tetap terbaca; palette/canvas/builder grafik lama dihapus dari Studio.
- Service Spec/Brief memvalidasi managed structure melalui shared parser sebelum persistence.
- Guard edit stale/dirty, pergantian Feature dan readonly, serta gallery interaktif tersedia.

Pemeriksaan, outcome kegagalan dan batas evidence: [testing.md](../testing.md) dan [laporan](../../../reports/FEAT_PRD_MERMAID_STUDIO_2026-11-09.md).
Tidak ada perubahan schema, migrasi, dependency, policy, role, OAuth atau MCP. G5 independen dan rilis masih pending.
