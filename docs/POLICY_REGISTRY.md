# Qlick Hub Policy Registry

**Status:** Active policy index  
**Owner:** Product and Engineering  
**Last reviewed:** 2026-09-02  
**Scope:** Stable identifiers for rules already approved in Qlick Hub SSoT documents.

This registry gives humans, tests, Feature Knowledge Cards, reports, and AI agents a stable way
to cite important rules. It summarizes where a rule lives but does not override its canonical
source. Add or change policy only in the applicable SSoT (and ADR when the decision changes),
then update this index.

## Domain and Hierarchy

| Policy ID  | Rule summary                                                               | Canonical source                                                             |
| ---------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| DOMAIN-001 | A Folder hierarchy has a maximum depth of two levels.                      | [Architecture §4](1_ARCHITECTURE.md#4-diagram-relasi-entitas--hierarki-data) |
| DOMAIN-002 | A Feature/Story is a root Task and may have only one direct Subtask level. | [Architecture §4](1_ARCHITECTURE.md#4-diagram-relasi-entitas--hierarki-data) |
| DOMAIN-003 | Requirements belong to a Workspace and link many-to-many to root Tasks.    | [Architecture §4](1_ARCHITECTURE.md#4-diagram-relasi-entitas--hierarki-data) |

## Authentication and Authorization

| Policy ID | Rule summary                                                                              | Canonical source                                                      |
| --------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| AUTH-001  | Workspace access requires an authenticated user with active Workspace membership.         | [Architecture §5](1_ARCHITECTURE.md#5-model-keamanan--otorisasi-rbac) |
| AUTH-002  | Authorization is enforced by backend policy/services; UI visibility is not authorization. | [Agent Guidelines](4_AGENT_DEV_GUIDELINES.md)                         |
| AUTH-003  | Developer or QA parent-Task creation requires active, expiring owner/admin delegation.    | [Architecture §5](1_ARCHITECTURE.md#aturan-delegasi-pembuatan-task)   |
| AUTH-004  | Parent-Task delegation never grants permission to plan Subtasks.                          | [Architecture §5](1_ARCHITECTURE.md#aturan-delegasi-pembuatan-task)   |

## Delivery Workflow

| Policy ID | Rule summary                                                                   | Canonical source                                                                    |
| --------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| FLOW-001  | Developers execute assigned Subtasks through the approved transition sequence. | [Workflow §4](2_WORKFLOW_AND_ROLES.md#4-siklus-hidup-subtask-subtask-state-machine) |
| FLOW-002  | Planning fields remain controlled by owner, admin, or PO.                      | [Workflow §4](2_WORKFLOW_AND_ROLES.md#aturan-transisi-subtask)                      |
| FLOW-003  | Developer assignment must match Workspace specialty and Subtask delivery area. | [Workflow §3](2_WORKFLOW_AND_ROLES.md#3-spesialisasi-developer--penugasan-subtask)  |

## QA and Release

| Policy ID   | Rule summary                                                                              | Canonical source                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| QA-001      | QA authors draft Test Cases; PO/admin publication is required before active execution.    | [Workflow §5](2_WORKFLOW_AND_ROLES.md#5-manajemen-pengujian-native-qa-qa-test-management)         |
| QA-002      | Test Results are immutable, append-only execution records.                                | [Workflow §5](2_WORKFLOW_AND_ROLES.md#b-hasil-uji-yang-imutabel-immutable-test-results)           |
| QA-003      | A Developer cannot close a Bug; independent QA retest determines closure or reopening.    | [Workflow §6](2_WORKFLOW_AND_ROLES.md#6-siklus-defek--retest-bug--retest-lifecycle)               |
| RELEASE-001 | Readiness is derived by the backend from coverage, pass rate, and unresolved severe Bugs. | [Workflow §7](2_WORKFLOW_AND_ROLES.md#7-gerbang-kesiapan--keputusan-rilis-release-readiness-gate) |
| RELEASE-002 | QA submits quality sign-off; PO owns the formal release decision.                         | [Workflow §7](2_WORKFLOW_AND_ROLES.md#7-gerbang-kesiapan--keputusan-rilis-release-readiness-gate) |

## Data, Interface, UI, and AI

| Policy ID    | Rule summary                                                                                                 | Canonical source                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| DATA-001     | Production workflow data must be persisted and returned through authenticated backend interfaces.            | [Agent Guidelines §3](4_AGENT_DEV_GUIDELINES.md#3-kebijakan-basis-data--bukti-pengujian-database--test-evidence) |
| DATA-002     | Schema changes use canonical Sequelize migrations and PostgreSQL validation.                                 | [Architecture §6](1_ARCHITECTURE.md#6-arsitektur-teknis--database)                                               |
| CONTRACT-001 | `packages/contracts` is the shared API contract boundary between frontend and backend.                       | [Architecture §6](1_ARCHITECTURE.md#6-arsitektur-teknis--database)                                               |
| UI-001       | Frontend work reuses the Atomic Design system and approved Stitch tokens.                                    | [UI Design System](3_UI_ATOMIC_DESIGN_SYSTEM.md)                                                                 |
| UI-002       | Data-driven UI covers loading, empty, error, disabled, and permission-denied states when applicable.         | [Agent Guidelines](4_AGENT_DEV_GUIDELINES.md)                                                                    |
| AI-001       | AI produces cited drafts and may not autonomously mutate production data without explicit user Apply action. | [Architecture §6](1_ARCHITECTURE.md#d-batasan-tata-kelola-ai-ai-governance)                                      |
| TEST-001     | Database/interface integration tests use disposable PostgreSQL with canonical migrations.                    | [Agent Guidelines §3](4_AGENT_DEV_GUIDELINES.md#3-kebijakan-basis-data--bukti-pengujian-database--test-evidence) |

## Documentation Governance

| Policy ID | Rule summary                                                                                      | Canonical source                                                                               |
| --------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| DOC-001   | Contributors and AI agents start with the Product Knowledge Map, then read every applicable SSoT. | [Agent Guidelines §1](4_AGENT_DEV_GUIDELINES.md#1-hirarki-kebenaran-source-of-truth-hierarchy) |
| DOC-002   | A policy change requires an ADR and affected canonical SSoT update before implementation.         | [Documentation Governance Gate](4_AGENT_DEV_GUIDELINES.md#documentation-governance-gate)       |
| DOC-003   | Reports record observed evidence and cannot create or replace product policy.                     | [Documentation Governance Gate](4_AGENT_DEV_GUIDELINES.md#documentation-governance-gate)       |
| DOC-004   | Documentation and policy changes must pass `npm run docs:check` through the validation/CI gate.   | [Documentation Governance Gate](4_AGENT_DEV_GUIDELINES.md#documentation-governance-gate)       |

## Registry Rules

1. A Policy ID is permanent. Do not reuse an ID for a different meaning.
2. A changed product decision requires an ADR and an update to the canonical SSoT first.
3. A deleted rule remains discoverable as superseded; do not erase its history.
4. Feature Cards cite every Policy ID that constrains their behavior.
5. Tests and reports should cite Policy IDs when they prove or diagnose a policy boundary.
6. `npm run docs:check` rejects duplicate and unknown Policy IDs in active Feature Cards.
