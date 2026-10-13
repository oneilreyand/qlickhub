# Quick Cards

**Status:** Navigation index
**Policy:** `SDLC-002`

Satu file per pekerjaan jalur Cepat (`<TASK-ID>.md`), dibuat dengan
`npm run sdlc:new -- quick <TASK-ID>` dari [Quick Card template](../QUICK_CARD_TEMPLATE.md).

`npm run docs:check` memvalidasi setiap kartu di folder ini: heading wajib, Status yang diizinkan,
WRA ≤ 4/16, serta approver dan tanpa placeholder ketika berstatus `Disetujui` atau `Selesai`.
CI (`npm run sdlc:check`) menolak PR yang mengubah kode aplikasi tanpa kartu yang disetujui atau
folder Feature yang tahap Breakdown-nya disetujui. Aturan kanonis:
[Agent Guidelines §2B](../../4_AGENT_DEV_GUIDELINES.md#2b-tahap-sdlc-feature-staged-feature-sdlc).
