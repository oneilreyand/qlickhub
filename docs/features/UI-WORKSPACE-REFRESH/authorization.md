# UI-WORKSPACE-REFRESH — Authorization Matrix

**Applicable Policy IDs:** AUTH-001, AUTH-002, FLOW-005, DOC-005

| Action                                      | Owner / Admin                    | PO                               | Developer                          | QA                                 | Backend enforcement and evidence                                                            |
| ------------------------------------------- | -------------------------------- | -------------------------------- | ---------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------- |
| Read Task Hub, detail, Kanban v1            | Sesuai membership                | Sesuai membership                | Sesuai membership/assignment scope | Sesuai membership/assignment scope | Existing Workspace auth/task query; authenticated readback E3 dan role UAT E4 direncanakan. |
| Read Tugas Saya                             | Queue per actor                  | Queue per actor                  | Queue per actor                    | Queue per actor                    | Existing work-queue policy dan `nextAction.code`; UI hanya memetakan target route.          |
| Read Laporan                                | Sesuai policy laporan            | Sesuai policy laporan            | Sesuai policy laporan              | Sesuai policy laporan              | Existing authenticated capacity interface.                                                  |
| Create, update, status move, release action | Tidak ditambah oleh Feature ini. | Tidak ditambah oleh Feature ini. | Tidak ditambah oleh Feature ini.   | Tidak ditambah oleh Feature ini.   | Tidak ada mutation baru; backend tetap menegakkan action yang telah ada.                    |

UI visibility is not authorization. Ketika action sudah ada pada drawer/desk, visibilitasnya tetap
mengikuti response/policy yang ada; Feature ini tidak memperluas hak apa pun. Evidence deny/allow
tetap menggunakan integration test policy existing ketika Phase UI menyentuh state terkait.
