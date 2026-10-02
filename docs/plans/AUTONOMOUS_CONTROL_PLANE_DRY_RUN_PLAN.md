# Autonomous Control-Plane Dry-Run Plan

**Status:** Completed locally — Codex verifier Accepted with gaps; Antigravity pilot ready  
**Task:** `AUTONOMOUS-CONTROL-PLANE-DRY-RUN`  
**Execution Record:** [`quality/execution-records/AUTONOMOUS-CONTROL-PLANE-DRY-RUN.json`](../../quality/execution-records/AUTONOMOUS-CONTROL-PLANE-DRY-RUN.json)  
**Policy boundaries:** `AI-002`, `AI-003`, `AI-004`, `AI-008`, `AI-009`, `AI-012`, `AI-015`–`AI-019`, `DOC-001`, `DOC-003`, `DOC-004`

## Confirmed facts

- [ADR-027](../adr/ADR-027-AUTONOMOUS-AGENT-OPERATIONS.md) authorises policy-bound autonomous operation, but [Autonomous Agent Operations §7](../5_AUTONOMOUS_AGENT_OPERATIONS.md#7-runtime-activation-boundary) explicitly says runtime activation is not yet proven.
- `scripts/checkQualityManifest.mjs` is a legacy quality/approval manifest checker. It does not validate the full autonomous Execution Record required by `AI-009`.
- The first vertical slice can be a deterministic, local, deny-by-default validator. It must not issue a credential, write through a broker, change host permissions, access a provider, or deploy.

## Work Readiness Assessment

| Dimension           |      Score | Evidence                                                                                             |
| ------------------- | ---------: | ---------------------------------------------------------------------------------------------------- |
| Requirement clarity |          1 | The dry-run boundary and negative cases are specified; host enforcement is explicitly deferred.      |
| Affected layers     |          1 | Local Node tooling, its tests, package command, and operational documentation.                       |
| Data/migration      |          0 | No product data or schema change.                                                                    |
| Authorization       |          1 | Validates a future operational capability contract but does not grant one.                           |
| Shared contract     |          1 | Adds a repository-local JSON record format only.                                                     |
| Coupling            |          1 | Reused by future managed-agent tasks, without application runtime consumers.                         |
| Validation          |          0 | Static/unit checks and independent re-run; no target runtime UAT.                                    |
| External dependency |          0 | No network, provider, credential, or cloud dependency.                                               |
| **Total**           | **5 / 16** | **Ready.** The slice is medium-risk tooling; it has a separate verifier and no privileged operation. |

## Acceptance criteria and evidence

| AC                                                                                       | Minimum evidence                               | Verifier                |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------- |
| Incomplete, expired, scope-violating, or read-only write records are denied.             | E2: deterministic negative tests with reasons. | CI or independent agent |
| A complete in-scope dry-run record is allowed without issuing a token or changing state. | E2: CLI decision and unit test.                | CI or independent agent |
| Audit rendering redacts secret-shaped values.                                            | E2: deterministic redaction test.              | CI or independent agent |
| Documentation does not claim runtime activation from this slice.                         | E1/E2: SSoT wording and `npm run docs:check`.  | Independent agent       |

Review follow-up in the same slice: match the record baseline against observed Git HEAD; reject
invalid clocks and missing AC-specific evidence commands; exercise secret redaction in the full
decision output; and capture content/index/status digests for the read-only verifier. Tests use
fixed clocks and labelled test factories. The local CLI supports a labelled simulation clock; no
runtime capability is issued under either clock mode.

## Unresolved decisions and interface impact

The runtime isolation mechanism, capability issuer, lease store, trusted verifier identity,
append-only audit storage, and target recovery remain unresolved for a future implementation.
This slice adds a local JSON/CLI interface only. Product API, application authorization, data,
migrations, and deployment have no impact. The verifier available through this session is a Codex
chat titled `Cek kesiapan worktree Agy`; a direct Antigravity pilot remains separate evidence.

The worktree advanced from `611acc9` to `0333a67` during this task. Primary inspection of
`git diff --name-only 611acc94e744dbfbef54371589472d58e135af07..0333a67473a696fe77283314b48ada80420f4069`
showed only application source/tests/contracts outside this slice. The validator correctly denied
the stale record. After reviewing this non-overlap, the planner refreshed the record baseline to
`0333a67473a696fe77283314b48ada80420f4069` without extending its lease or capability scope.

## Files in this slice

The Execution Record lists the exact paths: the validator/tests, record, package commands,
`scripts/checkDocs.mjs` (include the new SSoT in required-file and local-link checks), report
template fields, SSoT dry-run instructions, plan, pilot prompt, report, and TODO. Pre-existing dirty
policy changes belong to the prior task and are preserved. No commit or external publication is
part of this slice.

## Change Impact Map

`Execution Record JSON` → `local validator` → `allow/deny decision` → `test output and non-secret audit preview`.

| Area                                        | Impact                                                                             |
| ------------------------------------------- | ---------------------------------------------------------------------------------- |
| Local tooling                               | New validator and Node test suite.                                                 |
| Operational documentation                   | Defines the dry-run command and its non-enforcement boundary.                      |
| Application API/UI/database/RBAC/deployment | None.                                                                              |
| Secrets/providers                           | None; the validator recognises redaction patterns but accepts no credential input. |

## Decision Snapshot

| Option                                         | Decision     | Reason                                                                                                        |
| ---------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------- |
| Standalone local deny-by-default validator     | Selected     | Delivers executable policy checks without falsely claiming a host or Production trust boundary.               |
| Extend legacy human-approval manifest checker  | Not selected | Its approval-record model has different semantics and would obscure the autonomous Execution Record contract. |
| Activate a broker/host permission boundary now | Blocked      | Requires isolated runtime, credential custody, recovery testing, and independent target-environment evidence. |

## Recovery and limits

The record declares exact local paths, zero retry, no provider/commit/deployment capability, and a
20-minute timeout. These limits are checked as inputs; the CLI does not enforce an actual timer or
perform quarantine. On denial it exits non-zero. Preserve existing user changes when reverting this
slice: never restore every scoped file from HEAD in the shared dirty worktree. No runtime state needs
rollback.
