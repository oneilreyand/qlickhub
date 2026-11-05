# E2E-SDLC-FLOW — QA Path

**Status:** Disetujui
**Applicable Policy IDs:** DOC-005, QA-004, QA-007, QA-008, QA-010

## Inputs and preconditions

Subtask QA yang ditugaskan kepada QA (role Workspace `qa`), tertaut ke Requirement; Brief disetujui PO.

## Actions and evidence

1. Kartu subtask QA di Tugas Saya menunjukkan "Menunggu Developer: X dari Y subtask Developer untuk
   requirement subtask QA ini siap diuji." atau "Siap diuji: …".
2. Menambah Test Case dari AC; Lulus/Gagal terkunci sampai Developer Requirement itu siap (API `409`).
3. Menjalankan Test Case di siklus uji; hasil Gagal → Bug ke Developer Requirement (atau Developer
   mana pun di Workspace bila belum ada).
4. Retest dari halaman Bug; hasil dan Retest Attempt tersimpan bersama (Bug dibuka kembali atau
   terverifikasi).
5. Setelah semua lulus: "Setujui" pekerjaan Developer yang diuji, "Selesaikan Eksekusi QA", lalu
   "Catat Persetujuan QA".

## Outputs and handoff

QA Sign-off tercatat; kartu "Catat Keputusan Rilis" muncul untuk PO.
