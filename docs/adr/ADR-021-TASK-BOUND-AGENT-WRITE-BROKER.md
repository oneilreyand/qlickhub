# ADR-021: Task-Bound Agent Write Broker

**Status:** Accepted for QlickHub pilot design; runtime activation pending
**Date:** 2026-09-29
**Decision owner:** Product
**Implementation stakeholders:** Product, repository administrators, host administrator, Engineering, QA, and managed agents
**Refines:** [ADR-020](ADR-020-VERIFIABLE-AGENT-CHANGE-APPROVAL-ENFORCEMENT.md)

## Context

V1 prevents unverified changes from being accepted into protected `main`, but a managed agent that
holds ordinary filesystem write access can still alter its local worktree before a pull request is
created. Instructions, repository hooks, and a wrapper inside that same worktree cannot provide a
trust boundary against the process that can alter or bypass them.

Product requires agents such as Antigravity to remain useful: they should analyze, draft patches,
and continue a task across handoffs without obtaining uncontrolled repository mutation access.
The pilot is QlickHub only. It must not change permission defaults for unrelated Codex projects.

## Decision

1. V2 uses a separate local broker as the sole holder of write capability to a clean QlickHub
   worktree. Managed agents receive a read-only project view and submit a declarative patch request
   to the broker.
2. Before applying a request, the broker verifies the V1 external approval record and that its task
   ID, plan digest, base commit, approved state change, exact file list, and expiry all match the
   request and broker worktree. A failure is fail-closed: zero repository bytes are changed.
3. The broker grants one short-lived exclusive lease per task. A handoff preserves the same task
   approval but requires the old lease to be released or expire before a new executor receives the
   lease. Parallel analysis and patch drafting remain permitted; parallel writes do not.
4. The broker records a non-secret audit event containing the task, requester, approval-record
   reference, lease lifecycle, requested/applied file paths, base commit, and outcome. It never
   writes credentials, tokens, or secret values to the repository, patch, or audit record.
5. V2 is activated only after a runtime denial test proves that a managed agent cannot write the
   broker worktree directly, together with positive broker, scope, expiry, contention, and handoff
   tests. A repository-local hook or document is not activation evidence.

## Consequences

- Agents still work autonomously until a patch is ready; one bounded external approval can authorize
  the broker to apply the approved patch and run the declared verification sequence.
- A product owner approves a bounded scope, rather than individual code lines. Any changed plan,
  new file, changed baseline, or expired authorization requires a new approval.
- The pilot needs a host-owned isolation boundary and a secret store outside both the agent view and
  repository. It cannot be implemented merely by changing source files in QlickHub.
- Multi-agent work retains parallel research/review. The only serialized phase is applying a patch
  under its short task lease.

## Alternatives considered

- **Keep V1 only:** rejected as sufficient only for protected-branch acceptance, not private local
  mutation prevention.
- **Give every agent direct write access and rely on instructions/hooks:** rejected because the
  writer can bypass or alter the local control.
- **Global Codex read-only default:** deferred/rejected for this pilot because it could disrupt
  unrelated projects; the documented configuration does not establish a QlickHub-only permission
  override.
- **Agent-specific permits:** rejected because a handoff would need fresh approval and would make
  team collaboration brittle. Task-and-scope permits preserve the control while allowing handoff.

## Rollout and recovery

1. Publish the design, task contract, and evidence requirements in the repository; this is the
   present policy slice and does not alter host permissions.
2. Build a broker prototype outside the repository with no production credentials and test it in an
   isolated fixture worktree.
3. Provision the host isolation and secret boundary, then run negative and positive runtime UAT.
4. Activate the QlickHub pilot only after a repository administrator and an independent verifier
   accept primary evidence. V1 remains required throughout.

If V2 is unavailable or falsely rejects a valid request, pause the affected task, retain audit
evidence, and use the existing V1-protected PR workflow after explicit human approval. Do not grant
managed agents direct write access as a workaround.
