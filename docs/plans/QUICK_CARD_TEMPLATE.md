# Quick Card Template — jalur Cepat

**Status:** Active template
**Policy:** `SDLC-001`, `SDLC-002` — [Agent Guidelines §2B](../4_AGENT_DEV_GUIDELINES.md#2b-tahap-sdlc-feature-staged-feature-sdlc)

Dipakai hanya bila **semua** benar: WRA 0–4, satu layer, tidak mengubah shared contract,
data/migrasi, authorization, atau release gate. Jika salah satu tidak terpenuhi, gunakan jalur
Standar dengan [Feature folder template](../features/_template/README.md).

Buat kartu dengan `npm run sdlc:new -- quick <TASK-ID>`; kartu tersimpan di
[`docs/plans/quick/`](quick/README.md). PR yang mengubah kode aplikasi hanya lolos CI bila kartu
berstatus `Disetujui` atau `Selesai`, WRA ≤ 4, baris `**Disetujui:**` terisi, dan tidak ada
placeholder `<…>`, `TBD`, atau `YYYY-MM-DD`.

```md
# QUICK — <TASK-ID> <judul>

**Status:** Draft
**WRA:** <skor>/16 — alasan singkat per dimensi yang bernilai > 0

Status yang diizinkan: Draft, Menunggu persetujuan, Disetujui, Selesai, Blocked.

## Problem

- Gejala: <apa yang salah>
- Bukti: <screenshot / langkah reproduksi / file:baris / log>
- Penyebab: <penyebab terbukti, atau "unknown">

## Perubahan

- File/path: <daftar>
- Bukan scope: <yang sengaja tidak disentuh>

## Acceptance Criteria → bukti

| AC         | Bukti yang dibutuhkan (E-level) | Perintah / observasi       |
| ---------- | ------------------------------- | -------------------------- |
| AC-1 <...> | E2                              | <npm test -- file.test.ts> |

## Approval Window

- Task / baseline: <TASK-ID> @ <commit>
- Path yang diizinkan: <daftar>
- Urutan aksi: edit → test → commit → PR → auto-merge (tier <1/2>)
- Masa berlaku dan stop condition: <...>

**Disetujui:** <nama/role, tanggal, referensi pesan>

## Hasil

- Perintah — exit code — pass/fail/skip: <...>
- PR dan tier: <...>
- Gap: <atau "Tidak ada">
```
