# QUICK — SUBTASK-ASSIGNEE-AREA-SYNC Assignee di form Detail subtask mengikuti Delivery Area

**Status:** Disetujui
**WRA:** 2/16 — layer 1 (komponen web saja), validasi 1 (component test + CI)

Status yang diizinkan: Draft, Menunggu persetujuan, Disetujui, Selesai, Blocked.

## Problem

- Gejala: Owner melaporkan pelaksana subtask tidak konsisten saat diubah di tab Detail.
- Bukti: `apps/web/src/components/ui/organisms/SubtaskAccordionItem.tsx` — daftar Assignee disaring
  menurut Delivery Area, tetapi nilai `assigneeId` di form tidak ikut berubah. Setelah area diganti
  (mis. Backend → QA) anggota terpilih hilang dari daftar, kolom menampilkan pilihan kosong, dan
  Simpan tetap mengirim anggota lama. Component test baru gagal pada kode lama.
- Penyebab: terbukti untuk kasus di atas. Owner kemudian menyebut kasus lain (2026-11-16): ganti
  orang lalu Simpan, nama pelaksana di ringkasan Feature atau Tugas Saya tetap orang lama sampai
  muat ulang. Kasus itu **tidak ter-reproduksi** pada `main` @ `cb8d23be` (lihat AC-4).

## Perubahan

- File/path: `apps/web/src/components/ui/organisms/SubtaskAccordionItem.tsx`,
  `apps/web/src/components/ui/organisms/__tests__/SubtaskAccordionItem.test.tsx`
- Bukan scope: API, kontrak, aturan role/specialty di server, form buat subtask, drawer lama.

## Acceptance Criteria → bukti

| AC                                                                                                                             | Bukti yang dibutuhkan (E-level) | Perintah / observasi                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------ |
| AC-1 Area diganti dan anggota terpilih tidak cocok → pilihan dikosongkan, ada keterangan                                       | E2                              | `npx vitest run src/components/ui/organisms/__tests__/SubtaskAccordionItem.test.tsx` |
| AC-2 Simpan mengirim nilai yang tampil (kosong, atau anggota baru yang dipilih), bukan anggota sebelumnya                      | E2                              | test yang sama                                                                       |
| AC-3 Anggota tersimpan yang tidak cocok dengan area tetap tampil sebagai opsi berlabel "tidak sesuai area"                     | E2                              | review kode + typecheck                                                              |
| AC-4 Ganti orang tanpa ganti area → header kartu, ringkasan Feature, halaman subtask, Tugas Saya ikut berubah tanpa muat ulang | E4 lokal                        | `node apps/web/e2e/run.mjs specs/subtask-assignee-sync.spec.ts` (desktop + mobile)   |

## Approval Window

- Task / baseline: SUBTASK-ASSIGNEE-AREA-SYNC @ `1c7e6251`
- Path yang diizinkan: dua file di atas, kartu ini, dan spec E2E
  `apps/web/e2e/specs/subtask-assignee-sync.spec.ts` + `apps/web/e2e/support/assigneeSyncSeed.ts`
- Urutan aksi: edit → test → commit → PR → auto-merge (tier 1)
- Masa berlaku dan stop condition: sampai PR ini merge, paling lama 2026-11-19; berhenti bila
  perbaikan memerlukan perubahan API atau aturan server.

**Disetujui:** Owner (Reyand), 2026-11-12, chat — jawaban "Perbaiki itu, tapi ada kasus lain juga"

## Hasil

- `vitest run SubtaskAccordionItem.test.tsx` — exit 0 — 6 pass, 0 fail, 0 skip; test baru gagal
  pada kode lama. Suite web penuh, typecheck dan lint dicatat pada deskripsi PR.
- PR dan tier: Tier 1 (tidak ada path Tier 2).
- `node apps/web/e2e/run.mjs specs/subtask-assignee-sync.spec.ts` — exit 0 — 2 pass (desktop,
  mobile), PostgreSQL disposable. Spec yang sama juga lulus pada `main` @ `cb8d23be` tanpa perbaikan
  kartu ini, jadi kasus kedua Owner tidak ter-reproduksi di layar yang diuji.
- Gap: belum diperiksa di Production; AC-3 tanpa test khusus; kasus kedua Owner mungkin terjadi di
  layar lain (mis. Task Hub/Kanban) atau saat area ikut berubah (diperbaiki kartu ini).
