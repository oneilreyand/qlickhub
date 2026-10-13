'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      // 1. Find all root features without any baseline
      // that have an approved Product Brief, at least 1 active requirement,
      // no inactive requirements, and every active requirement has at least 1 active AC.
      const [eligibleFeatures] = await sequelize.query(
        `
        SELECT 
          t.id AS feature_task_id,
          t.workspace_id,
          t.reporter_id,
          d.id AS document_id,
          d.owner_id AS document_owner_id,
          d.title AS document_title,
          dv.id AS version_id,
          dv.version AS version_number,
          (
            -- ADR-032 #2 / ADR-013 #6: only the persisted approver of this Product Brief.
            -- A Brief created directly as approved records 'product_brief_created' with status approved.
            SELECT a.actor_id
            FROM task_activity a
            WHERE a.task_id = t.id
              AND a.metadata_json->>'documentId' = d.id::text
              AND (
                a.action = 'product_brief_approved'
                OR (a.action = 'product_brief_created' AND a.metadata_json->>'status' = 'approved')
              )
              AND EXISTS (
                SELECT 1 FROM workspace_members m
                WHERE m.workspace_id = t.workspace_id AND m.user_id = a.actor_id
              )
            ORDER BY a.created_at DESC LIMIT 1
          ) AS approver_actor_id
        FROM tasks t
        JOIN task_documents td ON td.task_id = t.id AND td.link_type = 'primary_prd'
        JOIN qa_documents d ON d.id = td.document_id AND d.status = 'approved' AND d.doc_type = 'product_brief'
        JOIN qa_document_versions dv ON dv.document_id = d.id AND dv.version = d.current_version
        WHERE t.parent_task_id IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM feature_readiness_baselines b WHERE b.feature_task_id = t.id
          );
      `,
        { transaction },
      );

      console.log(
        `[Backfill Baseline] Found ${eligibleFeatures.length} candidate features with approved Product Brief and no baseline.`,
      );

      let skippedWithoutApprover = 0;
      for (const feat of eligibleFeatures) {
        // Check requirement criteria for this feature (including subtasks)
        const [linkedReqs] = await sequelize.query(
          `
          SELECT DISTINCT r.id, r.code, r.title, r.description, r.status, r.updated_at
          FROM task_requirements tr
          JOIN tasks child_or_self ON child_or_self.id = tr.task_id AND (child_or_self.id = :featureId OR child_or_self.parent_task_id = :featureId)
          JOIN requirements r ON r.id = tr.requirement_id
          WHERE tr.workspace_id = :workspaceId;
        `,
          {
            replacements: { featureId: feat.feature_task_id, workspaceId: feat.workspace_id },
            transaction,
          },
        );

        if (linkedReqs.length === 0) continue;
        const activeReqs = linkedReqs.filter((r) => r.status === 'active');
        if (activeReqs.length !== linkedReqs.length) continue; // has inactive requirements

        // Check AC for each active req
        let allCriteriaComplete = true;
        const reqCriteriaMap = [];
        for (const req of activeReqs) {
          const [acRows] = await sequelize.query(
            `
            SELECT id, sequence, text, status, updated_at
            FROM acceptance_criteria
            WHERE requirement_id = :reqId AND status = 'active'
            ORDER BY sequence ASC;
          `,
            { replacements: { reqId: req.id }, transaction },
          );

          if (acRows.length === 0) {
            allCriteriaComplete = false;
            break;
          }
          reqCriteriaMap.push({
            id: req.id,
            code: req.code,
            title: req.title,
            description: req.description || null,
            url: null,
            status: 'active',
            updatedAt: new Date(req.updated_at).toISOString(),
            acceptanceCriteria: acRows.map((ac) => ({
              id: ac.id,
              sequence: ac.sequence,
              code: `AC-${ac.sequence}`,
              text: ac.text,
              status: 'active',
              updatedAt: new Date(ac.updated_at).toISOString(),
            })),
          });
        }

        if (!allCriteriaComplete) continue;

        // ADR-032 #2: never infer an establisher. Without a persisted approver the Feature is skipped
        // and receives its baseline later through the automatic path.
        if (!feat.approver_actor_id) {
          skippedWithoutApprover += 1;
          continue;
        }
        const establishedBy = feat.approver_actor_id;
        const capturedAt = new Date().toISOString();
        const snapshot = {
          schemaVersion: 1,
          capturedAt,
          productBrief: {
            documentId: feat.document_id,
            versionId: feat.version_id,
            version: feat.version_number,
            status: 'approved',
            title: feat.document_title,
          },
          requirements: reqCriteriaMap,
          reviewIds: {
            dev: null,
            qa: null,
          },
          backfilled: true,
        };

        const baselineId = require('crypto').randomUUID();
        await sequelize.query(
          `
          INSERT INTO feature_readiness_baselines (
            id, workspace_id, feature_task_id, sequence, mode, product_brief_version_id,
            dev_review_id, qa_review_id, snapshot_json, established_by, established_at
          ) VALUES (
            :id, :workspaceId, :featureTaskId, 1, 'observation', :productBriefVersionId,
            NULL, NULL, :snapshot::jsonb, :establishedBy, NOW()
          );
        `,
          {
            replacements: {
              id: baselineId,
              workspaceId: feat.workspace_id,
              featureTaskId: feat.feature_task_id,
              productBriefVersionId: feat.version_id,
              snapshot: JSON.stringify(snapshot),
              establishedBy,
            },
            transaction,
          },
        );

        for (const req of activeReqs) {
          await sequelize.query(
            `
            INSERT INTO feature_readiness_baseline_requirements (
              workspace_id, baseline_id, requirement_id
            ) VALUES (
              :workspaceId, :baselineId, :reqId
            );
          `,
            {
              replacements: {
                workspaceId: feat.workspace_id,
                baselineId,
                reqId: req.id,
              },
              transaction,
            },
          );
        }

        await sequelize.query(
          `
          INSERT INTO task_activity (
            id, workspace_id, task_id, actor_id, action, metadata_json, created_at
          ) VALUES (
            :id, :workspaceId, :featureTaskId, :actorId, 'feature.readiness.baseline_established',
            :metadata::jsonb, NOW()
          );
        `,
          {
            replacements: {
              id: require('crypto').randomUUID(),
              workspaceId: feat.workspace_id,
              featureTaskId: feat.feature_task_id,
              actorId: establishedBy,
              metadata: JSON.stringify({
                baselineId,
                sequence: 1,
                mode: 'observation',
                requirementCount: activeReqs.length,
                productBriefVersion: feat.version_number,
                autoEstablished: true,
                origin: 'migration_backfill',
              }),
            },
            transaction,
          },
        );

        console.log(
          `[Backfill Baseline] Created baseline ${baselineId} for feature ${feat.feature_task_id}`,
        );
      }
      console.log(
        `[Backfill Baseline] Skipped ${skippedWithoutApprover} feature(s) without a persisted Product Brief approver.`,
      );
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      // 1. Check if any backfilled baselines are already referenced by qa_test_cycles.
      // SSoT / Rule: Never break persisted test cycles or violate foreign key constraints.
      // If a backfilled baseline is used by a test cycle, skip deleting it and log a clear warning.
      const [referencedBaselines] = await sequelize.query(
        `
        SELECT b.id, b.feature_task_id, COUNT(c.id) AS cycle_count
        FROM feature_readiness_baselines b
        JOIN qa_test_cycles c ON c.readiness_baseline_id = b.id
        WHERE b.snapshot_json->>'backfilled' = 'true'
        GROUP BY b.id, b.feature_task_id;
      `,
        { transaction },
      );

      if (referencedBaselines.length > 0) {
        console.warn(
          `[Rollback Warning] Skipped deleting ${referencedBaselines.length} backfilled baseline(s) because they are actively referenced by qa_test_cycles:`,
          referencedBaselines.map((r) => ({
            baselineId: r.id,
            featureId: r.feature_task_id,
            cycles: r.cycle_count,
          })),
        );
      }

      // 2. Delete task_activity entries only for unreferenced backfilled baselines being rolled back
      await sequelize.query(
        `
        DELETE FROM task_activity
        WHERE action = 'feature.readiness.baseline_established'
          AND metadata_json->>'origin' = 'migration_backfill'
          AND (
            metadata_json->>'baselineId' IS NULL
            OR (metadata_json->>'baselineId')::uuid NOT IN (
              SELECT c.readiness_baseline_id FROM qa_test_cycles c
            )
          );
      `,
        { transaction },
      );

      // 3. Delete baseline requirement links only for unreferenced backfilled baselines
      await sequelize.query(
        `
        DELETE FROM feature_readiness_baseline_requirements
        WHERE baseline_id IN (
          SELECT b.id FROM feature_readiness_baselines b
          WHERE b.snapshot_json->>'backfilled' = 'true'
            AND NOT EXISTS (
              SELECT 1 FROM qa_test_cycles c WHERE c.readiness_baseline_id = b.id
            )
        );
      `,
        { transaction },
      );

      // 4. Delete unreferenced backfilled baselines
      await sequelize.query(
        `
        DELETE FROM feature_readiness_baselines b
        WHERE b.snapshot_json->>'backfilled' = 'true'
          AND NOT EXISTS (
            SELECT 1 FROM qa_test_cycles c WHERE c.readiness_baseline_id = b.id
          );
      `,
        { transaction },
      );
    });
  },
};
