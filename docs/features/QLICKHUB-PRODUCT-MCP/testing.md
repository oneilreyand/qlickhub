# QLICKHUB-PRODUCT-MCP — Tahap 5: Test & Review

**Status:** Belum mulai
**Gerbang:** G5 — verifier independen
**Applicable Policy IDs:** AI-003, AI-004, AI-008, AI-010, TEST-001, DOC-005, AUTH-011

| AC     | Phase | Bukti direncanakan                                                | Tercapai    |
| ------ | ----- | ----------------------------------------------------------------- | ----------- |
| AC-1.1 | P1    | E3 token expiry/revoke/audience + E4 login                        | Belum diuji |
| AC-1.2 | P1    | E3 dua Workspace, nonmember, role downgrade, Planner vs Dev/QA    | Belum diuji |
| AC-2.1 | P2    | E2 field errors + E3 no domain write                              | Belum diuji |
| AC-3.1 | P3    | E3 full hierarchy read-back + E4 link/UI                          | Belum diuji |
| AC-3.2 | P3    | E3 concurrent retry, key conflict, response loss setelah commit   | Belum diuji |
| AC-3.3 | P3    | E3 injected transactional failure, 0 partial records              | Belum diuji |
| AC-3.4 | P3    | E3 audit actor/channel, inspeksi log secret-free                  | Belum diuji |
| AC-4.1 | P4    | E4 login, preview, explicit publish di setiap client              | Belum diuji |
| AC-5.1 | P6    | E3 spesialisasi cocok/tidak, tanpa poin selama K9 terbuka         | Belum diuji |
| AC-5.2 | P6    | E3 hasil = assignment-preview, tidak memblokir, redaksi AUTH-011  | Belum diuji |
| AC-6.1 | P7    | E3 Dev/QA task terkait vs tidak terkait (403 tanpa isi)           | Belum diuji |
| AC-6.2 | P7    | E3 antrean = my-work-queue per Workspace                          | Belum diuji |
| AC-7.1 | P7    | E3 Owner/Admin vs PO/Dev/QA pada endpoint Leader                  | Belum diuji |
| AC-8.1 | P8a   | E3 transisi status Dev, assignee, 409 claim, audit; E4 client     | Belum diuji |
| AC-8.2 | P8b   | E3 aturan QA executor/reviewer, run/hasil, audit; E4 client       | Belum diuji |
| AC-8.3 | P8a/b | E3 setiap tool write: role/assignee salah → error REST, 0 mutasi  | Belum diuji |
| AC-9.1 | P7    | E2 snapshot katalog + E3 tools/list tanpa tool K6 untuk tiap role | Belum diuji |
| AC-9.2 | P7    | E3 user multi-role lintas Workspace; E4 tools/list_changed        | Belum diuji |

Database/interface tests memakai disposable PostgreSQL dan canonical migrations; fixtures factory
persisten. Tidak mock Sequelize, auth policy, atau internal interfaces. Mock hanya seam eksternal.
Pelaksana mengumpulkan evidence, QA/verifier independen memeriksa sumber primer.
Konfirmasi di percakapan dibuktikan lewat UAT, bukan assertion boolean buatan agent.
UAT client: Tier A (Claude, Codex, Antigravity) wajib per rilis; Tier B (OpenCode, Gemini CLI)
dicatat hasilnya tanpa menjadi syarat rilis. Kesetaraan dengan REST diuji dengan memanggil service
yang sama lewat REST dan MCP untuk aktor yang sama.

Runtime tests, latency/query measurements, dan client UAT belum dijalankan. Pemeriksaan dokumentasi
serta quality review task docs dicatat di
[laporan v1](../../reports/QLICKHUB_PRODUCT_MCP_DOCS_2026-11-03.md) dan
[laporan perluasan](../../reports/QLICKHUB_PRODUCT_MCP_ROLES_DOCS_2026-11-18.md).
Tidak ada hasil MCP yang boleh diinferensikan dari docs:check.
