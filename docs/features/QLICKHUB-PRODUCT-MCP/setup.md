# Qlick Hub MCP — Panduan setup yang direncanakan

**Status:** Draft — endpoint belum tersedia; langkah belum diuji terhadap Qlick Hub
**Last reviewed:** 2026-11-03

Semua anggota memakai akun Qlick Hub sendiri. URL berikut placeholder, bukan layanan live:
https://YOUR-QLICKHUB-API/mcp. Host final dan kompatibilitas OAuth diputuskan sebelum staging.

## Codex

Tambah server Streamable HTTP di Settings → MCP servers, masukkan URL, lalu Authenticate.
Alternatif CLI setelah server tersedia:

```sh
codex mcp add qlickhub --url https://YOUR-QLICKHUB-API/mcp
codex mcp login qlickhub
```

[Dokumentasi resmi Codex](https://learn.chatgpt.com/docs/extend/mcp).

## Claude

Claude Web/Desktop: tambah custom connector lewat Customize → Connectors dan masukkan URL.
Pada Team/Enterprise, admin organisasi menambahkan connector dahulu, setiap user kemudian Connect
dan login sendiri. Remote connector menghubungi server dari cloud Anthropic; endpoint harus
dapat dijangkau dari sana. Nama menu dapat berubah; periksa panduan vendor saat UAT.

Claude Code mempunyai konfigurasi MCP tersendiri; onboarding Code belum diverifikasi di rencana
ini dan tidak boleh dianggap otomatis mengikuti pengaturan Claude Web/Desktop.

[Panduan resmi Claude](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).

## Antigravity IDE / CLI

IDE: menu agent … → MCP Servers → Manage MCP Servers → View raw config.
Gabungkan entri berikut ke mcpServers; jangan menimpa konfigurasi server yang sudah ada:

```json
{
  "mcpServers": {
    "qlickhub": {
      "serverUrl": "https://YOUR-QLICKHUB-API/mcp"
    }
  }
}
```

Panduan vendor mencantumkan ~/.gemini/config/mcp_config.json untuk global config dan
.agents/mcp_config.json untuk Workspace config. OAuth DCR dapat menangani registrasi otomatis;
bila tidak tersedia, pre-registered client perlu dikonfigurasi sesuai callback vendor.
Authenticate lewat pengaturan client dan selesaikan login browser; ikuti prompt kode jika muncul.
Antigravity App menyediakan Settings → Customizations untuk pengelolaan MCP; jalur custom server
per versi harus diverifikasi pada pilot, jangan menyimpulkan bahwa tombol Store memasang Qlick Hub.

[Dokumentasi resmi Antigravity](https://antigravity.google/docs/mcp).

## Instruksi grooming bersama

```text
Bantu grooming Feature sampai Plan, PRD, Requirement, AC, dan Subtask lengkap.
Gunakan Workspace dan Folder dari Qlick Hub, tampilkan preview dan ringkasan final.
Jangan publish sebelum saya memberi perintah eksplisit “publish ke Qlick Hub”.
Jika publish timeout, periksa hasil atau ulangi dengan idempotency key yang sama.
```

Setelah terhubung, uji identitas dan Workspace dahulu. Login OAuth adalah grant koneksi;
konfirmasi publish tetap di agent, tanpa approval code/link tambahan Qlick Hub.
Client mungkin tetap meminta izin pemanggilan tool sesuai pengaturannya.
Jangan menaruh password, access/refresh token, atau secret di prompt/repository.
Hasil uji login/preview/publish per client dicatat di testing.md, saat ini belum ada.
