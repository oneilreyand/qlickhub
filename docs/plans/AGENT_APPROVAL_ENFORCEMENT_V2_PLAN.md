# Agent Approval Enforcement V2 — QlickHub Pilot Plan

**Status:** Proposed — policy/design slice approved; host implementation checkpoints pending
**Task:** `AGENT-APPROVAL-ENFORCEMENT-V2`
**Policy boundaries:** `AI-002`, `AI-004`, `AI-006`, `AI-007`, `AI-009`, `AI-010`, `AI-012`, `DOC-001`, `DOC-002`, `DOC-003`, `DOC-004`
**Decision record:** [ADR-021](../adr/ADR-021-TASK-BOUND-AGENT-WRITE-BROKER.md)

## Confirmed facts

- V1 resolves a GitHub approval record in CI and protects acceptance into `main`, but it does not
  remove a local agent's direct write capability.
- `AGENTS.md` requires a bounded user approval before every state-changing execution step and does
  not permit an AI to claim autonomous mutation as a control.
- The current Codex configuration has no configured QlickHub write broker or permission profile.
  The documented permission profiles/defaults are host-wide; no QlickHub-only permission override
  is confirmed. A global default therefore risks other projects.
- The Product decision is a QlickHub-only pilot. Agents, including Antigravity, should continue
  autonomous read/draft/test preparation; writes must be routed through a capability broker.
- This task has no product API, UI, database, migration, or deployment scope.

## Unresolved decisions and blockers

- The concrete isolated host/session mechanism, broker process owner, and secure credential store
  are unverified. They must be selected by the host administrator before implementation.
- The production-quality broker API/transport, patch format, and audit retention policy are not yet
  specified. A fixture prototype may not use production tokens or the production worktree.
- Runtime enforcement cannot be truthfully claimed until a managed process is proven unable to
  write directly. Repository source alone cannot prove this.

## Work Readiness Assessment

| Dimension | Score | Basis |
| --- | ---: | --- |
| Requirement clarity | 1 | Pilot outcome is chosen; host isolation details remain unknown. |
| Affected layers | 2 | Host permissions, broker, GitHub approval, repository governance, and agent workflow. |
| Data/migration | 0 | No product persistence or migration. |
| Authorization | 2 | Establishes a direct-write capability boundary. |
| Shared contract | 2 | Broker request, lease, and audit contracts are new shared controls. |
| Coupling | 2 | Governs every managed QlickHub agent and handoff. |
| Validation | 2 | Requires denial/runtime UAT, external approval, and independent verification. |
| External dependency | 2 | Depends on GitHub, Codex/host isolation, and a secure secret boundary. |
| **Total** | **13 / 16** | **Very high — documentation slice Ready; broker activation Blocked until host decisions and primary runtime evidence exist.** |

## Acceptance criteria and evidence

| AC | Objective evidence | Minimum level | Verifier |
| --- | --- | --- | --- |
| A managed agent cannot alter a V2 worktree directly. | Isolated-session write attempt is denied; worktree hash/diff remains unchanged. | E4 | Independent verifier + host administrator |
| A valid approved patch is applied only by the broker. | Broker integration test with GitHub approval, before/after commit and audit event. | E2/E4 | CI + independent verifier |
| Scope expansion, wrong base, expired approval, invalid digest, or missing approval changes zero bytes. | Negative test matrix with before/after worktree assertions. | E2/E4 | CI + independent verifier |
| Only one task writer operates at a time; a handoff succeeds after release/expiry. | Lease contention and transfer integration/UAT evidence. | E2/E4 | Independent verifier |
| Agents may work in parallel without agent-specific re-approval. | Two read/draft clients; one task-scope approval; audited lease transfer. | E4 | Product + independent verifier |
| Secrets never enter repository, patch, or audit evidence. | Configuration/audit inspection plus secret-scanning/negative test appropriate to the host. | E2/E4 | Host administrator |
| Existing V1 protected-branch enforcement remains active. | Required CI approval check and V1 regression result. | E4 | Repository administrator |

## Change Impact Map

`agent draft` → `broker request` → `external approval validation` → `exclusive task lease` →
`isolated worktree patch` → `non-secret audit` → `V1-protected pull request`.

| Area | Classification | Intended impact |
| --- | --- | --- |
| Agent operating protocol / SSoT | Cross-boundary | Defines read/draft versus broker-controlled mutation. |
| Host permissions and isolated worktree | Cross-boundary | Removes direct managed-agent write access for the QlickHub pilot. |
| Broker request/lease/audit contract | Cross-boundary | Adds enforceable scope and handoff control. |
| GitHub approval resolver | Module change | Reuses V1 approval record; broker validates rather than trusts local claims. |
| Application API, UI, database, migrations | None | Explicitly out of scope. |
| V1 CI / branch protection | Module change | Remains required; V2 adds local-write prevention and cannot weaken it. |

## Decision Snapshot

| Option | Decision | Reason |
| --- | --- | --- |
| QlickHub-only isolated broker pilot | Selected | Delivers a real write boundary without changing other Codex projects. |
| Global permission default | Deferred | Affects unrelated projects and lacks a confirmed project-scoped configuration path. |
| Repository hook/wrapper | Rejected | A process with direct write permission can bypass it. |
| Agent-specific write permits | Rejected | Makes handoffs brittle and creates unnecessary re-approval. |
| Task/scope lease after external approval | Selected | Keeps ownership with the task and preserves controlled multi-agent handoff. |

## Files and interfaces likely to change by slice

1. **Policy/design (this slice):** `TODO.md`, `docs/4_AGENT_DEV_GUIDELINES.md`,
   `docs/POLICY_REGISTRY.md`, `docs/adr/ADR-021-TASK-BOUND-AGENT-WRITE-BROKER.md`,
   `docs/adr/README.md`, this plan, and the task manifest. No application runtime change.
2. **Fixture prototype (separate approval):** an external, disposable broker fixture only. Its
   source location, interface, and secret strategy remain blocked pending host decision.
3. **Host enforcement (separate approval):** host profile/session configuration plus broker-owned
   clean worktree. This changes operational access and requires recovery/rollback validation.
4. **Activation/UAT (separate approval):** test requests and audit records; no production data or
   deployment is authorized by this plan.

## Bounded implementation sequence and recovery

1. Publish this policy/design slice and create a V1-approved documentation PR. Validate local
   documentation and manifest structure; no host access changes occur.
2. Obtain a host-administrator decision for the isolated QlickHub session, broker location,
   credential store, and rollback owner. If absent, the task remains `Blocked` after policy work.
3. Create a disposable fixture prototype, prove all negative conditions first, then positive apply
   and lease handoff. Destroy only the fixture worktree after its evidence is retained.
4. Review primary evidence independently. Activate the pilot only after explicit user approval for
   the named host configuration and runtime cutover.

Rollback never disables V1. If the broker fails, stop broker writes and use the existing V1 PR path
only with a new explicit approval; do not restore managed-agent direct write access as a shortcut.

## Quality review intent

Before this task is called done, the reviewer will explicitly inspect reuse of V1 validation,
duplicate authorization logic, obsolete fallback paths, secret boundaries, lease failure behavior,
and regression coverage. This policy slice collects no runtime proof and does not claim V2 active.
