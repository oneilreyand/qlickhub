# QLICKHUB-PRODUCT-MCP — Data, API, Shared Contracts

**Status:** Draft
**Applicable Policy IDs:** DOC-005, CONTRACT-001, DATA-001, DATA-002, DATA-006, DOMAIN-002, DOMAIN-003, DOMAIN-004

## Implementasi yang dapat dipakai ulang

Kontrak kanonis: [featureSpec.ts](../../../packages/contracts/src/featureSpec.ts).
Service: [featureSpecService.ts](../../../apps/api/src/modules/featureSpecs/featureSpecService.ts).
Policy: [featureSpecPolicy.ts](../../../apps/api/src/policies/featureSpecPolicy.ts).
REST sekarang memakai /v1/workspaces/:workspaceId/feature-specs serta save section dan Apply.
Lihat [kontrak Feature sumber](../SIMPLE-UI-DELIVERY-FLOW/contracts.md).

Create saat ini langsung membuat root Task + Spec; preview v1 tidak boleh memanggil create.
Optimistic version melindungi revisi Spec tersimpan. Publish baru belum memiliki versi server:
gunakan digest payload + idempotency key; jangan mengklaim version check berlaku pada record
yang belum ada. Apply saat ini hanya idempoten untuk Spec yang sama.

## Katalog tool usulan v1

| Tool                    | Sifat       | Input/output konseptual                                                    |
| ----------------------- | ----------- | -------------------------------------------------------------------------- |
| get_my_profile          | Read        | Identitas dari credential tervalidasi; bukan userId yang dikirim agent     |
| list_my_workspaces      | Read        | Workspace dari membership aktif                                            |
| list_feature_folders    | Read        | Folder valid pada Workspace yang diizinkan                                 |
| get_feature_spec        | Read        | Spec tersimpan yang boleh dibaca                                           |
| preview_groomed_feature | Read domain | Draft → completeness, validasi assignment/jadwal, ringkasan                |
| publish_feature         | Write       | Payload grooming final + Workspace/Folder + key → receipt dan link Feature |

Nama/skema masih usulan; kontrak executable baru ditempatkan di packages/contracts saat Build.
V1 direkomendasikan satu publish; create/save/Apply granular dari plan awal adalah alternatif B,
bukan tool tambahan yang otomatis masuk scope.

## Persistensi, relasi, retry

Publish harus membungkus root, Spec/version, Brief, Requirement/AC, Subtask, link, activity, dan
receipt idempotensi dalam satu transaksi PostgreSQL. Reuse primitive service/policy; ORM hanya
di backend. Unique constraint menegakkan key + pemilik/scope yang dipilih; detail scope/retention
key diselesaikan pada G2. Concurrent retry dan failure setelah commit tetapi sebelum respons
harus dapat mengambil receipt yang sama.

OAuth grants/token metadata kemungkinan memerlukan persistence additive, tergantung provider.
FK user, pencabutan akses, expiry, hash/enkripsi secret, ownership, indexes, lifecycle delete, dan
cardinality harus ditentukan sebelum migration. Agent/client identity tidak boleh diambil dari
payload tanpa verifikasi. Tidak ada tabel Feature baru.

## Error dan operasi

401 token invalid; 403 tidak berwenang; 400 invalid dengan field paths; 409 key/payload konflik
atau versi stale pada resource tersimpan; 429 rate limit; failure sementara → error tersanitasi.
Pemetaan ke MCP result/error harus diuji dan tidak menyatakan mutasi sukses saat transaksi gagal.
Endpoint target: HTTPS Streamable HTTP /mcp; URL final belum ditetapkan.
