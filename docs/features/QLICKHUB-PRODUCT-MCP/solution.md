# QLICKHUB-PRODUCT-MCP — Tahap 1: Decision Snapshot

**Status:** Draft
**Gerbang:** G1 — menunggu keputusan Owner
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
