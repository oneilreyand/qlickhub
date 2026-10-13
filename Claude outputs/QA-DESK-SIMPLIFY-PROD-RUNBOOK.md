# Runbook Production — QA-DESK-SIMPLIFY (PR #37)

Jalankan **setelah G3 dan Tahap 5 disetujui**, dan **sebelum** PR #37 di-merge. Merge ke `main` langsung
ter-deploy ke Production, jadi schema harus siap lebih dulu.

Kenapa urutan ini aman: kode Production saat ini (`main`) tetap berjalan normal setelah migrasi.
- 087 hanya menambah baris baseline.
- 088 hanya melonggarkan trigger untuk versi test case yang belum pernah dijalankan; kode lama tidak
  pernah memakai jalur itu.

Jangan pernah menempel nilai `MIGRATION_DATABASE_URL` ke chat, commit, atau laporan.

## 1. Audit read-only: berapa Feature yang akan di-backfill

Jalankan di SQL editor Supabase (Production). Query ini hanya membaca.

```sql
WITH candidates AS (
  SELECT t.id AS feature_task_id, t.workspace_id, d.id AS document_id
  FROM tasks t
  JOIN task_documents td ON td.task_id = t.id AND td.link_type = 'primary_prd'
  JOIN qa_documents d ON d.id = td.document_id AND d.status = 'approved' AND d.doc_type = 'product_brief'
  WHERE t.parent_task_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM feature_readiness_baselines b WHERE b.feature_task_id = t.id)
),
reqs AS (
  SELECT c.feature_task_id, r.id AS requirement_id, r.status
  FROM candidates c
  JOIN tasks x ON x.id = c.feature_task_id OR x.parent_task_id = c.feature_task_id
  JOIN task_requirements tr ON tr.task_id = x.id AND tr.workspace_id = c.workspace_id
  JOIN requirements r ON r.id = tr.requirement_id
),
content_ok AS (
  SELECT c.*
  FROM candidates c
  WHERE EXISTS (SELECT 1 FROM reqs q WHERE q.feature_task_id = c.feature_task_id)
    AND NOT EXISTS (SELECT 1 FROM reqs q WHERE q.feature_task_id = c.feature_task_id AND q.status <> 'active')
    AND NOT EXISTS (
      SELECT 1 FROM reqs q
      WHERE q.feature_task_id = c.feature_task_id
        AND NOT EXISTS (
          SELECT 1 FROM acceptance_criteria ac
          WHERE ac.requirement_id = q.requirement_id AND ac.status = 'active'
        )
    )
)
SELECT
  COUNT(*) AS content_eligible,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM task_activity a
    WHERE a.task_id = c.feature_task_id
      AND a.metadata_json->>'documentId' = c.document_id::text
      AND (a.action = 'product_brief_approved'
           OR (a.action = 'product_brief_created' AND a.metadata_json->>'status' = 'approved'))
      AND EXISTS (SELECT 1 FROM workspace_members m
                  WHERE m.workspace_id = c.workspace_id AND m.user_id = a.actor_id)
  )) AS will_backfill
FROM content_ok c;
```

Kirim dua angka hasilnya (`content_eligible`, `will_backfill`) ke Claude. Selisihnya adalah Feature yang
dilewati (D6) dan akan mendapat baseline otomatis saat Requirement/AC-nya disentuh.

## 2. Backup

Supabase → Database → Backups: pastikan ada backup harian terbaru, atau buat backup manual (PITR bila
tersedia). Catat waktu backup-nya.

## 3. Jalankan migrasi dari branch PR

Di Terminal Mac, di salinan Owner (bukan folder AGY):

```bash
cd ~/Documents/GitHub/qlickhub-owner
git fetch origin && git checkout -B feat/qa-desk-simplify origin/feat/qa-desk-simplify
npm ci
export MIGRATION_DATABASE_URL='<Session Pooler URL dari Supabase — jangan dibagikan>'
(cd apps/api && NODE_ENV=production npx sequelize-cli db:migrate:status --env production) | tail -5   # harus menunjukkan 087 & 088 "down"
npm run db:migrate:prod
(cd apps/api && NODE_ENV=production npx sequelize-cli db:migrate:status --env production) | tail -3   # 087 & 088 harus "up"
unset MIGRATION_DATABASE_URL
```

Kirim ke Claude baris log `[Backfill Baseline] ...` dan hasil `db:migrate:status` (tanpa URL).

## 4. Merge dan cek

1. Tambahkan label `owner-approved`, lalu merge PR #37 (Vercel otomatis deploy ke Production).
2. Smoke test: login sebagai QA → buka subtask QA → buat test case → langsung bisa dijalankan;
   hapus test case yang belum dijalankan → berhasil.
3. Bila bermasalah: alihkan alias Production ke deployment Vercel sebelumnya. **Jangan** menjalankan
   `db:migrate:undo` di Production tanpa keputusan baru; `down()` 087 sengaja mempertahankan baseline
   yang sudah dipakai test cycle.
