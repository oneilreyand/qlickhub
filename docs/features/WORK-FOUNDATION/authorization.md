# WORK-FOUNDATION — Authorization Matrix

**Applicable Policy IDs:** DOC-005, AUTH-001, AUTH-002, AUTH-013, FLOW-002

| Action                                | Owner / Admin                             | PO  | Developer            | QA                   | Backend enforcement and evidence              |
| ------------------------------------- | ----------------------------------------- | --- | -------------------- | -------------------- | --------------------------------------------- |
| Baca kalender Workspace               | ✓                                         | ✓   | ✓                    | ✓                    | `requireWorkspaceMember`; test 200            |
| Ubah kalender/libur/kapasitas default | ✓                                         | ✗   | ✗                    | ✗                    | role check di route; test 200/403             |
| Isi/ubah effort Subtask               | ✓                                         | ✓   | ✗                    | ✗                    | aturan field perencanaan `FLOW-002`; test 403 |
| Ubah kapasitas & cuti sendiri         | ✓                                         | ✓   | ✓                    | ✓                    | `actor = userId`; test 200                    |
| Ubah kapasitas & cuti orang lain      | ✓ bila berbagi Workspace dengan orang itu | ✗   | ✗                    | ✗                    | cek keanggotaan bersama; test 403             |
| Baca hambatan task                    | sesuai `AUTH-013`                         | ✓   | bila boleh baca task | bila boleh baca task | `requireTaskReadAccess`; test 403             |
| Buka hambatan                         | ✓                                         | ✓   | bila boleh baca task | bila boleh baca task | sama + PIC harus anggota aktif                |
| Tutup hambatan                        | ✓                                         | ✓   | pembuka atau PIC     | pembuka atau PIC     | service check; test 403                       |

UI visibility bukan otorisasi; setiap baris punya integration test allowed dan denied.
