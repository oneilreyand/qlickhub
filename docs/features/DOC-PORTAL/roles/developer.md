# DOC-PORTAL — Developer Path

**Applicable Policy IDs:** DOC-005, DOC-006

## Inputs and preconditions

Perubahan yang menambah endpoint, model, Feature folder, item TODO, atau alur role.

## Actions and evidence

- Sebut path endpoint baru di dokumen fitur dan petakan model baru ke domain di `docsys.config.json`
  dalam PR yang sama.
- Bila `verify` merah karena rule `DS-R01`–`DS-R05`, ikuti saran perbaikan di laporan.
- Setelah membereskan gap lama, jalankan `npm run docs:baseline -- --shrink`.

## Outputs and handoff

PR tanpa gap dokumen baru; laporan completeness hijau.
