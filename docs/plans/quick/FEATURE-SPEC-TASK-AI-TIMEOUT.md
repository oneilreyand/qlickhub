# QUICK — FEATURE-SPEC-TASK-AI-TIMEOUT Batas waktu generator Task

**Status:** Disetujui
**WRA:** 4/16 — konsumen adapter internal 1, validasi PostgreSQL/runtime 2, external seam yang dapat dimock 1; dimensi lain 0.

Stage Card: jalur Cepat, Build dan Test & Review lokal lulus; Release diotorisasi dan berjalan. Policies: `SDLC-001`, `SDLC-002`,
`AI-001`, `AI-002`, `AI-003`, `AI-005`, `AI-006`, `AI-009`, `AI-010`, `AI-013`,
`AUTH-002`, `CONTRACT-001`, `DATA-001`, `TEST-001`, `DOC-003`, `DOC-004`.

## Problem

- Gejala: generate/tasks mengembalikan 502 `FEATURE_SPEC_AI_UNAVAILABLE`, tiga kali di Production.
- Bukti: request `69bpc-1793979472592-6dfbbdb93387`, 2026-11-06 22:37:52 WIB,
  eksekusi 30,06 detik (response 30,2 detik), maksimum fungsi 5 menit; external POST Gemini 2.5 Flash.
- Penyebab: adapter memutus fetch pada 30.000 ms. Penyebab upstream lambat dan durasi
  live sampai selesai belum terbukti. Plan/PRD sebelumnya berhasil.

## Perubahan

- File/path: adapter/service Feature Spec AI, test adapter dan integrasi Task AI, Quick Card ini,
  laporan FEATURE_SPEC_TASK_AI_TIMEOUT_2026-11-06, satu entry TODO; simulasi Gemini lokal bila perlu.
- Pendekatan: Task mendapat budget internal 90.000 ms; default Questions/Plan/PRD tetap 30.000 ms.
- Change Impact Map: Module change pada service → adapter → external HTTP. Public contract,
  data/schema/migration, authorization, UI, secret, model/provider/prompt, retry/fallback,
  dependency, dan release gate tidak berubah. Save draf tervalidasi dan Apply tetap terpisah.
- Decision Snapshot: budget khusus Task memperbaiki cutoff terbukti dengan risiko menunggu lebih
  lama ketika provider gagal. Mengubah semua operasi memperluas dampak; mengubah model/thinking
  perlu evaluasi kualitas; async jobs menambah arsitektur. Pilihan: budget Task yang terbatas.
- Recovery: revert hanya patch kandidat terkait; tanpa pemulihan data atau migrasi.

## Acceptance Criteria → bukti

| AC                                                                   | Bukti yang dibutuhkan (E-level) | Perintah / observasi                                                                |
| -------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------- |
| AC-1 Respons Task setelah 30 detik diterima dalam budget baru        | E2                              | Red/green adapter; delayed HTTP external seam lokal                                 |
| AC-2 Task tetap dibatasi 90 detik; failure tidak mengubah draf       | E2 + E3                         | Boundary adapter dan suite Task AI PostgreSQL disposable                            |
| AC-3 Operasi lain mempertahankan budget 30 detik                     | E2                              | Regresi default adapter dan scope call generateTasks                                |
| AC-4 Validation, version/replace, membership dan Apply tetap berlaku | E3                              | Suite integrasi dengan migration kanonikal/factory persisten                        |
| AC-5 Kandidat memenuhi gate repository                               | E2                              | API typecheck/build, docs:check, docs:completeness, sdlc:check, diff/quality review |

## Approval Window

- Task / baseline: FEATURE-SPEC-TASK-AI-TIMEOUT @ eba09a5099480844935ca74ab3e6bf7d00964c96.
- Path yang diizinkan: implementasi/test/dokumentasi di atas dan artefak privat sementara;
  entry dan laporan reset Production yang sudah ada dipertahankan.
- Urutan aksi: claim → regresi red → edit → test PostgreSQL/simulasi → review → laporan.
  Commit/push/PR/merge, dependency/secret change, mutasi/deploy Production tidak termasuk.
- Masa berlaku dan stop condition: kandidat lokal terverifikasi atau akhir turn implementasi;
  berhenti pada scope/baseline baru, perubahan model/contract/authorization, bukti tidak memadai,
  atau kegagalan yang membutuhkan keputusan produk.

**Disetujui:** Owner/user, 2026-11-06, pesan `ok naikkan` setelah rencana Task 90 detik.

### Window rilis lanjutan

- Owner memberi otorisasi eksplisit `naikkan ke prod` lalu `lanjut`, 2026-11-06. Window lokal
  di atas telah berakhir; window ini mengizinkan commit → push branch non-protected → PR →
  auto-merge Tier 1 setelah pemeriksaan → deploy melalui Git integration main → verifikasi baca-saja.
- Baseline integrasi: `800cc2c708c545f7adb86ed499ca2f26489be784` (`origin/main`). Patch kandidat
  dibawa ke worktree terpisah `codex/feature-spec-task-ai-timeout`; dua commit dokumentasi MCP dan
  catatan reset di branch asal tidak disertakan. Path implementasi/test tetap sama; update rilis
  terbatas pada kartu ini, laporan terkait, dan entry TODO task ini.
- Release WRA operasional 5/16: konsumen internal 1, verifikasi runtime 2, akun cloud nyata 2;
  tanpa data/schema/migrasi/authorization/contract baru. CI menjadi verifikator terpisah.
- AC rilis: diff hanya task ini dan Tier 1; pemeriksaan wajib lulus; commit hasil merge terhubung
  ke deployment Production Ready; health/migrasi/database/auth-guard lulus. Real Gemini success
  tidak diasumsikan dan draf Production tidak dimutasi sebagai smoke test.
- Rollback target sebelum rilis: `dpl_8yiRBiBvVjPewoNz873mU6B8LnCM`; tidak diperlukan pemulihan
  data. Stop condition tetap berlaku untuk diff/risiko baru, CI gagal yang memerlukan perluasan
  scope, secret/data/migrasi baru, label Owner, atau otoritas tidak cukup. Window berakhir setelah
  verifikasi Production dan laporan atau stop condition; bukan otorisasi deployment berikutnya.
- Tier 1, tidak ada file yang cocok dengan `quality/tier2-paths.txt`; agent tidak mengubah label Owner.

## Hasil

- Adapter red 3/5, green 5/5; seluruh suite terarah 49/49 pada PostgreSQL disposable dengan
  80 migration kanonikal. Native HTTP: default timeout 30.008 ms, Task menerima fixture
  pada 31.040 ms; batas 90 detik diuji dengan virtual clock. Typecheck/build/lint lulus.
- Dokumentasi 12/12; completeness 0 gap baru (85 baseline); SDLC evaluator worktree menerima
  empat file runtime melalui kartu ini. Rincian dan batas evidence di
  [laporan](../../reports/FEATURE_SPEC_TASK_AI_TIMEOUT_2026-11-06.md).
- PR dan tier: rilis Tier 1 sedang diproses melalui PR/auto-merge; hasil dicatat di laporan.
- Gap: hasil real Gemini belum terbukti; rollout diverifikasi terpisah dari simulasi lokal.
