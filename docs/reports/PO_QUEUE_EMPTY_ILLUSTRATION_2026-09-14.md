## Task

PO-QUEUE-EMPTY-ILLUSTRATION — menuntaskan validasi mobile ilustrasi empty-state untuk antrean PO
Requirement, keputusan rilis, dan Timeline.

## Outcome

Ketiga bucket kosong PO sekarang memakai ilustrasi Cloudinary yang sudah disetujui pada tema terang
dan gelap. `EmptyState` tidak lagi menyembunyikan ilustrasi ketika dark mode aktif; fallback ikon
hanya dirender bila pemanggil tidak menyediakan ilustrasi. Data antrean tetap berasal dari backend
dan copy serta accessible name masing-masing bucket tidak berubah.

## Source of truth and impact

- **Applicable SSoT:** `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md` dan
  `docs/4_AGENT_DEV_GUIDELINES.md`.
- **Policy IDs:** `DATA-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** tidak ada; tidak ada kontrak, request, response, atau data persisten yang
  berubah.
- **Authorization impact:** tidak ada.
- **Migration risk:** tidak ada schema atau migrasi.

## Changed files

- `apps/web/src/components/ui/molecules/EmptyState.tsx` — mempertahankan ilustrasi pada kedua tema
  dan memakai ikon hanya sebagai fallback tanpa ilustrasi.
- `apps/web/src/components/ui/molecules/__tests__/EmptyState.test.tsx` — menambahkan regresi perilaku
  ilustrasi lintas tema dan fallback ikon.
- `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md` — mencatat kontrak presentasi `EmptyState`.
- `TODO.md` — menutup task beserta evidence final.

## Validation

- `npm --prefix apps/web test -- src/components/ui/molecules/__tests__/EmptyState.test.tsx
src/components/ui/organisms/__tests__/MyTasksDashboard.test.tsx` — lulus 11/11 test dalam 2 file,
  0 gagal dan 0 dilewati.
- `npm --prefix apps/web test -- --run` — lulus 451/451 test dalam 86 file, 0 gagal dan 0 dilewati;
  suite mencetak warning React `act(...)` lama pada test asynchronous di luar perubahan ini.
- `npm --prefix apps/web run typecheck` — lulus tanpa diagnostic.
- `npm --prefix apps/web run build` — lulus; Vite mentransformasi 1.710 module.
- Targeted ESLint — 0 error; 1 warning lama `react-hooks/exhaustive-deps` pada
  `RoleAwareWorkQueuePanel.tsx` yang tidak diubah task ini.
- QA visual harness fixture-only sementara — ketiga bucket PO kosong diperiksa pada viewport mobile
  390 × 844 piksel dalam tema terang dan gelap. Setiap gambar selesai dimuat dari aset yang
  disetujui, memiliki accessible name khusus bucket, dirender 192 × 128 piksel, dan halaman memiliki
  content width tepat 390 piksel tanpa overflow horizontal.
- QA visual desktop dark mode 1.440 × 900 piksel — ilustrasi Timeline dirender 240 × 160 piksel,
  layout utuh, dan tidak ada overflow horizontal.
- Navigasi ArrowLeft/ArrowRight memilih tab bucket yang benar; browser mencatat 0 warning/error.
- Harness visual sementara dihapus setelah pemeriksaan dan tidak masuk production path.
- `npm run validate` — lulus; docs check 5/5 dan seluruh typecheck selesai tanpa kegagalan. Lint
  melaporkan 0 error dan 21 warning lama di file yang tidak diubah task ini.
- `git diff --check` — lulus tanpa whitespace error.

## Risks or follow-up

- Perubahan belum dideploy ke Production; rilis mengikuti release aplikasi berikutnya.

## TODO update

- `PO-QUEUE-EMPTY-ILLUSTRATION` → `Done`.
