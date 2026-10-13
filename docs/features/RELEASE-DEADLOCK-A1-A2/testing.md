# RELEASE-DEADLOCK-A1-A2 — Tahap 5: Test & Review

**Status:** Menunggu persetujuan
**Gerbang:** G5 — CI `verify` (mencakup seluruh AC Phase 1) dan review Owner
**Applicable Policy IDs:** AI-003, AI-004, AI-008, AI-010, TEST-001, DOC-005

## 1. Matriks AC → bukti (Phase 1)

| AC          | Bukti dibutuhkan | Bukti tercapai | Sumber                                                                                                                                          |
| ----------- | ---------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1.1      | E3               | E3             | `releaseRejectionApiIntegration.test.ts`: sign-off `rejected` 201, dibaca ulang dari PostgreSQL, Subtask tetap `in_progress`, Activity tercatat |
| AC-1.2      | E3               | E3             | test yang sama: catatan kosong → 400                                                                                                            |
| AC-1.3      | E3               | E3             | test yang sama: `approved` dengan gate gagal → 409                                                                                              |
| AC-1.4      | E3               | E3             | test yang sama: QA lain → 403, Developer → 403                                                                                                  |
| AC-2.1      | E3               | E3             | test yang sama: Release Decision `rejected` 201, dibaca ulang                                                                                   |
| AC-2.2      | E3               | E3             | test yang sama: override `approved` → 409                                                                                                       |
| AC-1.1 (UI) | E2               | E2             | `ReleaseAssurancePanel.test.tsx`: mode Tolak saja, alasan wajib, payload benar                                                                  |

## 2. Outcome pemeriksaan

PostgreSQL 16 disposable lokal, migrasi kanonis 1–86 dijalankan dari database kosong.

| Perintah                                                                                | Exit             | Hasil                                                   | Outcome                                               |
| --------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| `npm --prefix apps/api run test:integration`                                            | 0                | 480 pass, 0 fail, 0 skip                                | sukses                                                |
| `node --test dist/.../releaseRejectionApiIntegration.test.js` terhadap kode `main` lama | 1                | 0 pass, 1 fail (409 "QA Subtask to be completed first") | gagal sesuai harapan — membuktikan test menangkap bug |
| `npx vitest run` (apps/web)                                                             | 0                | 114 file, 660 pass                                      | sukses                                                |
| `npm run validate`                                                                      | lihat laporan PR |                                                         |                                                       |

## 3. Bukti UI

Belum ada screenshot phone/tablet/desktop: perubahan hanya pada isi modal yang sudah ada. Status:
`unverified` untuk tampilan visual; perilaku dibuktikan lewat component test.

## 4. Quality review (AI-010)

| Dimensi       | Metode                                                                   | Temuan                                                     | Status     |
| ------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------- | ---------- |
| Reuse / DRY   | Memakai record sign-off, modal, `Alert`, dan peta blocker yang sudah ada | Tidak ada implementasi paralel                             | none found |
| Duplikasi     | `grep assertQaCompletionGate`                                            | Pemanggil di `taskLifecycle.ts` (QA selesai) tidak berubah | none found |
| Kode usang    | Diff ditinjau                                                            | Tidak ada export yang tidak terpakai                       | none found |
| Boundary      | Otorisasi tetap di service (`assertCanCreateQaSignOff`, pemilik cycle)   | Tidak berubah                                              | none found |
| Bukti regresi | Suite API dan web penuh                                                  | Lulus                                                      | resolved   |

## 5. Hasil verifier

Belum: menunggu CI `verify` pada PR.
