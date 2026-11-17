# MY-WORK-REPORT — Authorization Matrix

**Applicable Policy IDs:** DOC-005, AUTH-001, AUTH-002, AUTH-011, AUTH-013

| Action                                      | Owner / Admin                          | PO   | Developer | QA   | Backend enforcement and evidence                       |
| ------------------------------------------- | -------------------------------------- | ---- | --------- | ---- | ------------------------------------------------------ |
| Baca Laporan Saya                           | ✓ (milik sendiri)                      | ✓    | ✓         | ✓    | `actor` dari sesi; tidak ada parameter user lain; test |
| Lihat detail task terkait di Workspace lain | bila boleh baca task itu               | sama | sama      | sama | `AUTH-013` + redaksi `AUTH-011`; test redaksi          |
| Buat/hapus relasi                           | ✓ (Planner di sumber + anggota tujuan) | ✓    | ✗         | ✗    | service check; test 403                                |
