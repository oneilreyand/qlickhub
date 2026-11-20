# QLICKHUB-PRODUCT-MCP — QA Path

**Applicable Policy IDs:** DOC-005, TEST-001, AUTH-002, AI-001, AI-013

v2 (baca): antrean QA, ringkasan alur QA per subtask, test case, run, Feature dan AC dari task yang
boleh dibuka.

v3 (tulis, konfirmasi eksplisit per write): buat test case, mulai run, catat hasil per AC dengan
evidence link, ubah status subtask sesuai aturan QA executor/reviewer, buat Bug, retest, reopen, dan
review readiness. Agent otomasi Playwright memakai jalur yang sama dengan akun QA yang login.
QA sign-off tetap di aplikasi (K6).

Untuk Feature ini, QA memverifikasi AC MCP terhadap PostgreSQL disposable dan UAT client, termasuk
role denial, Workspace isolation, atomicity, retry, audit, dan error. Gunakan [testing](../testing.md).
