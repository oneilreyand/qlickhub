# RELEASE-DEADLOCK-A1-A2 — Authorization Matrix

**Applicable Policy IDs:** DOC-005, RELEASE-002, RELEASE-004

| Action                                            | Owner / Admin | PO          | Developer | QA                                   | Backend enforcement and evidence                                               |
| ------------------------------------------------- | ------------- | ----------- | --------- | ------------------------------------ | ------------------------------------------------------------------------------ |
| Sign-off `rejected`                               | Tidak         | Tidak       | Tidak     | Hanya QA assignee pemilik Test Cycle | `assertCanCreateQaSignOff` + `ownerQaId`; test 403 untuk QA lain dan Developer |
| Release Decision `rejected`                       | Ya            | Ya          | Tidak     | Tidak                                | `assertCanCreateReleaseDecision` (tidak berubah); test 201 PO                  |
| Release Decision `approved` saat gate bukti gagal | Ditolak 409   | Ditolak 409 | —         | —                                    | `assertQaCompletionGate`; test 409                                             |

UI visibility is not authorization.
