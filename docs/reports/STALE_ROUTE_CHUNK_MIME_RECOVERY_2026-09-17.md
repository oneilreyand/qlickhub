# Agent Report — Stale Route Chunk MIME Recovery

## Task

Memulihkan navigasi setelah login ketika browser masih memegang referensi JavaScript dari deployment sebelumnya dan menerima HTML fallback sebagai respons modul.

## Outcome

Pemulihan route chunk kini mengenali pesan browser bahwa respons `text/html` bukan JavaScript yang valid. Ketika aset route lama diminta sesudah deployment, aplikasi akan memuat ulang satu kali untuk memperoleh manifest deployment terbaru, dengan cooldown yang tetap mencegah loop reload.

## Source of truth and impact

- **Applicable SSoT:** [Product Knowledge Map](../0_PRODUCT_KNOWLEDGE_MAP.md), [UI design system](../3_UI_ATOMIC_DESIGN_SYSTEM.md), dan [Agent guidelines](../4_AGENT_DEV_GUIDELINES.md).
- **Policy IDs:** `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** Tidak ada perubahan data persisten, API, atau kontrak.
- **Authorization impact:** Tidak ada perubahan otorisasi atau sesi.
- **Migration risk:** Tidak ada migrasi atau mutasi database.

## Changed files

- `apps/web/src/lib/routeChunkRecovery.ts` — mengenali variasi error MIME `text/html` dari import route stale.
- `apps/web/src/lib/__tests__/routeChunkRecovery.test.ts` — mengunci repro browser untuk variasi error tersebut.

## Validation

- Reproduksi Production: aset JavaScript yang tidak ada menerima `200 text/html` melalui fallback route; aset yang dirujuk manifest Production menerima `200 application/javascript`.
- `npm --prefix apps/web exec -- vitest run src/lib/__tests__/routeChunkRecovery.test.ts` — 5/5 lulus setelah perbaikan; tes baru gagal sebelum regex diperbarui.
- `npm --prefix apps/web run build` — lulus, TypeScript dan Vite memproses 1.711 modul.
- `git diff --check` — lulus.

## Risks or follow-up

- Pengguna dengan halaman lama yang sudah terbuka mungkin perlu mencoba login sekali lagi setelah deployment baru selesai; pemulihan otomatis akan merefresh satu kali saat route chunk lama ditemukan.

## TODO update

- `STALE-ROUTE-CHUNK-MIME-RECOVERY` → `Done` setelah deployment Production dan smoke check.
