# RELEASE-DEADLOCK-A1-A2 — Tahap 3: Breakdown

**Status:** Draft
**Gerbang:** G3 — disetujui oleh Owner; persetujuan ini sekaligus Approval Window Phase 1
**PRD:** [product.md](product.md)
**Applicable Policy IDs:** AI-002, AI-009, AI-014, SDLC-001, SDLC-002

## 1. Peta phase

| Phase | Tujuan                                                 | AC                     | WRA  | Bergantung pada | Status      |
| ----- | ------------------------------------------------------ | ---------------------- | ---- | --------------- | ----------- |
| P1    | Sign-off Tolak dan Release Decision Tolak bisa dicatat | AC-1.1–1.4, AC-2.1–2.2 | 5/16 | —               | Belum mulai |
| P2    | Gate PO menghitung semua severity + ADR                | AC-3.1–3.3             | 6/16 | P1              | Belum mulai |

## 2. Task per phase

### Phase 1 — Penolakan bisa dicatat

| Task ID | Layer | Pekerjaan                                                                           | File/path perkiraan                                               | AC             | Bukti selesai                             |
| ------- | ----- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------- | ----------------------------------------- |
| P1-BE-1 | BE    | Gate bukti + syarat Subtask `done` hanya untuk `approved`; `rejected` wajib catatan | `apps/api/src/modules/releaseDecisions/releaseDecisionService.ts` | AC-1.1–1.4     | Integration test PostgreSQL (E3)          |
| P1-BE-2 | BE    | Release Decision `rejected` tanpa gate bukti; `approved` tetap digate               | `releaseDecisionService.ts`                                       | AC-2.1–2.2     | Integration test (E3)                     |
| P1-FE-1 | FE    | Pastikan form Tolak tersedia saat Subtask `in_progress`; pesan error Indonesia      | `ReleaseAssurancePanel.tsx`                                       | AC-1.1         | Component test (E2) + screenshot 3 ukuran |
| P1-QA-1 | QA    | Test Case + UAT alur tolak                                                          | —                                                                 | AC-1.1, AC-2.1 | Test Result di Preview (E4)               |

WRA P1: requirement 1 · lapisan 1 · data 0 · authorization 0 · contract 0 · ketersinggungan 1 · validasi 2 · eksternal 0 = **5/16**

### Phase 2 — Gate bug semua severity

| Task ID  | Layer         | Pekerjaan                            | File/path perkiraan                                                      | AC         | Bukti selesai                               |
| -------- | ------------- | ------------------------------------ | ------------------------------------------------------------------------ | ---------- | ------------------------------------------- |
| P2-DOC-1 | Docs          | ADR baru + Workflow §7 + RELEASE-001 | `docs/adr/`, `docs/2_WORKFLOW_AND_ROLES.md`, `docs/POLICY_REGISTRY.md`   | —          | `docs:check`                                |
| P2-BE-1  | BE + contract | Kode gate `unverified_bugs`          | `packages/contracts/src/releaseDecision.ts`, `readinessGateEvaluator.ts` | AC-3.1–3.2 | Unit + contract test (E2), integration (E3) |
| P2-FE-1  | FE            | Label Indonesia untuk kode baru      | `apps/web/src/lib/i18n/indonesianCopy.ts`                                | AC-3.3     | Component test (E2)                         |

WRA P2: requirement 0 · lapisan 2 · data 0 · authorization 0 · contract 1 · ketersinggungan 1 · validasi 2 · eksternal 0 = **6/16**

## 3. Risiko lintas phase

| Risiko                                                                                        | Phase  | Mitigasi / rollback                              |
| --------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------ |
| Konflik dengan branch AGY yang menyentuh `taskLifecycle.ts` dan `qaEvidenceCompletionGate.ts` | P1, P2 | Tidak mengubah kedua file itu; rebase sebelum PR |
| Nomor ADR bentrok dengan Task AGY                                                             | P2     | Ambil nomor kosong berikutnya di `main` saat PR  |

## 4. Stop condition

Tidak ada migrasi, perubahan authorization, atau dependency. PR Tier 2 (P2 menyentuh `docs/adr/**`
dan POLICY_REGISTRY) membutuhkan label `owner-approved`.
