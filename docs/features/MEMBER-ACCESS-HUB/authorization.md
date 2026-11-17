# MEMBER-ACCESS-HUB — Authorization Matrix

**Applicable Policy IDs:** DOC-005, AUTH-001, AUTH-002

| Action                                     | Owner / Admin                     | PO  | Developer | QA  | Backend enforcement and evidence        |
| ------------------------------------------ | --------------------------------- | --- | --------- | --- | --------------------------------------- |
| Buka hub Anggota & Akses                   | ✓ (hanya Workspace yang dikelola) | ✗   | ✗         | ✗   | filter backend; test lintas Workspace   |
| Undang / ubah role / batas waktu           | ✓ di Workspace yang dikelola      | ✗   | ✗         | ✗   | aturan per Workspace yang ada; test 403 |
| Beri role Owner                            | sesuai aturan saat ini            | ✗   | ✗         | ✗   | tidak berubah                           |
| Kirim ulang / batalkan undangan            | ✓                                 | ✗   | ✗         | ✗   | test 403                                |
| Akses Workspace setelah `expires_at` lewat | ✗                                 | ✗   | ✗         | ✗   | middleware keanggotaan; test 401/403    |
