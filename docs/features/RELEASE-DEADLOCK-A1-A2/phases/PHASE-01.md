# RELEASE-DEADLOCK-A1-A2 — Tahap 4: Build Phase 01 — Penolakan bisa dicatat

**Status:** Selesai
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-1.1, AC-1.2, AC-1.3, AC-1.4, AC-2.1, AC-2.2
**Applicable Policy IDs:** AI-009, AI-013, AI-014, RELEASE-003, RELEASE-004

## 1. Approval Window

| Item              | Isi                                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID           | RELEASE-DEADLOCK-A1-A2 / P1                                                                                                                          |
| Branch / baseline | `feat/release-deadlock-a1-a2` dari `main` @ `7231db8`                                                                                                |
| File/path         | `releaseDecisionService.ts` + test baru, `ReleaseAssurancePanel.tsx` + test, ADR-031, Workflow §7, POLICY_REGISTRY (RELEASE-004), folder Feature ini |
| Urutan aksi       | edit → test → commit → patch → Owner publish → PR                                                                                                    |
| Disetujui         | reyand (Owner), 2026-10-13, pesan chat "aku ingin semua task dan task agy kamu yang selesaikan" sebagai lanjutan G3                                  |

## 2. Log perubahan

| Task     | File                                                                                     | Ringkasan                                                                             |
| -------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| P1-BE-1  | `apps/api/src/modules/releaseDecisions/releaseDecisionService.ts`                        | Sign-off `rejected`: catatan wajib, QA Subtask `in_progress`/`done`, tanpa gate bukti |
| P1-BE-2  | `releaseDecisionService.ts`                                                              | Gate bukti Release Decision hanya untuk `approved`                                    |
| P1-BE-3  | `apps/api/src/modules/releaseDecisions/__tests__/releaseRejectionApiIntegration.test.ts` | Integration test AC-1.1–1.4, AC-2.1–2.2                                               |
| P1-FE-1  | `apps/web/src/components/ui/organisms/ReleaseAssurancePanel.tsx` + test                  | Mode "Tolak saja", alasan wajib, daftar blocker                                       |
| P1-DOC-1 | ADR-031, Workflow §7, RELEASE-004                                                        | Keputusan D1–D3 dicatat                                                               |

## 3. Pemeriksaan

Lihat [testing.md](../testing.md).

## 4. Deviasi dari rencana

| Deviasi                                                       | Alasan                                                                                                                | Masih dalam scope?    |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------- |
| ADR-031 dibuat di P1, bukan P2                                | D1 menambah aturan (Tolak saat Subtask `in_progress`), jadi DOC-002 mewajibkan ADR sebelum implementasi               | Ya; PR menjadi Tier 2 |
| Test web lama "fails closed for a blocked QA workflow" diubah | Ekspektasi lama (tombol nonaktif saat ada Test Cycle dan blocker) bertentangan dengan D1; kini diuji tanpa Test Cycle | Ya                    |
