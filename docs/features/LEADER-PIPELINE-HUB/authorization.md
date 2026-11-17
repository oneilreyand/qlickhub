# LEADER-PIPELINE-HUB — Authorization Matrix

**Applicable Policy IDs:** DOC-005, AUTH-001, AUTH-002

| Action                 | Owner / Admin               | PO  | Developer | QA  | Backend enforcement and evidence                    |
| ---------------------- | --------------------------- | --- | --------- | --- | --------------------------------------------------- |
| Baca ringkasan Leader  | ✓ (Workspace yang dipimpin) | ✗   | ✗         | ✗   | aturan Leader yang ada; test 403 + filter Workspace |
| Ping PIC               | ✓                           | ✗   | ✗         | ✗   | role check + batas 1 jam; test                      |
| Reassign / ubah jadwal | sesuai endpoint yang ada    | —   | —         | —   | tidak berubah                                       |
