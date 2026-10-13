# VERCEL-PRODUCTION-BRANCH — QA Path

**Applicable Policy IDs:** DOC-005, QA-007, RELEASE-002, SDLC-001

## Inputs and preconditions

- Vercel Preview deployment dari branch `main` aktif.
- Catatan perubahan dan test case yang siap diuji pada lingkungan Preview.

## Permitted actions and decisions

- Menjalankan smoke test dan regresi pada Preview environment.
- Melaporkan bug jika ditemukan regresi pada Preview sebelum branch dipromosikan ke Production.
- Memberikan QA sign-off kualitas rilis kepada PO.
- Melakukan smoke test verifikasi pasca-deploy di Production setelah Owner me-merge rilis.
- QA dilarang melakukan merge atau mutasi ke branch `production`.

## Outputs and handoff

- Bukti uji coba (screenshot/video/test result) dan rekomendasi kelayakan rilis ke PO dan Owner.
