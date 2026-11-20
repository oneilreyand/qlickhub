# QLICKHUB-PRODUCT-MCP — Authorization

**Status:** Draft
**Applicable Policy IDs:** DOC-005, AUTH-001, AUTH-002, AUTH-011, FLOW-007, AI-001, AI-013

Prinsip: tool MCP tidak pernah memberi hak melebihi REST/UI. Role mengacu membership Workspace;
global role, nama agent, dan metadata agent tidak memberi hak tambahan. Token audience/scope dan
membership/role terkini diperiksa setiap request; removal, role downgrade, dan revocation harus
diuji. Grant OAuth per pengguna, tidak memakai satu akun admin bersama. Kolom "Sumber" menunjuk
pemeriksaan route dan service di `origin/main` @ `e710d525`; aturan service lebih sempit daripada
route dan tetap berlaku.

## Matriks tool × role

| Tool / kelompok                                      | Owner/Admin                   | PO              | Developer                | QA                              | Sumber pemeriksaan                                                         |
| ---------------------------------------------------- | ----------------------------- | --------------- | ------------------------ | ------------------------------- | -------------------------------------------------------------------------- |
| Profil, Workspace, antrean, laporan saya             | Ya                            | Ya              | Ya                       | Ya                              | Principal OAuth + membership; `my-work-queue`, `/me/work-report`           |
| Baca Feature, subtask, AC, aktivitas                 | Ya                            | Ya              | Task terkait saja        | Task terkait saja               | `taskAccess.ts` (ADR-043): assignee, pelapor, atau subtask di Feature sama |
| Komentar                                             | Ya                            | Ya              | Ya                       | Ya                              | `POST comments`; edit/hapus hanya milik sendiri dan tidak lewat MCP        |
| Blocker: buka                                        | Ya                            | Ya              | Task terkait saja        | Task terkait saja               | `requireTaskReadAccess` + PIC member aktif                                 |
| Blocker: tutup                                       | Ya                            | Ya              | Pembuka atau PIC         | Pembuka atau PIC                | `taskBlockers.ts`                                                          |
| Kandidat assignee, cek bentrok                       | Ya                            | Ya              | Tidak                    | Tidak                           | `assignment-preview` Owner/Admin/PO; redaksi AUTH-011                      |
| Preview / publish grooming                           | Ya                            | Ya              | Tidak                    | Tidak                           | Feature Spec policy; Planner setiap call                                   |
| Release / reassign subtask                           | Ya                            | Ya              | Tidak                    | Tidak                           | `taskAssignment.ts`                                                        |
| Claim subtask open                                   | Tidak                         | Tidak           | Spesialisasi cocok       | Area QA                         | `claimTaskImpl` (ADR-038); 409 bila sudah di-claim                         |
| Ubah status subtask                                  | Ya, kecuali status subtask QA | Sama            | Assignee; tanpa Done     | Executor/reviewer sesuai aturan | `assertCanMutateTask` di `taskPolicy.ts`                                   |
| Centang AC subtask                                   | Penanggung jawab              | Tidak           | Penanggung jawab         | Tidak                           | `taskAcceptanceCheckService.ts`                                            |
| Review readiness                                     | Tidak                         | Tidak           | Ya                       | Ya                              | `readiness/reviews` dev, qa                                                |
| Bug: resolusi                                        | Tidak                         | Tidak           | Bug yang di-assign       | Tidak                           | `resolution-events` dev; `bugPolicy.ts`                                    |
| Bug: buat, retest, reopen                            | Ya (buat, reopen)             | Tidak           | Tidak (lihat BUG-INTAKE) | Ya                              | `assertCanCreateBug` Owner/Admin/QA                                        |
| Test case, run, hasil, evidence                      | Tidak                         | Tidak           | Tidak                    | Ya                              | `testManagementRoutes.ts` qa                                               |
| Ringkasan Leader                                     | Ya                            | Tidak           | Tidak                    | Tidak                           | `leaderPipeline.ts`, `leaderService.ts`: Owner/Admin                       |
| Beban poin/kapasitas orang lain                      | Ya (Leader)                   | Tidak (K9 = a)  | Tidak                    | Tidak                           | `personalCapacity.ts`: pemilik akun atau Owner/Admin Workspace sama        |
| Sign-off, rilis, governance, delete, anggota, deploy | Tidak lewat MCP               | Tidak lewat MCP | Tidak lewat MCP          | Tidak lewat MCP                 | K6; tetap di UI                                                            |

Tool tiket Support belum ada karena role `support` masih menunggu BUG-INTAKE-SLA D3.

## Visibilitas tool (K4)

`tools/list` menampilkan gabungan tool yang diizinkan oleh role user di seluruh Workspace aktifnya.
Setiap call tetap diperiksa terhadap role di Workspace yang diminta. Perubahan role mengirim
`tools/list_changed`; client yang tidak mendukungnya tetap aman karena pemeriksaan per call.

## Konfirmasi write dan batas pembuktian (K3)

Setiap write menampilkan ringkasan dan menunggu konfirmasi eksplisit user di agent. Backend tidak
memverifikasi isi percakapan. Prompt injection atau client yang auto-approve tidak dapat dicegah
hanya dengan tool annotation; metadata tool harus jujur (read-only vs mutasi), dan ADR/SSoT perlu
menyatakan batas ini sebelum Build. Semua payload adalah input tak tepercaya. Setiap write mencatat
actor agent, user pemilik grant, dan channel `mcp` (ADR-036). Lihat [solution.md](solution.md).
