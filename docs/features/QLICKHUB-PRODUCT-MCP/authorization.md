# QLICKHUB-PRODUCT-MCP — Authorization

**Status:** Draft
**Applicable Policy IDs:** DOC-005, AUTH-001, AUTH-002, AI-001, AUTH-011

| Action                             | Owner / Admin | PO         | Developer     | QA            | Enforcement dan bukti                                  |
| ---------------------------------- | ------------- | ---------- | ------------- | ------------- | ------------------------------------------------------ |
| Profil sendiri / Workspace sendiri | Ya            | Ya         | Ya            | Ya            | Principal OAuth + membership aktif, AC-1.1/1.2         |
| Folder / Spec yang boleh dibaca    | Ya            | Ya         | Ya            | Ya            | Policy read yang sama dengan aplikasi; isolasi E3      |
| Preview grooming                   | Ya            | Ya         | Tidak pada v1 | Tidak pada v1 | Planner + Workspace policy; AC-2.1                     |
| Publish Feature lengkap            | Ya            | Ya         | Tidak         | Tidak         | Planner pada setiap call, validasi service; AC-1.2/3.1 |
| QA sign-off / release melalui MCP  | Di luar v1    | Di luar v1 | Di luar v1    | Di luar v1    | Tidak ada tool                                         |

Role mengacu membership Workspace; global role dan metadata agent tidak memberi hak tambahan.
Grant OAuth per pengguna tidak boleh memakai satu akun admin bersama. Token audience/scope dan
membership/role terkini diperiksa setiap request; removal/role downgrade/revocation harus diuji.
Delegasi parent Task Dev/QA tidak mencakup perencanaan Subtask dan tidak membuka publish v1.

Konfirmasi langsung di agent adalah pilihan Owner. Backend tidak memverifikasi isi percakapan.
Prompt injection atau konfigurasi client yang auto-approve tidak dapat dicegah hanya dengan
tool annotation; metadata tool harus jujur, dan ADR/SSoT perlu menyatakan batas ini sebelum Build.
Semua payload adalah input tak tepercaya. Lihat [solution.md](solution.md).
