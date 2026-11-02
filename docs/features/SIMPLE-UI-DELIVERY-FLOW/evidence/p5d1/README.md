# P5d-1 — bukti UAT lokal 2026-11-02

Rekaman test support menggunakan sesi browser yang user login sendiri dan backend lokal nyata.
Fixture berlabel UAT disimpan/dibaca melalui HTTP terautentikasi; bukan data Production.

- `developer-403.jpg`: screenshot asli penolakan generate untuk peran `dev`.
- `owner-generated.jpg`: screenshot asli hasil Gemini sesudah perbaikan, HTTP 200,
  26,328 ms, 10 subtask. Lebar browser saat perekaman 555 px; JSON panjang melampaui viewport.
- `owner-readback.json`: payload GET berikutnya, diekstrak dari snapshot accessibility lengkap;
  versi 4, stage `task`, 10 subtask, snapshot `via=ai`. Tidak berisi credential atau nilai `.env`.
- `context-502.jpg` dan `context-503.jpg`: dua percobaan pertama sesudah konteks prompt dilengkapi;
  keduanya HTTP 502, yang kedua secara eksplisit mencatat status 503 dari penyedia.
- `context-502-readback.json` dan `context-503-readback.json`: GET sesudah masing-masing kegagalan,
  Spec baru tetap versi 3/Task kosong, snapshot terbaru `via=web`; tidak ada draf parsial.
- `context-attempt3-503.jpg` dan `context-attempt3-readback.json`: percobaan manual ketiga setelah
  jeda masih mendapat 503 penyedia; GET tetap versi 3/Task kosong.

Identitas fixture, batas bukti, hasil review, dan perintah validasi hanya didefinisikan di
[PHASE-05d1 §4](../../phases/PHASE-05d1.md#4-verifikasi-lanjutan-2026-11-02).
