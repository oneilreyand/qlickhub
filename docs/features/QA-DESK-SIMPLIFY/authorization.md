# QA-DESK-SIMPLIFY — Authorization Matrix

**Applicable Policy IDs:** DOC-005, QA-001, FLOW-005

| Action                                           | Owner / Admin                                                  | PO     | Developer   | QA                                        | Backend enforcement and evidence                                                                               |
| ------------------------------------------------ | -------------------------------------------------------------- | ------ | ----------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Buat test case langsung `active` (`qaSubtaskId`) | Tidak¹                                                         | Tidak¹ | Tidak       | Hanya assignee subtask QA, scope terbukti | `validateQaDirectScope`; test D1 201 dan 422                                                                   |
| Edit test case `active`                          | Tidak                                                          | Tidak  | Tidak (403) | Hanya dalam scope subtask QA miliknya     | `assertCanUpdateTestCase(..., hasDefinitionChanges, hasQaActivationScope)`; test D5 422 di luar scope, Dev 403 |
| Hapus test case 0 run                            | Ya                                                             | Ya     | Tidak (403) | Hanya pembuat                             | `assertCanDeleteTestCase`; test D2 403, 409 (sudah dijalankan), 204                                            |
| `validate-scope`                                 | Ya                                                             | Ya     | Tidak       | Ya                                        | `requireWorkspaceMember` + `assertCanCreateTestCase`; test 200                                                 |
| `remind-po`                                      | Ya                                                             | Ya     | Tidak       | Ya                                        | `requireWorkspaceMember`; batas 1× per 24 jam per Feature; test 429                                            |
| Baseline otomatis                                | Sistem, dipicu aksi aktor mana pun yang memenuhi syarat konten |        |             |                                           | `ensureAutoBaseline`; test B0 (Brief, Requirement, AC)                                                         |
| Baseline manual                                  | Ya                                                             | Ya     | Tidak       | Tidak                                     | `assertCanEstablishFeatureReadinessBaseline` (tidak berubah); review Dev/QA tidak lagi wajib                   |

¹ Planner tetap membuat test case `draft` lalu mengaktifkannya lewat alur yang ada (ADR-015).

Temuan untuk G2:

- `remind-po` tidak memeriksa apakah QA adalah assignee subtask QA di Feature itu; semua QA di
  workspace bisa memicu pengingat (dibatasi 24 jam per Feature). Rekomendasi: terima, karena dampaknya
  hanya satu notifikasi per hari per Feature.

UI visibility is not authorization.
