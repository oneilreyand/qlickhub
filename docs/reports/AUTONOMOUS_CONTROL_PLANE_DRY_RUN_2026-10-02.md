## Task

`AUTONOMOUS-CONTROL-PLANE-DRY-RUN`

## Outcome

The local validator checks an Execution Record and returns an `allow`/`deny` decision with a
sanitised audit preview. It checks the observed Git baseline, exact path scope, requested/prohibited
capabilities, expiry, limits, AC-specific evidence commands, and declared executor/verifier identities.
The CLI includes a repository snapshot command for before/after integrity comparison.

No capability issuer, host isolation, credential store, database, provider, deployment, or automated
rollback/quarantine was activated. Local checks validate declarations; they do not enforce a timeout,
spend budget, exclusive lease, or trusted verifier identity in a runtime.

## Work assurance

- **WRA:** 5/16, `Ready` for this local tooling slice; [plan](../plans/AUTONOMOUS_CONTROL_PLANE_DRY_RUN_PLAN.md) records scores, impact, alternatives, and unresolved runtime decisions.
- **Execution Record:** [record](../../quality/execution-records/AUTONOMOUS-CONTROL-PLANE-DRY-RUN.json), mode `dry-run`, current baseline `0333a67473a696fe77283314b48ada80420f4069`, exact local paths, retry 0, timeout 20 minutes, and additional provider cost budget 0. These are input declarations only. No token was issued.
- **Scope/access:** Repository files, Git read operations, and local Node validation only. PostgreSQL, UI/browser, cloud, secrets, migrations, user-facing RBAC, and deployment are not involved.

| Acceptance criterion                                                                              | Required / achieved evidence | Primary check                                            | Verification status                         |
| ------------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------- | ------------------------------------------- |
| Reject incomplete, expired, unsafe-path, scope/baseline-violating, or read-only mutation records. | E2 / E2                      | Policy suite and CLI deny cases.                         | Accepted for dry-run; runtime gaps retained |
| Allow a valid scoped dry-run decision without issuing a token.                                    | E2 / E2                      | Valid record command; `capabilityIssued: false`.         | Accepted for dry-run; runtime gaps retained |
| Reject recognised secret-shaped input and suppress it in the complete decision output.            | E2 / E2                      | Synthetic-marker regression test of serialized decision. | Accepted for dry-run; runtime gaps retained |
| Preserve the documented runtime activation boundary.                                              | E1/E2 / E1/E2                | SSoT §7, pilot prompt, and documentation gate.           | Accepted for dry-run; runtime gaps retained |

- **Evidence outcomes:** Initial module-unavailable test failed as expected before implementation. The first implementation passed 8/8. Review added baseline, clock, malformed-input, AC mapping, limit, and full-output secret checks; the updated suite passed 22/22, 0 failed, 0 skipped. Final command results and verifier receipt are recorded below.
- **Change Impact Map:** Local tooling module and documentation/reporting interface. No application data/schema/contract, backend authorization, UI, migration, provider, or deployment change.
- **Decision Snapshot:** Reuse Node built-ins, script conventions, and the existing Policy Registry parser. Keep the local autonomous record evaluator separate from the legacy GitHub approval manifest checker because the contracts differ. Runtime broker activation remains a future slice requiring a real isolation/capability/recovery boundary.
- **Quality review:** Reuse/DRY: registry ID extraction is imported from `checkDocs.mjs`. Overlap: historical approval manifests are preserved. Obsolete/unused: no new unused export or dependency found; policy commands are included in `npm run validate`. Boundaries: CLI reads a record resolved under its record directory, has generic non-secret errors, emits an allowlisted audit projection, and never executes an evidence command from input. Regression: new suite covers positive and negative decisions. Documentation: the new SSoT is included in required-file/local-link checks.
- **Cross-layer gates:** N/A for application persistence, UI, model/provider evaluation, and runtime performance. Node tests do not replace those requirements.

## Baseline and independent verification

The initial record targeted `611acc9`. During this task the shared worktree advanced to `0333a67`
through unrelated application commits. The new baseline check rejected the stale record with
`Execution Record baselineCommit does not match observed Git HEAD.` Reviewing the actual commit
range showed no overlap with this slice. The planner then explicitly refreshed the baseline while
preserving the lease and allowed capabilities.

The first separate verifier was the **Codex** chat `Cek kesiapan worktree Agy`, thread
`01a0f033-df5b-7560-a69e-136a2a9abe9c`. Its result for the earlier eight-test version was
`Accepted with gaps`: policy tests 8/8, docs tests 9/9, valid record exit 0, path/Production denials
exit 1, and identical before/after Git status. This is a Codex verification transcript, not evidence
that Antigravity itself ran the pilot. Git status alone does not establish unchanged dirty-file
contents; the new snapshot command adds that evidence for the final verification.

Final independent verification of the updated version: **Accepted with gaps**.
The same Codex verifier independently reran all 22 policy tests, the valid CLI record, scope,
Production, expiry and invalid-clock denials, documentation tests, script lint, and diff check.
Primary transcript: thread `01a0f033-df5b-7560-a69e-136a2a9abe9c`, turn
`01a0fbbc-b964-75f3-b343-1d3313039d95`. Its two snapshot command outputs were identical:

```json
{
  "head": "0333a67473a696fe77283314b48ada80420f4069",
  "fileCount": 1093,
  "contentDigest": "7d90260cc1900e26f0844fda74d8ce9b33ae30b6e33c19034566098791c36a34",
  "indexDigest": "590ce4d1e9a5f3a77ae8b9af4c4388c8e1b4573ed793a0d611541471f346b6af",
  "statusDigest": "ced5005362d02d4311de53d9df44e545c4628fdd01b89221b49b47fbc36691f6"
}
```

This comparison is scoped to the verifier interval. Subsequent report/TODO updates change their
content normally and do not invalidate the earlier comparison. No executor code changed after the
verifier's final inspection.

## Source of truth and impact

- **SSoT:** [Agent Guidelines](../4_AGENT_DEV_GUIDELINES.md), [Autonomous Agent Operations](../5_AUTONOMOUS_AGENT_OPERATIONS.md), [ADR-027](../adr/ADR-027-AUTONOMOUS-AGENT-OPERATIONS.md), and [Policy Registry](../POLICY_REGISTRY.md).
- **Policy IDs:** `AI-002`, `AI-003`, `AI-004`, `AI-008`, `AI-009`, `AI-012`, `AI-015`–`AI-019`, `DOC-001`, `DOC-003`, `DOC-004`.
- **Data/interface:** Local JSON/CLI contract only.
- **Authorization:** No operational credential or product RBAC change. Identity strings in the record are declarations, not authenticated identities.
- **Migration risk:** None.

## Changed files

- `scripts/checkExecutionRecord.mjs`, `scripts/checkExecutionRecord.test.mjs` — evaluator, snapshot, and tests.
- `quality/execution-records/AUTONOMOUS-CONTROL-PLANE-DRY-RUN.json` — bounded dry-run record.
- `package.json` — policy commands and test integration with `validate`/existing CI.
- `scripts/checkDocs.mjs` — include the autonomous SSoT in required-file and link checks.
- `AGENT_REPORT_TEMPLATE.md` — complete record and read-only integrity fields.
- `docs/5_AUTONOMOUS_AGENT_OPERATIONS.md` — local validator contract and evidence limits.
- Plan, [Antigravity pilot prompt](../plans/AGY_AUTONOMOUS_DRY_RUN_PILOT.md), this report, and `TODO.md` — scope, handoff, and status.

## Validation

- Initial `node --test scripts/checkExecutionRecord.test.mjs`: expected red, unavailable module; 1 failed file, 0 skipped.
- Initial `npm run validate`: exit 0; docs 9/9, policy 8/8, lint 0 errors/37 existing warnings, all workspace typechecks passed. This predates the final review changes.
- Updated `npm run agent:policy:test`: exit 0; 22/22, 0 failed/cancelled/skipped/todo, Node v24 local runner.
- Stale record CLI: exit 1; deny because observed HEAD changed.
- Final `npm run validate`: exit 0; docs 9/9, policy 22/22, application lint 0 errors/38 warnings from files outside this slice, and contracts/API/web typechecks passed. The warning count increased with the intervening application commit, not this tooling slice.
- Focused script lint initially found `no-control-regex`; the path check was corrected without weakening lint. Independent `npx --no-install eslint scripts/checkExecutionRecord.mjs scripts/checkExecutionRecord.test.mjs scripts/checkDocs.mjs`: exit 0, no errors/warnings.
- Independent `npm run agent:policy:test`: exit 0; 22 passed, 0 failed/cancelled/skipped/todo; Node v24 local runner.
- Independent `npm run agent:policy:check -- --record quality/execution-records/AUTONOMOUS-CONTROL-PLANE-DRY-RUN.json`: exit 0; allow, no capability issued, system clock.
- Same CLI with `--path AGENTS.md --capability fs:read`: exit 1; out-of-scope deny.
- Same CLI with `--path package.json --capability deploy:production`: exit 1; undeclared/unavailable capability deny.
- Same CLI with `--now 2026-10-04T12:00:00.000Z`: exit 1; lease-expired deny, labelled simulation.
- Same CLI with `--now invalid`: exit 1; timestamp-invalid deny, no crash or leaked input.
- Independent `npm run docs:check`: exit 0; 9 passed, 0 failed/cancelled/skipped/todo.
- Independent `git diff --check`: exit 0, empty output.
- Independent `node scripts/checkExecutionRecord.mjs --snapshot` before/after: exit 0 each; the five snapshot values above match.

## Risks and handoff

- Direct Antigravity testing remains pending. The ready-to-copy [pilot prompt](../plans/AGY_AUTONOMOUS_DRY_RUN_PILOT.md) asks it to identify its actual runtime and report primary command/snapshot evidence.
- Baseline decisions match commit HEAD only. The worktree content digest is checked separately by the pilot, not bound to an issued capability; a future write broker must bind and recheck it atomically.
- Repository scripts can be bypassed by an agent holding filesystem permissions. JIT issuance, trusted identity separation, append-only audit storage, runtime rollback/quarantine, and canary remain unimplemented.
- Secret recognition covers the tested patterns only; no claim of comprehensive secret scanning or target-environment redaction is made.
- Snapshots cover tracked/untracked non-ignored files, index, status, and HEAD; they do not prove ignored files or transient writes were unchanged.
- Policy/docs changes and this slice remain local and uncommitted. A separate worktree without these changes must report missing/stale baseline.

## Operational decision summary

The result is an executable local dry-run contract. Completion acceptance is restricted to that
surface. The local candidate has independent Codex verification with documented runtime gaps.
Direct Antigravity verification is the next handoff; it has not been represented as completed.

## TODO update

- `AUTONOMOUS-CONTROL-PLANE-DRY-RUN` → `Done` (local candidate; independently verified, uncommitted).
