# TASK-READ-ACCESS — Tahap 0: Problem Statement

**Status:** Disetujui
**Gerbang:** G0 — disetujui oleh PO/Owner
**Disetujui:** Owner (Reyand), 2026-11-12 — chat "celah aksesnya aku ingin di fix"
**Applicable Policy IDs:** SDLC-001, AUTH-001, AUTH-002

## 1. Masalah

Developer/QA yang tidak boleh membuka sebuah Feature tetap dapat membaca data yang melekat pada
Feature itu dengan memanggil API langsung.

## 2. Bukti masalah

- Production 2026-11-12, akun QA tanpa penugasan pada Feature uji `[UJI F1F2]`: detail task 403 dan
  daftar Subtask 403, tetapi `links` 200 (5 tautan), `product-brief` 200 (berisi diagram) dan
  `activity` 200. Pola yang sama pada Feature "Validasi jadwal F1". Hanya GET; tidak ada mutasi.
- Kode `main` @ `1c7e6251`: `assertCanAccessTask` hanya dipanggil dari
  `modules/tasks/internal/taskQuery.ts` dan `modules/testManagement/testManagementService.ts`.
  Route baca task-scoped lain hanya memakai `requireWorkspaceMember()`.

## 3. Siapa yang terdampak

Owner/Admin/PO yang mengandalkan batas akses per Feature; Developer/QA sebagai pihak yang dibatasi.

## 4. Bila tidak dikerjakan

Tautan desain, isi Product Brief, riwayat dan lampiran Feature terbaca oleh anggota Workspace yang
tidak mengerjakannya, bertentangan dengan `AUTH-002`.

## 5. Metrik sukses

Untuk setiap route Phase 1 dan Phase 2: Developer/QA tanpa akses task menerima 403, yang memegang
Subtask menerima 200, dibuktikan integration test PostgreSQL dan smoke Production.

## 6. Batasan dan di luar scope

Mutasi, aturan role per endpoint, model data, dan UI tidak diubah. Membaca diskusi dikecualikan
(ADR-043). Endpoint tingkat Workspace (daftar bug, requirement Workspace, laporan) di luar scope.

## 7. Unknown

Apakah pengecualian diskusi tetap diinginkan Owner; apakah endpoint tingkat Workspace yang memuat
data per Feature perlu aturan serupa. Keduanya tidak menghalangi Phase 1.
