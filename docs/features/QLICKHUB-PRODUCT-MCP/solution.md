# QLICKHUB-PRODUCT-MCP — Tahap 1: Decision Snapshot

**Status:** Draft
**Gerbang:** G1 — menunggu keputusan Owner (K1–K10 dipilih 2026-11-18; OAuth dan host terbuka)
**Applicable Policy IDs:** AI-001, AI-006, AI-011, DOC-002, SDLC-001

## Kondisi dan opsi

[ADR-036](../../adr/ADR-036-FEATURE-SPEC-REQUIRED-FIELDS-AND-AGENT-READY-WRITES.md)
dan [service saat ini](../../../apps/api/src/modules/featureSpecs/featureSpecService.ts)
menyediakan fondasi, tetapi belum transport MCP/OAuth. Create, saveSection, dan Apply saat ini
mempunyai transaksi terpisah. Idempotensi Apply saja tidak mencegah duplikasi root ketika
seluruh publish diulang.

| Opsi                                          | Pro                                                                                       | Kontra dan recovery                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| A: preview + publish satu payload grooming    | Satu instruksi publish; transaksi dan deduplikasi seluruh hierarchy dapat dirancang jelas | Perlu orchestration bersama service dan idempotensi sejak root dibuat     |
| B: agent memanggil create/save/Apply terpisah | Lebih dekat endpoint saat ini; mudah melanjutkan draft                                    | Dapat meninggalkan root/draft parsial; retry create perlu desain tambahan |
| 0: tetap manual lewat UI                      | Tidak menambah auth/transport                                                             | Tetap perlu menyalin hasil grooming                                       |

Rekomendasi A. Publish menggunakan primitive persistence/policy yang sama dengan UI dalam satu
transaksi, bukan membuat implementasi business rule paralel. Ekstraksi primitive transaction-aware
mungkin diperlukan; tentukan batas setelah inspeksi detail pada phase publish.

## Pilihan pengguna dan batas pembuktian

Owner memilih konfirmasi eksplisit di agent, tanpa approval grant sekali-pakai di Qlick Hub.
Client menampilkan ringkasan sebelum publish. Backend memverifikasi credential, scope, role, data,
dan idempotency; backend tidak dapat membuktikan sendiri bahwa user benar-benar mengucapkan
konfirmasi di percakapan. Metadata konfirmasi dari agent bukan bukti independen.

[Architecture §6D](../../1_ARCHITECTURE.md#d-batasan-tata-kelola-ai-ai-governance)
saat ini mensyaratkan Apply eksplisit. Interpretasi bahwa instruksi publish di agent memenuhi Apply
perlu dicatat dalam ADR dan SSoT sebelum runtime diaktifkan. Pilihan user tersimpan di draft ini;
aturan global yang berlaku belum diubah.

## Keputusan terbuka sebelum Build

| Keputusan                  | Alternatif / pro-kontra                                                                                                                                                   | Bukti/keputusan yang dibutuhkan                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| OAuth authorization server | Provider terpelihara: mengurangi protokol buatan sendiri, menambah dependency/biaya; Qlick Hub sendiri: identitas lokal langsung, beban security/maintenance lebih tinggi | Owner memilih setelah evaluasi integrasi akun, PKCE, revocation, biaya                 |
| Registrasi client          | DCR: onboarding sederhana; pre-registered/CIMD: kontrol client lebih eksplisit, konfigurasi tambahan                                                                      | Uji discovery/callback pada tiga client; jangan anggap DCR wajib untuk semua           |
| Hosting MCP                | Dalam Express: reuse service, deployment streaming perlu dibuktikan; service terpisah: isolasi runtime, operasi/auth antarlayanan bertambah                               | Spike transport terhadap host target, latency dan batas request                        |
| Privacy grooming           | Agent memproses Brief/AC dan data tim yang diizinkan                                                                                                                      | Review data yang dikirim ke provider agent; jangan mengirim secret atau Workspace lain |
| Rate limit/retention       | Batas per user/Workspace, expiry token, retention idempotency belum ditetapkan                                                                                            | Tentukan angka dari threat model dan volume pilot                                      |
| Semantik publish           | Opsi A direkomendasikan; exposure write granular tidak masuk katalog v1 usulan                                                                                            | Review G1/G2; kontrak hasil dan rollback di phase publish                              |

ADR usulan belum diberi nomor/diterima karena pilihan auth belum diselesaikan. Tidak ada policy
baru yang diaktifkan oleh dokumentasi ini. Kompatibilitas UI/REST harus dipertahankan.

## Perluasan ke semua role (2026-11-18)

Sumber: [rencana perluasan](../../plans/QLICKHUB_MCP_ALL_ROLES_PLAN.md). Pada chat 2026-11-18 Owner
memilih seluruh rekomendasi K1–K8 di bawah. Pilihan ini mengarahkan isi dokumen; G1 tetap belum
disetujui dan tidak ada policy yang diaktifkan.

| ID  | Keputusan                       | Alternatif (pro / kontra)                                                                                                                                                                                                                                  | Pilihan Owner                                    |
| --- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| K1  | Struktur dokumen                | A: perluas Feature ini — satu katalog, authorization, dan auth/transport (DOC-005); Feature membesar tetapi dipecah per phase. B: Feature baru — terpisah, tetapi auth/transport ditulis dua kali.                                                         | A                                                |
| K2  | Urutan rilis                    | A: v1 Planner (publish + bantuan assign), v2 baca semua role + Leader, v3 tulis Dev/QA — risiko kecil, nilai cepat. B: baca dan tulis sekaligus — satu rilis, WRA lebih tinggi.                                                                            | A                                                |
| K3  | Batas AI-001 untuk write Dev/QA | a: konfirmasi eksplisit di agent per write, diaudit sebagai actor agent + channel mcp; backend tidak dapat membuktikan konfirmasi. b: agent membuat draft, user Apply di UI — paling aman, tetap membuka aplikasi. c: baca saja — nilai kecil.             | a, dicatat di ADR yang sama dengan Apply publish |
| K4  | Visibilitas tool                | A: tools/list difilter gabungan role user di semua Workspace + cek ulang setiap call; perubahan role memerlukan tools/list_changed yang dukungannya diuji per client. B: tampilkan semua, tolak saat call — sederhana, agent mudah mencoba tool terlarang. | A                                                |
| K5  | Developer menautkan PR          | a: komentar atau evidence link yang sudah ada — tanpa perubahan authorization. b: buka POST links untuk Developer — perlu ADR dan Tier 2.                                                                                                                  | a; b menjadi keputusan K10                       |
| K6  | Daftar tidak pernah lewat MCP   | Ya: sign-off, keputusan rilis, governance, delete, anggota/role, deploy tetap di UI dengan jejak manusia (arah AI-013). Tidak: fleksibel, bertentangan dengan AI-013.                                                                                      | Ya                                               |
| K7  | Client target                   | Tier A: Claude, Codex, Antigravity. Tier B: OpenCode, Gemini CLI — ditulis "akan diuji", tidak diklaim kompatibel.                                                                                                                                         | Tier A + B                                       |
| K8  | Instruksi perilaku per role     | A: MCP prompts dari server — satu sumber untuk semua client; dukungan prompts per client diuji. B: file instruksi per client — menyalin aturan ke banyak tempat.                                                                                           | A; setup.md cukup menautkan                      |

### Keputusan tambahan K9 dan K10

| ID  | Keputusan                                   | Fakta                                                                                                                                                                                                                                                                                                             | Alternatif                                                                                                                                                                          |
| --- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K9  | PO melihat beban poin/kapasitas saat assign | Kapasitas pribadi hanya dapat dibaca pemilik akun atau Owner/Admin Workspace yang sama ([personalCapacity.ts](../../../apps/api/src/modules/capacity/internal/personalCapacity.ts)); beban poin vs kapasitas hanya di Leader (Owner/Admin). Timeline dan assignment-preview untuk PO tidak memuat poin atau cuti. | a: PO hanya melihat bentrok tanggal + spesialisasi (tanpa perubahan). b: ringkasan beban dalam persen untuk PO saat assign — perubahan authorization/kontrak, perlu ADR dan Tier 2. |
| K10 | Developer menambah tautan Task              | POST links hanya Owner/Admin/PO ([taskRoutes.ts](../../../apps/api/src/modules/tasks/taskRoutes.ts)).                                                                                                                                                                                                             | a: tetap; PR lewat komentar/evidence. b: buka untuk assignee Developer — perlu ADR.                                                                                                 |

Pilihan Owner (chat 2026-11-18): **K9 = a** — PO tidak melihat beban poin/kapasitas orang lain; bantuan
assign untuk PO hanya spesialisasi dan bentrok tanggal. Beban poin tetap hanya untuk Owner/Admin di
Leader. **K10 = a** — Developer tidak menambah tautan Task; link PR ditulis sebagai komentar. Tidak ada
perubahan authorization.

Keputusan terbuka v1 (OAuth server, registrasi client, hosting, privacy, rate limit, semantik
publish) di atas tetap berlaku untuk semua rilis. OAuth server, registrasi client, dan hosting akan
dijawab lewat [rencana spike](../../plans/QLICKHUB_MCP_OAUTH_HOSTING_SPIKE_PLAN.md), yang juga memeriksa
ulang K4 terhadap revisi MCP 2026-07-28.
