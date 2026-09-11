# [MULTI-WORKSPACE-MEMBER-ACCESS-UX] Multi-Workspace Member Access

**Status:** Active  
**Owner:** Product and Engineering  
**Last reviewed:** 2026-09-11  
**Applicable Policy IDs:** `AUTH-001`, `AUTH-002`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`

## 1. Tujuan dan Pengguna

Owner atau Admin perlu memberikan satu akun akses ke beberapa Workspace tanpa membuat akun
duplikat atau mengulang konfigurasi secara membingungkan. Fitur ini memakai satu akun `User` dan
membership terpisah per Workspace. Alur invitation yang ada tetap melakukan provisioning akun dan
aktivasi password melalui tautan satu kali; persetujuan membership tertunda bukan bagian dari slice
ini.

## 2. Requirement dan Acceptance Criteria

- Satu email dapat ditambahkan ke beberapa Workspace yang dapat dikelola actor.
- Setiap target Workspace dapat menerima role dan spesialisasi Developer yang berbeda.
- Assignment memakai satu transaksi database; target invalid atau unauthorized tidak boleh
  meninggalkan akun atau membership parsial.
- Membership aktif yang sudah ada tidak diubah secara diam-diam dan dilaporkan sebagai
  `already_member`; membership soft-deleted dapat dipulihkan.
- UI memandu pengguna melalui langkah Pengguna → Akses → Periksa, dengan status loading, validasi,
  error, disabled, dan permission-denied yang jelas.
- Owner/Admin dapat mengelola akses; PO tidak memperoleh aksi membership baru.

## 3. Alur Lintas Peran

Owner/Admin membuka Workspace Settings dan memilih `Undang Anggota` atau `Kelola akses Workspace`.
Actor memilih target Workspace yang memang dapat dikelolanya, mengatur role per target, lalu
memeriksa ringkasan. Backend memvalidasi membership actor dan menyimpan batch assignment.

PO, Developer, dan QA tidak memperoleh jalur mutasi membership. Setelah assignment berhasil,
anggota menerima email/notifikasi sesuai perilaku invitation yang telah ada. Jika sebagian target
sudah menjadi anggota, target tersebut tidak diubah dan hasil batch menjelaskannya.

## 4. Data dan Relasi

- `users` tetap menjadi identitas akun global.
- `workspace_members` menyimpan satu baris per pasangan `(workspace_id, user_id)` dengan role lokal
  Workspace dan soft-delete history.
- `workspace_member_specialties` menyimpan spesialisasi Developer per membership.
- `workspace_membership_activity` mencatat `member_added` atau `member_restored` dalam transaksi.
- Migrasi additive `20260911000067-add-member-added-activity-action.cjs` memperluas check
  constraint activity. Tidak ada data lama yang dihapus atau diubah.

## 5. API dan Shared Contract

Endpoint yang dipakai adalah `POST /v1/workspaces/:workspaceId/members` melalui
`apps/api/src/modules/workspaces/workspaceController.ts`.

`AddWorkspaceMemberSchema` mendukung `assignments[]` per Workspace dan tetap menerima bentuk lama
`role`, `specialties`, serta `workspaceIds` untuk kompatibilitas. Response memperluas membership
utama dengan `assignmentResults[]` berstatus `added`, `restored`, atau `already_member`.

Kontrak kanonik berada di `packages/contracts/src/workspace.ts`; frontend memakai response tersebut
melalui `apps/web/src/lib/api/workspaceService.ts`.

## 6. Authorization

- `AUTH-001`: setiap Workspace target harus memiliki membership actor aktif.
- `AUTH-002`: Owner/Admin diverifikasi backend untuk setiap Workspace; filter UI bukan kontrol
  keamanan.
- Role `owner` tidak dapat diberikan melalui endpoint member addition; transfer ownership tetap
  menjadi jalur terpisah.

## 7. UI dan Interaction States

- Route tetap `/workspaces/settings` dan memakai `WorkspaceMembersTable` serta
  `InviteMemberModal` sebagai organisme Atomic Design.
- Wizard tiga langkah: identitas email, pilihan Workspace/role, dan review batch.
- Mode `manage` memuat membership target pada Workspace yang dapat dikelola, menandai membership
  yang sudah ada, dan hanya mengirim assignment baru.
- Desktop memakai daftar kartu yang dapat dikonfigurasi; mobile mempertahankan target sentuh
  minimal 44px dan layout bertumpuk.
- Loading memakai Skeleton saat membership lintas Workspace dimuat; empty menjelaskan tidak ada
  Workspace yang dapat dikelola; invalid email/role/specialty menonaktifkan aksi lanjut; error
  backend dipresentasikan melalui snackbar; role PO tetap read-only.
- Kontrol terkait dikelompokkan dengan label/legend, memiliki nama aksesibel, focus ring Stitch,
  dan tidak bergantung pada warna saja.

## 8. Pengujian dan Evidence

- Contract tests memvalidasi assignment berbeda, duplicate Workspace, specialty Developer, dan
  response batch.
- `workspaceMemberAdditionApiIntegration.test.ts` memvalidasi persistence PostgreSQL untuk role
  berbeda, specialty, audit activity, soft-delete restore, unauthorized access, dan invalid target
  atomicity.
- `InviteMemberModal.test.tsx` memvalidasi wizard tiga langkah, role per Workspace, dan manage mode.
- Full web/API test and build evidence must be recorded in the handoff report after execution; this
  card does not claim results that have not been run.

## 9. Release dan Readiness

Fitur ini tidak mengubah release-readiness calculation atau QA sign-off gate. Release memerlukan
migrasi 67 diterapkan pada environment target sebelum `member_added` activity digunakan. Rollback
kode dapat dilakukan bersama rollback migrasi; migrasi down hanya mengembalikan daftar action
sebelumnya dan tidak menghapus membership records.

## 10. Traceability

Requirement dan acceptance criteria → `packages/contracts/src/workspace.ts` →
`apps/api/src/modules/workspaces/internal/workspaceMembership.ts` →
`apps/web/src/components/ui/organisms/InviteMemberModal.tsx` → contract, PostgreSQL integration,
and component tests → `docs/reports/MULTI_WORKSPACE_MEMBER_ACCESS_UX_2026-09-11.md`.
