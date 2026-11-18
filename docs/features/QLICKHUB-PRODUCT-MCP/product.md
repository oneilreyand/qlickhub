# QLICKHUB-PRODUCT-MCP — Tahap 2: PRD

**Status:** Draft
**Gerbang:** G2 — menunggu review PO
**Applicable Policy IDs:** DOC-005, SDLC-001, AUTH-001, AUTH-002, AUTH-011, FLOW-007, AI-001, AI-013, DATA-001, CONTRACT-001, TEST-001

## Tujuan dan scope

Setiap anggota memakai agent pilihannya untuk bekerja di Qlick Hub sesuai role-nya. v1: Owner/Admin/PO
grooming, memilih assignee dengan cek bentrok, lalu publish setelah konfirmasi eksplisit; agent
menyusun isi, Qlick Hub tidak memanggil generator Gemini lagi. v2: baca untuk semua role dan
ringkasan Leader. v3: tulis untuk Developer dan QA dengan konfirmasi eksplisit per write (K3).

## Requirement dan Acceptance Criteria

| Req ID | Requirement       | AC ID  | Given / When / Then                                                                                                                                                                                                         | Role    | Bukti minimum       |
| ------ | ----------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------- |
| REQ-1  | Koneksi pribadi   | AC-1.1 | Given akun Qlick Hub, when OAuth dihubungkan, then tool memakai user tersebut dan token expired/revoked ditolak                                                                                                             | Semua   | E3 + E4 client      |
| REQ-1  | Isolasi akses     | AC-1.2 | Given user tanpa membership atau role Planner, when akses/write dicoba, then data Workspace tidak bocor dan write ditolak                                                                                                   | Semua   | E3                  |
| REQ-2  | Grooming preview  | AC-2.1 | Given draft, when preview, then server mengembalikan field hilang dan ringkasan tanpa membuat record domain                                                                                                                 | Planner | E2 + E3 no-write    |
| REQ-3  | Publish eksplisit | AC-3.1 | Given preview dan instruksi publish, when agent menerbitkan payload valid, then Feature, Spec, Brief, Requirement/AC, Subtask serta tautan tersimpan atomik dan dapat dibaca lewat UI/API                                   | Planner | E3 + E4             |
| REQ-3  | Deduplikasi       | AC-3.2 | Given retry key/payload sama, when publish diulang/serentak, then receipt sama tanpa root atau child ganda; key sama payload berbeda ditolak                                                                                | Planner | E3                  |
| REQ-3  | Failure aman      | AC-3.3 | Given payload invalid atau failure di tengah transaksi, when publish, then tidak ada hierarchy parsial dan error dapat ditindaklanjuti                                                                                      | Planner | E3                  |
| REQ-3  | Audit             | AC-3.4 | Given publish sukses, then user pemilik grant, actor agent, channel mcp, serta resource terkait tercatat tanpa secret                                                                                                       | Planner | E3 + log inspection |
| REQ-4  | Tiga client       | AC-4.1 | Given client Tier A (Codex/Claude/Antigravity), when login, preview dan publish dilakukan, then hasil sama dan tool write memakai konfirmasi client sesuai pengaturannya; Tier B (OpenCode, Gemini CLI) dicatat tanpa klaim | Planner | E4 tiap client      |
| REQ-5  | Bantuan assign    | AC-5.1 | Given subtask dengan area dan jadwal, when Planner meminta kandidat, then agent hanya menyebut member dengan spesialisasi yang cocok dan menandai bentrok tanggal; tanpa poin/kapasitas (K9 = a)                            | Planner | E3                  |
| REQ-5  | Bentrok advisory  | AC-5.2 | Given assignee yang bentrok, when preview atau cek bentrok, then hasil sama dengan assignment-preview, tidak memblokir publish, dan bentrok lintas Workspace hanya berisi jumlah dan rentang tanggal                        | Planner | E3                  |
| REQ-6  | Baca per role     | AC-6.1 | Given Developer/QA, when membaca Feature/subtask/AC/aktivitas, then hanya task yang boleh dibuka menurut ADR-043; selain itu 403 tanpa isi                                                                                  | Dev, QA | E3                  |
| REQ-6  | Antrean saya      | AC-6.2 | Given member, when meminta antrean, then hasil sama dengan my-work-queue untuk Workspace tersebut                                                                                                                           | Semua   | E3                  |
| REQ-7  | Ringkasan Leader  | AC-7.1 | Given Owner/Admin, when meminta pipeline, beban tim, kualitas, atau digest, then data sama dengan endpoint Leader; role lain ditolak                                                                                        | Leader  | E3                  |
| REQ-8  | Write Developer   | AC-8.1 | Given subtask milik Developer, when agent mengubah status, mencentang AC, claim, atau menambah komentar setelah konfirmasi, then transisi dan aturan sama dengan REST dan actor agent + channel mcp tercatat                | Dev     | E3 + E4             |
| REQ-8  | Write QA          | AC-8.2 | Given QA, when agent membuat test case, run, hasil, evidence link, atau bug setelah konfirmasi, then aturan sama dengan REST dan audit tercatat                                                                             | QA      | E3 + E4             |
| REQ-8  | Tolak di luar hak | AC-8.3 | Given role atau assignee yang tidak berhak, when write dicoba, then ditolak dengan error yang sama seperti REST dan 0 mutasi                                                                                                | Semua   | E3                  |
| REQ-9  | Batas MCP         | AC-9.1 | Given katalog tool, when tools/list diambil oleh role apa pun, then tidak ada tool sign-off, keputusan rilis, governance, delete, anggota/role, atau deploy                                                                 | Semua   | E2 + E3             |
| REQ-9  | Visibilitas role  | AC-9.2 | Given user dengan role berbeda per Workspace, when tools/list diambil, then hanya tool gabungan role-nya yang tampil dan setiap call tetap dicek per Workspace                                                              | Semua   | E3 + E4             |

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

### Alur per role (v1–v3)

Planner, saat assign: agent meminta kandidat → server menyaring member dengan spesialisasi cocok dan
menandai bentrok tanggal → agent menyebut bentrok sebagai peringatan → Planner memilih; publish tidak
diblokir oleh bentrok (FLOW-007).

Developer (v2 baca, v3 tulis): "subtask apa yang bisa aku ambil" → antrean dan subtask open yang
cocok → claim setelah konfirmasi → baca AC → ubah status/centang AC/komentar (misalnya link PR)
setelah konfirmasi. Transisi status mengikuti aturan REST, misalnya Developer tidak dapat
menandai Done.

QA (v2 baca, v3 tulis): antrean QA → test case dan AC → run dan hasil per AC dengan evidence link →
bug bila gagal. Agent otomasi Playwright memakai jalur yang sama dengan akun QA yang login.

Leader (v2, baca saja): pertanyaan bebas → agent membaca pipeline, beban tim, kualitas, dan digest.

Setiap write v3: agent menampilkan ringkasan perubahan → user mengonfirmasi → server memeriksa
role, assignee, dan versi → hasil atau error terstruktur. Stale version: muat ulang lalu tanya ulang.

## Data dan authorization

[contracts.md](contracts.md), [authorization.md](authorization.md), dan [setup.md](setup.md).
Domain hierarchy dan QA/release tetap mengikuti SSoT, bukan output bebas dari agent.

## Di luar scope dan unknown

Tidak mencakup deployment, QA sign-off, keputusan rilis, governance, delete, atau pengelolaan
anggota/role (K6). Tool bug Developer dan tiket Support mengikuti BUG-INTAKE-SLA.
Unknown material: [solution.md](solution.md). Semua AC belum diterima.
