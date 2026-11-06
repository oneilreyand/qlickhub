# QLICKHUB-PRODUCT-MCP — Tahap 2: PRD

**Status:** Draft
**Gerbang:** G2 — menunggu review PO
**Applicable Policy IDs:** DOC-005, SDLC-001, AUTH-001, AUTH-002, AI-001, DATA-001, CONTRACT-001, TEST-001

## Tujuan dan scope

Owner/Admin/PO grooming di agent masing-masing dan publish hasil lengkap ke Qlick Hub setelah
konfirmasi eksplisit. Agent yang digunakan user menyusun isi; Qlick Hub tidak perlu memanggil
generator Gemini lagi untuk menerbitkan payload yang sudah selesai.

## Requirement dan Acceptance Criteria

| Req ID | Requirement       | AC ID  | Given / When / Then                                                                                                                                                                       | Role    | Bukti minimum       |
| ------ | ----------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------- |
| REQ-1  | Koneksi pribadi   | AC-1.1 | Given akun Qlick Hub, when OAuth dihubungkan, then tool memakai user tersebut dan token expired/revoked ditolak                                                                           | Semua   | E3 + E4 client      |
| REQ-1  | Isolasi akses     | AC-1.2 | Given user tanpa membership atau role Planner, when akses/write dicoba, then data Workspace tidak bocor dan write ditolak                                                                 | Semua   | E3                  |
| REQ-2  | Grooming preview  | AC-2.1 | Given draft, when preview, then server mengembalikan field hilang dan ringkasan tanpa membuat record domain                                                                               | Planner | E2 + E3 no-write    |
| REQ-3  | Publish eksplisit | AC-3.1 | Given preview dan instruksi publish, when agent menerbitkan payload valid, then Feature, Spec, Brief, Requirement/AC, Subtask serta tautan tersimpan atomik dan dapat dibaca lewat UI/API | Planner | E3 + E4             |
| REQ-3  | Deduplikasi       | AC-3.2 | Given retry key/payload sama, when publish diulang/serentak, then receipt sama tanpa root atau child ganda; key sama payload berbeda ditolak                                              | Planner | E3                  |
| REQ-3  | Failure aman      | AC-3.3 | Given payload invalid atau failure di tengah transaksi, when publish, then tidak ada hierarchy parsial dan error dapat ditindaklanjuti                                                    | Planner | E3                  |
| REQ-3  | Audit             | AC-3.4 | Given publish sukses, then user pemilik grant, actor agent, channel mcp, serta resource terkait tercatat tanpa secret                                                                     | Planner | E3 + log inspection |
| REQ-4  | Tiga client       | AC-4.1 | Given konfigurasi Codex/Claude/Antigravity, when login, preview dan publish dilakukan, then hasil sama dan tool write memakai konfirmasi client sesuai pengaturannya                      | Planner | E4 tiap client      |

## User flow dan states

Grooming → agent meminta informasi yang kurang → pilih Workspace/Folder dari hasil backend →
preview → ringkasan final → user “publish ke Qlick Hub” → hasil + link Feature.

Error invalid: field paths terstruktur untuk revisi. Membership/role denied: hentikan write.
Token expired: login ulang. Timeout publish: periksa receipt/retry key yang sama.
Empty Workspace/Folder: minta user memilih tujuan yang valid; jangan membuat ID.
Loading: tampilkan proses; jangan menyatakan sukses sebelum menerima receipt.

Tidak ada halaman produk baru pada rancangan grooming. Wireframe aplikasi N/A untuk slice ini.
Halaman login/consent OAuth bergantung keputusan provider; jika menyentuh UI Qlick Hub,
PRD harus dilengkapi wireframe default/loading/empty/error/disabled/denied dan bukti
phone/tablet/desktop sebelum G2 untuk slice tersebut.

## Data dan authorization

[contracts.md](contracts.md), [authorization.md](authorization.md), dan [setup.md](setup.md).
Domain hierarchy dan QA/release tetap mengikuti SSoT, bukan output bebas dari agent.

## Di luar scope dan unknown

Tidak mencakup deployment, keputusan rilis, delete, atau tool Dev/QA.
Unknown material: [solution.md](solution.md). Semua AC belum diterima.
