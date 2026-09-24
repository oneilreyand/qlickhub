## Task

FIX-LOGIN-INVALID-CREDENTIALS-MESSAGE — bedakan kredensial login yang ditolak dari sesi yang benar-benar telah berakhir.

## Outcome

Respons API `401 INVALID_CREDENTIALS` sekarang memberi pesan “Email atau kata sandi salah. Periksa kembali lalu coba masuk lagi.” Pesan sesi berakhir tetap dipakai untuk `401` lain yang benar-benar berkaitan dengan autentikasi/sesi.

## Source of truth and impact

- **Applicable SSoT:** [UI Atomic Design System](../3_UI_ATOMIC_DESIGN_SYSTEM.md#6-diagram-penanganan-state-antarmuka-ui-state-handling) — error state menggunakan umpan balik yang jelas; [Agent Guidelines](../4_AGENT_DEV_GUIDELINES.md#5-template-laporan-serah-terima-agent-report-template) — pelaporan dan validasi.
- **Policy IDs:** `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** Tidak ada perubahan endpoint, request/response contract, atau data persisten. Frontend hanya menerjemahkan kode API yang sudah ada.
- **Authorization impact:** Tidak ada. Login, masa berlaku sesi, refresh token, dan penolakan kredensial backend tetap sama.
- **Migration risk:** Tidak ada.

## Changed files

- `apps/web/src/lib/api/apiClient.ts` — terjemahkan `INVALID_CREDENTIALS` menjadi pesan kredensial yang tepat.
- `apps/web/src/lib/api/__tests__/apiClient.test.ts` — regresi untuk mencegah `INVALID_CREDENTIALS` kembali disajikan sebagai sesi berakhir.
- `TODO.md` — status pekerjaan dan bukti selesai.
- `docs/reports/FIX_LOGIN_INVALID_CREDENTIALS_MESSAGE_2026-09-24.md` — laporan ini.

## Validation

- `npm --workspace @qlick/web test -- src/lib/api/__tests__/apiClient.test.ts` — sebelum implementasi: gagal sesuai reproduksi, 1/5 test gagal; `INVALID_CREDENTIALS` menerima pesan sesi berakhir.
- `npm --workspace @qlick/web test -- src/lib/api/__tests__/apiClient.test.ts src/pages/__tests__/LoginPage.test.tsx` — lulus: 2 file, 11/11 test; 0 skipped, 0 warning.
- `npm --workspace @qlick/web run typecheck` — lulus, 0 error.
- `npm --workspace @qlick/web run build` — lulus; 1.714 modul ditransformasi.
- `npm run docs:check` — lulus; 5/5 test, 0 failed, 0 skipped.
- Vercel Production `dpl_DMuBktEYckzGKk6b8h89ad1KbJgJ` untuk commit `9ae42a7` — `Ready`; alias kanonikal `https://qlickhub.vercel.app` aktif.
- Smoke check Production read-only — `/login` 200; `/v1/health` 200 dengan database `connected`; `/v1/workspaces` tanpa sesi 401; bundle aktif `index-C2r3PlRx.js` memuat pesan `INVALID_CREDENTIALS` yang baru.

## Risks or follow-up

- Tidak melakukan login terhadap akun Production sebagai bagian dari perbaikan ini. Pengguna yang menerima pesan kredensial baru masih perlu memakai email/kata sandi yang valid atau menjalankan reset kata sandi bila diperlukan.

## TODO update

- FIX-LOGIN-INVALID-CREDENTIALS-MESSAGE → Done
