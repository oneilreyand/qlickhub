# Laporan Penyusunan Rencana SDLC, Kualitas Tim, dan Paket Rilis

## Task

SDLC-QUALITY-RELEASE-PLAN — dokumentasikan pembahasan pengguna menjadi rencana implementasi bertahap.

## Outcome

Disusun rencana Draft P0–P6 untuk kesiapan Requirement, putaran QA–Dev, scope bukti dan retest,
paket rilis/deployment, analitik kualitas Product/Dev/QA, serta pilot lintas peran. Keputusan
K1–K10 ditandai belum disetujui. Tidak ada implementasi, ADR yang disahkan, atau operasi Production.

## Source of truth and impact

- **Applicable SSoT:** [Knowledge Map](../0_PRODUCT_KNOWLEDGE_MAP.md),
  [Architecture](../1_ARCHITECTURE.md), [Workflow](../2_WORKFLOW_AND_ROLES.md),
  [UI](../3_UI_ATOMIC_DESIGN_SYSTEM.md), [Agent Guidelines](../4_AGENT_DEV_GUIDELINES.md),
  [Deployment](../DEPLOYMENT_AND_ENVIRONMENTS.md), [Policy Registry](../POLICY_REGISTRY.md).
- **Policy IDs:** `DOMAIN-002`, `DOMAIN-003`, `DOMAIN-004`, `AUTH-002`, `FLOW-002`, `QA-002`,
  `QA-003`, `QA-004`, `RELEASE-001`, `RELEASE-002`, `DATA-002`, `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** None pada pekerjaan ini; usulan persistence/contracts dicatat per tahap.
- **Authorization impact:** None; hak baru dan akses analitik individu menunggu keputusan eksplisit.
- **Migration risk:** None dieksekusi; strategi additive, backfill berprovenance, legacy, recovery dan
  risiko deployment dibahas dalam rencana. Tidak membaca nilai env atau menghubungi database.

## Changed files

- [Rencana](../plans/SDLC_QUALITY_AND_RELEASE_PLAN.md) — fakta, keputusan, dependency, AC, rumus,
  dampak, UI, migrasi, validation dan rollout.
- [Feature Card Draft](../features/SDLC_QUALITY_AND_RELEASE.md) — penghubung template lintas lapisan.
- [TODO](../../TODO.md) — satu item dokumentasi; tidak mengklaim implementasi selesai.
- Laporan ini — bukti pemeriksaan dan batas pekerjaan.

## Validation

- Pemeriksaan statis: kontrak Requirement/Test Run/Bug/Release, audit status Task, readiness service,
  laporan Task, Component Gallery, konfigurasi lokasi migrasi, SSoT dan backlog terkait.
- `npm run docs:check` — pemeriksaan pertama: unit checker 5 pass/0 fail/0 skipped, governance
  gagal dengan 1 error karena parser menganggap nomor ADR pada Feature Card sebagai Policy ID.
  Tautan card diarahkan ke Workflow kanonikal yang menjelaskan batas yang sama; checker/test tidak
  diubah. Pemeriksaan ulang: 5 pass/0 fail/0 skipped dan governance passed, tanpa warning.
- Pemeriksaan tautan lokal tambahan dengan Node pada tiga dokumen baru — 48 tautan diperiksa,
  0 broken. Pemeriksaan tambahan diperlukan karena docs check tidak memeriksa tautan plan/report.
- `git diff --check` — pass, tidak ada error whitespace pada diff tracked.
- Tests aplikasi, build, PostgreSQL integration, migrasi dan UAT tidak dijalankan: perubahan hanya
  dokumentasi, bukan bukti bahwa workflow usulan sudah berfungsi.
- Database environment: tidak ada koneksi database; status Production terbaru tidak diverifikasi.

Perintah pemeriksaan tautan tambahan yang dijalankan dari root repository:

```bash
node --input-type=module -e 'import fs from "node:fs"; import path from "node:path"; import {extractMarkdownLinks} from "./scripts/checkDocs.mjs"; const files=["docs/plans/SDLC_QUALITY_AND_RELEASE_PLAN.md","docs/features/SDLC_QUALITY_AND_RELEASE.md","docs/reports/SDLC_QUALITY_RELEASE_PLAN_2026-09-12.md"]; let checked=0; const broken=[]; for (const file of files) {for(const raw of extractMarkdownLinks(fs.readFileSync(file,"utf8"))) {if (/^[a-z][a-z\d+.-]*:/i.test(raw)||raw.startsWith("#")) continue; checked++; const target=decodeURIComponent(raw.split("#")[0]); if (!fs.existsSync(path.resolve(path.dirname(file),target))) broken.push({file,target});}} console.log(JSON.stringify({files:files.length,checked,broken},null,2)); if(broken.length) process.exitCode=1;'
```

## Risks or follow-up

- Selesaikan K1–K10 sesuai tahap sebelum mengubah kebijakan; rekonsiliasi lokasi migrasi dan
  label lifecycle pada rencana §2. SSoT aktif tidak diubah diam-diam.
- Riwayat lama mungkin tidak memiliki scope/penyebab yang memadai. Jangan mengarang backfill
  atau menilai individu berdasarkan data ambigu.
- Tahap berikutnya P0 setelah persetujuan; P1–P6 belum dimulai dan belum mendapat tanggal komitmen.

## TODO update

- SDLC-QUALITY-RELEASE-PLAN → Done untuk deliverable dokumentasi yang sudah diverifikasi.
- Implementasi P0–P6 belum dimulai; status Draft keputusan tidak disamakan dengan implementasi Done.
