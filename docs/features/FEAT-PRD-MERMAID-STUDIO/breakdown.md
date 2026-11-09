# FEAT-PRD-MERMAID-STUDIO — Breakdown

**Status:** Disetujui
**Disetujui:** Owner (Reyand), 2026-11-09, balasan `ok` atas plan dan Approval Window P1–P2.

# Plan — Mermaid Studio untuk PRD

**Task usulan:** FEAT-PRD-MERMAID-STUDIO
**Baseline:** `94134da1` (worktree bersih saat pemeriksaan)
**Tanggal:** 9 November 2026, Asia/Jakarta
**Status plan saat persetujuan:** Disetujui
**Policy IDs:** UI-001–UI-005, DATA-001, CONTRACT-001, TEST-001, DOC-005, DOC-006, SDLC-001, SDLC-002, AI-001, AI-020.

## Stage Card — Tahap 0–3/6, paket keputusan sebelum Build

**Feature:** FEAT-PRD-MERMAID-STUDIO · **Jalur yang diusulkan:** Standar, WRA 6/16 sebelum keputusan format; target ≤5/16 setelah keputusan · **Status:** Disetujui Owner (Reyand), 2026-11-09.

- Problem: kanvas terpotong, posisi tidak ikut ekspor, belum ada edit ulang blok tersimpan.
- Opsi yang direkomendasikan: sumber Mermaid di blok Markdown beridentitas, dengan editor dan preview.
- PRD: tambah, preview, sisipkan, simpan, buka ulang, dan ganti blok yang sama; kompatibel dengan Mermaid/chart lama.
- Breakdown: P1 editor dan kontrak bersama; P2 bukti persistensi, integrasi konsumen, dan regresi.
- Keputusan: setujui format terkelola dan batas implementasi lokal di Approval Window di bawah.

Approval implementasi diterima lewat balasan `ok` sesudah tautan plan dan permintaan persetujuan P1–P2 ditampilkan.

## Fakta terkonfirmasi

1. `PrdDiagramStudioModal` hanya menerima `isOpen`, `onClose`, dan callback snippet. Belum ada sumber existing atau identitas blok.
2. Konsumen di `FeatureSpecPrdEditor`, `TaskDetailProductBriefTab`, dan `TaskDetailOverviewTab` menambahkan hasil ke akhir teks.
3. Feature Spec menyimpan PRD di JSONB, dengan `brief.context` berupa teks maksimal 5.000 karakter. Penyimpanan section memakai versi Spec dan transaksi; versi stale ditolak. Spec `applied` bersifat read-only.
4. Product Brief menyimpan `contentMarkdown` maksimal 100.000 karakter dalam versi dokumen dan membuat activity. Upsert saat ini belum memeriksa expected version dari caller; jangan mengklaim perlindungan optimistic concurrency pada jalur itu.
5. Deskripsi task dibatasi 5.000 karakter. Tidak mengubah batas field secara diam-diam.
6. Viewer `FormattedText` sudah mengenali blok `mermaid` dan `chart`. Mermaid dimuat lewat CDN major 11; tidak ada dependency Mermaid lokal pada package frontend.
7. Product MCP masih Draft. Rencana v1-nya preview/publish Feature, bukan CRUD diagram yang sudah tersedia.
8. Audit terdahulu: 43/43 tes frontend terarah lulus dengan warning React act; browser komponen terisolasi membuktikan node terpotong dan ekspor tidak mengikuti posisi.
9. Binari PostgreSQL 16 tersedia (psql, initdb, pg_ctl). `pg_isready -h 127.0.0.1 -p 5432` pada preflight ini exit 2/no response; belum ada bukti database test aktif. Tidak membaca atau menyalin nilai secret.
10. Referensi `@RTK.md` belum ditemukan pada repository dan lokasi induk umum yang diperiksa.

## Decision Snapshot

| Opsi                                           | Pro                                                                       | Kontra                                                                                     | Rekomendasi                    |
| ---------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------ |
| Blok Mermaid biasa                             | Perubahan kecil; salin-tempel langsung                                    | Sulit menargetkan blok yang sama secara stabil dari MCP                                    | Hanya kompatibilitas existing  |
| Blok Mermaid beridentitas di Markdown existing | Sumber tunggal; cocok lintas editor; tidak memerlukan tabel atau backfill | Parser/serializer metadata harus ketat; tetap mengikuti batas panjang field                | Pilih untuk versi awal         |
| Entitas/tabel diagram terpisah                 | CRUD dan query independen                                                 | Relasi, migrasi, endpoint, lifecycle dan audit baru; terlalu besar untuk perbaikan pertama | Tunda sampai use case menuntut |
| Pertahankan Studio sekarang                    | Tidak ada perubahan                                                       | Masalah audit tetap ada                                                                    | Tidak dipilih                  |

Blok terkelola adalah kontrak baru yang diusulkan, bukan fakta implementasi yang sudah ada. Tidak ada diagram table, schema migration, atau business rule backend baru yang diperlukan untuk menyimpan string tersebut. Jika inspeksi implementasi membuktikan sebaliknya, hentikan dan revisi scope.

## Kontrak yang diusulkan

- Descriptor bersama: `schemaVersion: 1`, `id: UUID`, `title: 1–200 karakter`, `revision: integer ≥1`, `source: Mermaid non-kosong`.
- Descriptor adalah hasil parse dari Markdown, bukan salinan canonical kedua. Source Mermaid disimpan sekali di fenced block existing.
- Representasi managed: marker pembuka HTML comment `qlick-diagram:v1` dengan metadata JSON id/title/revision, fenced block Mermaid, lalu marker penutup `/qlick-diagram`. Serializer meng-escape isi JSON yang bisa menutup comment. Parser tidak menggunakan regex tunggal yang dapat melintasi fenced code lain.
- Bentuk konseptual: `metadata pembuka → fenced mermaid source → metadata penutup`.
- Menyunting blok mempertahankan ID dan menaikkan revision jika source/judul berubah. No-op tidak menghasilkan duplikasi atau revision baru.
- `revision` adalah revisi isi blok, berbeda dari versi Spec/dokumen. Perlindungan write concurrent mengikuti API parent yang memang tersedia; metadata revision sendiri bukan lock backend.
- Blok Mermaid lama tetap dirender dan dapat dipilih untuk diedit. ID baru diberikan ketika pengguna menyimpan edit pertamanya, tanpa backfill massal.
- Blok `chart` lama tetap dapat dibaca. Builder grafik tidak menjadi bagian editor Mermaid baru; kontrak/grafik KPI lanjutan menjadi pekerjaan terpisah.
- Semua operasi mempertahankan teks dan blok lain di luar rentang yang ditargetkan. Duplikasi ID atau marker tidak lengkap ditampilkan sebagai masalah yang dapat diperbaiki, tanpa overwrite otomatis.
- Panjang hasil serialisasi diperiksa terhadap batas field host: 5.000 atau 100.000 karakter yang sudah ada. Tampilkan sisa ruang/error; jangan memotong teks.
- Preview memvalidasi sintaks melalui engine frontend sebelum sisipkan. Validasi contract di shared/backend mencakup metadata, struktur dan limit; validasi sintaks Mermaid server-side tidak diklaim tersedia pada fase ini.

## Alur dan UI yang diusulkan

1. Aksi utama konteks dokumen: **Tambah Diagram**. Untuk diagram existing: **Edit Diagram**.
2. Editor berisi judul, input Mermaid, dan preview. Tombol **Sisipkan ke PRD** untuk baru; **Perbarui Diagram** untuk existing.
3. Desktop: input dan preview dua kolom dengan ruang cukup; ponsel/tablet: susun vertikal atau switch Kode/Preview dengan aksi tetap dapat dijangkau.
4. State: kosong, loading engine, sintaks salah, engine/network gagal dengan retry, siap preview, batas karakter, stale target, disabled/read-only. Nama field dan tombol aksesibel serta target sentuh mengikuti atom.
5. Preview memakai token Inter/tema existing, kontrol fit/zoom yang sudah sesuai; jangan menampilkan palette node atau inspector lama pada alur baru.
6. Sisipkan/perbarui mengubah draft lokal melalui callback existing. UI menyatakan bahwa penyimpanan dokumen tetap diperlukan. Tidak menyatakan data tersimpan sebelum respons backend.
7. Render source dengan konfigurasi aman (`securityLevel: strict`), tanpa eksekusi HTML/interaksi bebas dari input. Tetap memakai mekanisme dependency yang ada; penggantian dependency/CDN memerlukan scope tersendiri bila ternyata diperlukan.

## Acceptance Criteria → evidence

| AC     | Hasil yang harus terbukti                                                                             | Bukti objektif minimum                                                                        |
| ------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| MMD-01 | Tempel Mermaid, lihat preview, sisipkan tanpa menggambar node                                         | Component test + browser E4                                                                   |
| MMD-02 | Edit diagram yang dipilih mengganti blok itu, ID stabil, blok lain identik                            | Parser/serializer contract tests + component interaction E2                                   |
| MMD-03 | Simpan → baca ulang → reload → edit diagram yang sama                                                 | API terautentikasi + PostgreSQL disposable E3, browser terhubung E4 bila environment tersedia |
| MMD-04 | Spec versi stale ditolak; applied read-only; Workspace/role tetap dipatuhi                            | API integration 409/403/cross-Workspace, persisted rows tidak berubah E3                      |
| MMD-05 | Mermaid lama/chart lama tetap terbaca, metadata tidak tampil mentah                                   | Contract/component regression dan read-back E2/E3                                             |
| MMD-06 | Input kosong/salah, engine gagal, limit field dan target edit berubah ditangani tanpa kehilangan teks | Component/browser negatif E2/E4                                                               |
| MMD-07 | Keyboard, focus, label, tombol, preview pada phone/tablet/desktop Light/Dark                          | Browser 390×844, 820×1180, 1440×1000 E4                                                       |
| MMD-08 | Dokumen, Feature Card, TODO, laporan dan quality review sesuai hasil aktual                           | docs:check, docs:completeness, validate + inspeksi E1/E2                                      |

Pelaksana: Codex pada branch non-main. Verifikasi: pemeriksaan executable dan review terpisah terhadap evidence primer; hasil pelaksana sendiri tidak dinyatakan sebagai G5 Accepted. Jika verifier/CI belum tersedia, laporkan gap dan status menunggu verifikasi.

## WRA dan capability

Skor: kejelasan 1 (format ini menunggu keputusan), lapisan 1 (UI + shared contract; backend persistence existing diuji), data/migrasi 0 (tidak ada perubahan struktur/backfill), authorization 0 (role existing), shared contract 1 (additive), ketersinggungan 1 (beberapa editor/viewer), validasi 2 (PostgreSQL + browser), eksternal 0 (tidak memanggil provider AI atau layanan akun baru). Total 6/16.

**Hasil:** Ready after split untuk perencanaan implementasi; belum menyatakan E3 atau runtime aplikasi siap. P1 mempunyai jalur evidence static/component/browser yang sudah tersedia. P2 harus membuktikan PostgreSQL disposable dari canonical migrations; jika startup/koneksi tidak tersedia, P2 Blocked dan tidak diganti dengan mock Sequelize.

## Breakdown dan Change Impact Map

### P1 — Editor Mermaid, kontrak blok, dan integrasi UI

- Implementasi descriptor/parser/serializer bersama dan regression test batas fenced block, escaping, ID duplikat, serta preserve-outside-range.
- Ganti isi Studio dengan judul/source/preview; gunakan atom dan Modal existing yang ukurannya sesuai. Bersihkan state/handler drag/drop dan builder grafik yang tidak lagi digunakan, setelah pemeriksaan consumers.
- Integrasikan tambah/edit pada Feature Spec PRD dan Product Brief. Konsumen Overview tetap memakai shared editor dengan target dokumennya sendiri; jangan menyebut edit description sebagai edit PRD.
- Renderer mengenali metadata terkelola, meneruskan judul, dan mendukung aksi edit hanya melalui callback host yang berizin.
- Tambahkan showcase terisolasi di Component Gallery; fixture gallery berlabel dan tidak dipakai sebagai data produksi.
- P1 menguji UI dan representasi; belum ditandai seluruh fitur selesai sebelum P2.

### P2 — Persistensi dan review lintas konsumen

- Buat cluster/database PostgreSQL disposable terisolasi di temporary directory, jalankan canonical migrations dan catat migration status.
- Tambah API integration untuk Spec save/get/apply-to-Brief dan Brief save/get: source, ID, judul, revision, Workspace, role, audit dan konten sekitar tetap benar.
- Gunakan guard versi Spec existing untuk stale-write test. Product Brief tetap mengikuti kemampuan upsert existing; optimistic concurrency untuk seluruh Brief bukan janji fase ini. MCP pertama harus menargetkan kontrak Spec yang memiliki version guard, bukan langsung overwrite Brief.
- Jika preservation marker memerlukan penyesuaian kecil pada service existing, lakukan hanya pada jalur tersebut; jangan membuat endpoint atau policy alternatif.
- Jalankan browser terhubung backend untuk perjalanan yang environment-nya tersedia, serta regresi semua entrypoint Studio.
- Quality review eksplisit: reuse, duplikasi/perilaku overlap, kode usang, cakupan tes, dan dokumentasi; catat temuan atau none found dengan pencariannya.

| Surface              | Dampak                                                             | Berkas kandidat                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared contract      | Descriptor blok + parse/replace/export, API request shape existing | `packages/contracts/src/prdDiagram.ts`, `index.ts`, tests terkait                                                                               |
| Studio               | Input Mermaid + preview mengganti kanvas                           | `PrdDiagramStudioModal.tsx` dan tests                                                                                                           |
| Render               | Metadata tidak bocor, judul dan edit callback                      | `FormattedText.tsx`, `MermaidViewer.tsx`, tests                                                                                                 |
| Consumers            | Tambah/edit mengganti rentang yang sama                            | `FeatureSpecPrdEditor.tsx`, `TaskDetailProductBriefTab.tsx`, `TaskDetailOverviewTab.tsx`, `FeatureStagePanels.tsx`, `RichTextEditor.tsx`, tests |
| Gallery              | Contoh interaksi dan state                                         | `ComponentGalleryPage.tsx`, tests                                                                                                               |
| Persistence evidence | Write/read-back, guards dan audit existing                         | tes modules/featureSpecs, modules/qaDocuments; service terkait hanya bila preservation memerlukan                                               |
| Docs                 | Feature stages, kontrak, UX, report dan status                     | `docs/features/FEAT-PRD-MERMAID-STUDIO/**`, katalog/index terkait, UI SSoT, `TODO.md`, `docs/reports/FEAT_PRD_MERMAID_STUDIO_*.md`              |

**Authorization:** Owner/Admin/PO menulis sesuai policy yang ada; member lain hanya membaca. Tidak mengubah policies atau membuka hak baru.

**Migration risk:** tidak ada migrasi/backfill yang direncanakan. Data lama tetap dibaca dan baru dibungkus ketika pengguna mengedit. Parser gagal secara terlihat dan mempertahankan teks asli.

**Policy impact:** perubahan kontrak presentasi/data dokumen, bukan aktivasi MCP/AI baru, release gate baru, atau perubahan role. ADR baru hanya diperlukan jika hasil analisis mengharuskan perubahan policy/arsitektur yang tidak tercakup; itu stop condition, bukan asumsi izin.

## Perintah verifikasi yang direncanakan

- `npm --prefix packages/contracts run test` dan build kontrak.
- `npm --prefix apps/web run test -- PrdDiagramStudioModal.test.tsx FeatureSpecPrdEditor.test.tsx TaskDetailProductBriefTab.test.tsx RichTextEditor.test.tsx FormattedText.test.tsx` (tambahkan nama tes consumer baru sesuai implementasi).
- `npm --prefix apps/api run build`, lalu jalankan Node integration tests terarah dari build menggunakan `NODE_ENV=test` dan koneksi disposable melalui environment, tanpa mencetak connection string.
- Jalankan canonical migrations dan status hanya terhadap database disposable yang baru dibuat, bukan database default atau Production.
- `npm run docs:check`, `npm run docs:completeness`, `npm run validate`, dan `npm --prefix apps/web run build`.
- Browser pada ukuran/tema di AC; rekam route, state, hasil, screenshot dan batas bukti.
- Perintah di bagian ini belum dijalankan sebagai evidence implementasi; jangan menyalin hasil audit lama sebagai hasil perubahan baru.

## Approval Window yang diusulkan

- **Identitas/baseline:** FEAT-PRD-MERMAID-STUDIO @ `94134da1`.
- **Tujuan/AC:** MMD-01–08 di atas, P1 lalu P2.
- **Paths dibatasi:** `packages/contracts/src/**` untuk descriptor/export/tests terkait; `apps/web/src/components/ui/{atoms,molecules,organisms/taskDetail}/**` hanya file terkait pada map; `apps/web/src/pages/ComponentGalleryPage.tsx` dan tests; `apps/api/src/modules/{featureSpecs,qaDocuments}/**` hanya preservation/evidence; Feature docs, UI SSoT, katalog/index, TODO dan laporan yang disebut pada map. Tidak mengubah baseline quality atau enforcement agar pemeriksaan lolos.
- **Urutan:** verifikasi baseline/status → buat branch `codex/prd-mermaid-studio` → scaffold dengan `npm run sdlc:new -- feature FEAT-PRD-MERMAID-STUDIO` dan catat approval aktual → claim satu TODO → P1 → P2 → checks dan same-scope fixes → quality review/evidence → laporan hasil lokal.
- **Efek lokal yang diizinkan setelah approval:** perubahan file scoped, startup browser/server lokal, cluster/database test disposable baru dan cleanup miliknya, build/test artifacts dan commit lokal pada branch tersebut.
- **Batas:** tidak mencakup implementasi MCP/OAuth, provider AI, package dependency changes, schema migration, perubahan RBAC/authorization, perubahan scope Brief approved/release gates, push/PR/merge, atau deployment/data Production. Langkah publikasi ditetapkan setelah hasil lokal reviewable.
- **Expiry:** akhir sesi implementasi ini atau 16 November 2026 23:59 WIB, mana yang lebih dahulu; tidak memberi izin tanpa batas untuk baseline berbeda.
- **Recovery:** batalkan patch/commit scoped pada branch tanpa menyentuh perubahan lain; hapus hanya database/cluster disposable yang dibuat untuk task; tidak menulis ulang data lama.
- **Stop:** perubahan user/agent bertabrakan; baseline berubah; perlu path/dependency/policy/migration baru; evidence PostgreSQL tidak tersedia; data legacy tidak bisa dipertahankan; atau keputusan produk material baru diperlukan.
- **Tier:** scope runtime/docs yang tercantum saat ini tidak cocok Tier 2 patterns. Jika perlu ADR/SSoT Architecture/policy/dependency/migration, klasifikasi berubah ke Tier 2 dan memerlukan scope approval baru. PR belum dibuat; tier final wajib dihitung dari diff aktual. Merge kelak hanya melalui tiered auto-merge; agent tidak memasang label Owner.

## Keputusan yang disetujui

Owner menyetujui opsi blok Mermaid beridentitas di Markdown existing, UI Mermaid + preview, kompatibilitas data lama, dan Approval Window implementasi lokal P1–P2 di atas. Jika ingin diagram sebagai tabel terpisah atau sekaligus implementasi MCP, itu revisi scope dan kontraknya sebelum Build.

## Realisasi integrasi

`FeatureSpecDraftPanel.tsx` memberi key Spec pada child editor agar draft modal tidak terbawa saat pindah Feature. Modal pada Brief/Overview juga diikat ke task dan ditutup saat task berubah. Semua perubahan tetap di direktori konsumen taskDetail dalam scope; tidak ada kontrak API atau policy baru.
