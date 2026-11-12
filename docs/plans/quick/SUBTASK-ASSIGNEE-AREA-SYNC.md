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
- Penyebab: terbukti untuk kasus di atas. Owner menyebut ada kasus lain yang belum dijelaskan;
  kasus itu di luar kartu ini dan belum direproduksi.

## Perubahan

- File/path: `apps/web/src/components/ui/organisms/SubtaskAccordionItem.tsx`,
  `apps/web/src/components/ui/organisms/__tests__/SubtaskAccordionItem.test.tsx`
- Bukan scope: API, kontrak, aturan role/specialty di server, form buat subtask, drawer lama.

## Acceptance Criteria → bukti

| AC                                                                                                         | Bukti yang dibutuhkan (E-level) | Perintah / observasi                                                                 |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------ |
| AC-1 Area diganti dan anggota terpilih tidak cocok → pilihan dikosongkan, ada keterangan                   | E2                              | `npx vitest run src/components/ui/organisms/__tests__/SubtaskAccordionItem.test.tsx` |
| AC-2 Simpan mengirim nilai yang tampil (kosong, atau anggota baru yang dipilih), bukan anggota sebelumnya  | E2                              | test yang sama                                                                       |
| AC-3 Anggota tersimpan yang tidak cocok dengan area tetap tampil sebagai opsi berlabel "tidak sesuai area" | E2                              | review kode + typecheck                                                              |

## Approval Window

- Task / baseline: SUBTASK-ASSIGNEE-AREA-SYNC @ `1c7e6251`
- Path yang diizinkan: dua file di atas dan kartu ini
- Urutan aksi: edit → test → commit → PR → auto-merge (tier 1)
- Masa berlaku dan stop condition: sampai PR ini merge, paling lama 2026-11-19; berhenti bila
  perbaikan memerlukan perubahan API atau aturan server.

**Disetujui:** Owner (Reyand), 2026-11-12, chat — jawaban "Perbaiki itu, tapi ada kasus lain juga"

## Hasil

- `vitest run SubtaskAccordionItem.test.tsx` — exit 0 — 6 pass, 0 fail, 0 skip; test baru gagal
  pada kode lama. Suite web penuh, typecheck dan lint dicatat pada deskripsi PR.
- PR dan tier: Tier 1 (tidak ada path Tier 2).
- Gap: belum diperiksa di browser/Production; AC-3 tanpa test khusus; kasus lain dari Owner belum
  diketahui.
