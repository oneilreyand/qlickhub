# ADR-001: Core Domain, RBAC, Traceability, and Evidence Storage Decisions

- **Status:** Approved / Active
- **Date:** 2026-08-21
- **Authors:** AGY / Antigravity Agent
- **Supersedes/Reconciles:** `docs/plans/QA_NATIVE_WORK_HUB_DELIVERY_PLAN.md`, `docs/plans/TASK_SUBTASK_COLLABORATION_PLAN.md`, Migration 48 conflict.

---

## 1. Context and Problem Statement

As Qlick Hub evolved from a QA reporting tool into a unified Task Management & Collaboration platform connecting Product Owners, Developers (Frontend, Backend, Mobile, Fullstack), and QA engineers, conflicting assumptions arose regarding:
1. Who may create and plan Dev and QA work items?
2. Who may transition task/subtask status through execution and quality review gates?
3. What constitutes the atomic traceability and coverage target (`Requirement` vs `Acceptance Criterion`)?
4. How should QA evidence and task attachments be persisted securely without data loss?

This ADR records the definitive, binding architectural decisions for these four domains.

---

## 2. Decision 1: Work Item Creation & Planning Ownership

### Decision:
- **Parent Tasks**: Created and planned exclusively by **Planners** (`owner`, `admin`, `po`).
  - *Exception*: A Developer (`dev`) may create parent tasks if and only if an Owner or Admin has explicitly granted active, non-expired `task_creation_permissions` for that Workspace.
- **Subtasks (`frontend`, `backend`, `mobile`, `fullstack`, `qa`)**: Created and planned strictly by **Planners** (`owner`, `admin`, `po`).
  - Developers and QA members cannot create, delete, or plan subtasks.
- **Planning Fields Protection**:
  - `title`, `assigneeId`, `priority`, `deliveryArea`, `folderId`, `parentTaskId`, `startDate`, `dueDate` are planning fields.
  - Executors (`dev`, `qa`) are strictly blocked from altering planning fields.
- **Self-Approval Prevention**:
  - Non-owner planners (`po`, `admin`) assigned to execute a subtask cannot mark their own subtask `done` directly from `in_review` (an independent reviewer is required). `owner` retains override capability.

### Rationale:
Prevents uncoordinated scope creep, keeps folder and workspace allocation under PO governance, and ensures accountability across delivery areas.

---

## 3. Decision 2: Status Transitions, Execution, and Quality Gates

### Decision:
- **Assigned Developer Lifecycle**:
  - Developer transitions their assigned subtask: `todo` $\rightarrow$ `in_progress` $\rightarrow$ `in_review`.
  - Developer may update technical execution `description` and handover notes.
  - When changes are requested, Developer reworks: `changes_requested` $\rightarrow$ `in_progress` $\rightarrow$ `in_review`.
  - Developer **CANNOT** mark subtasks `done` directly (must be verified by QA or PO).
  - Developer **CANNOT** modify subtasks assigned to other members.
- **QA Lifecycle**:
  - QA can review any subtask in `in_review` and transition it to `changes_requested` (mandatory `reviewNotes`) or `done`.
  - QA can execute designated QA subtasks (`deliveryArea: 'qa'`): `todo` $\rightarrow$ `in_progress` $\rightarrow$ `done`.
  - QA **CANNOT** modify parent tasks.
- **Parent Task Closure**:
  - Parent tasks are never auto-completed by the system.
  - Closing a parent task (`done`) is a deliberate PO/Owner/Admin action in Task Hub.
  - The API strictly blocks parent task completion if any child subtask (`frontend`, `backend`, `mobile`, `fullstack`, `qa`) remains incomplete.

### Rationale:
Enforces true pair-programming and two-in-a-box quality assurance. Software is only marked ready when verified by an independent role.

---

## 4. Decision 3: Atomic Coverage Target (Requirement vs Acceptance Criterion)

### Decision:
- **Requirement Entity**:
  - Represents the parent feature specification / user story, scoped to a Workspace and owned by the Product Owner.
  - Stored in persisted, structured tables (`requirements`) rather than existing solely in ephemeral browser state or freeform Markdown.
- **Acceptance Criterion Entity**:
  - Represents the atomic, testable rule of correctness under a Requirement.
  - Given a stable database identity (UUID) and sequence numbering (`AC-1`, `AC-2`, etc.).
- **Traceability Mapping**:
  - **Test Cases** link directly to **Acceptance Criteria** (and inherit parent Requirement linkage) to provide granular pass/fail coverage.
  - **Tasks / Subtasks** link to the parent **Requirement** to establish delivery scope.
- **Document Versioning Isolation**:
  - Product Briefs and QA Documents maintain version history (`v1`, `v2`, `v3`).
  - Creating a new Product Brief version snapshots the document text, but Requirement and Acceptance Criterion database records retain their stable UUIDs so historical test execution runs and audit logs are never corrupted or rewritten.

### Rationale:
Allows high-level progress tracking at the Requirement/Story level for leadership, while providing exact, atomic coverage matrices for QA test automation.

---

## 5. Decision 4: Evidence Attachments and Secure Storage Architecture

### Decision:
- **Retention of `task_attachments`**:
  - Migration 48 (`20260819000048-drop-task-attachments.cjs`) is **CANCELED / DEPRECATED** and will **NOT** be executed.
  - The `task_attachments` table is retained and will be extended for secure Workspace-scoped attachment metadata.
- **Secure File Storage Model**:
  - Binary files and test evidence are stored through an authenticated server-side storage connector (e.g. Google Drive API / Cloud Storage).
  - Storage credentials (service account keys, API tokens) and raw Drive IDs are never exposed to the frontend.
  - Previews and downloads are streamed exclusively through authenticated, role-checked API proxy endpoints or short-lived signed URLs.
- **Discussion Media vs Formal Deliverables**:
  - Discussion threads support embedded inline media via markdown/URL metadata rendered by `DiscussionMediaRenderer`.
  - Formal test run evidence, bug attachments, and QA deliverables are tracked as immutable persisted attachment records with audit logs.

### Rationale:
Complies with SAIF security guidelines and enterprise data loss prevention policies, preserving historical audit trails while protecting cloud storage credentials.

---

## 6. Role & Permission Summary Matrix

| Role | Parent Task Create | Subtask Plan/Assign | Subtask Execution | Subtask Review/Approve | Manage Requirements | Link Test Cases |
|---|---|---|---|---|---|---|
| **Owner** | Yes | Yes | Yes | Yes (Inc. Self) | Yes | Yes |
| **Admin** | Yes | Yes | Yes | Yes (Independent) | Yes | Yes |
| **PO** | Yes | Yes | Yes | Yes (Independent) | Yes | Yes |
| **Dev (FE/BE/Mob/FS)** | With Permission | No | Assigned Only (`in_review`) | No | Read-Only | Read-Only |
| **QA** | With Permission | No | QA Area Only | Yes (`done`/`changes_req`) | Read-Only | Yes |

---

## 7. Migration & Compatibility Guidelines

1. **Additive Schema Only**: All future database migrations must be additive and non-destructive.
2. **Canonical Migrations**: No skipping or dropping tables with existing production data without explicit domain approval.
3. **Multi-Record Writes**: Must execute within PostgreSQL transactions and log user-visible events in `task_activity`.
4. **Validation Evidence**: All domain logic must be backed by unit tests in `apps/api/src/policies/__tests__` and integration tests against disposable PostgreSQL databases.
