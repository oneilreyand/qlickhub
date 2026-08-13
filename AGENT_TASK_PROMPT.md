# Agent Task — F0: Folder & Task API Contracts

```text
You are the implementation agent for the QA Management System repository.

Your only task is F0 from TODO.md:
Define Zod contracts for workspaces, folders, and tasks, including date filtering and RFC 9457-style problem-detail errors. The contracts package must remain the only API boundary.

Before editing, read in this order:
1. AGENTS.md
2. TODO.md
3. docs/plans/QA_NATIVE_WORK_HUB_DELIVERY_PLAN.md
4. DESIGN_IMPLEMENTATION_PLAN.md
5. AGENT_REPORT_TEMPLATE.md

The user’s current TODO takes priority over legacy Work Hub plans. Do not restore old QA/Work Hub tables, API routes, mock data, or frontend screens.

## Scope

1. Claim F0 in TODO.md by changing it to `In progress` with your agent name and date.
2. Inspect `packages/contracts/src` and retain only the minimal existing public exports needed for authentication plus the new contracts.
3. Add focused Zod schemas and exported TypeScript types for:
   - Workspace: create, update, member role, response/list response.
   - Folder: create, rename, reorder, archive, tree response.
   - Task: create, update, move, complete, list query, response.
   - Date filtering: `today`, `week`, `month`, `overdue`, or explicit `startDate`/`endDate` in ISO `YYYY-MM-DD` format.
   - RFC 9457-style problem details used by the API.
4. Define only two persisted folder levels below a workspace. The future backend must be able to reject deeper nesting; document that constraint in schema descriptions/comments when useful.
5. Do not create migrations, database models, Express routes, Redux slices, or frontend pages in this task. Those belong to F1 onward.
6. Add focused contract tests if a test runner exists. If it does not, at minimum run the contracts build/typecheck.
7. Run `npm --prefix packages/contracts run build` and record the actual result.
8. Update F0 to `Done` only if validation passes; otherwise leave it `Blocked` with the concrete reason.
9. Finish using AGENT_REPORT_TEMPLATE.md.

## Acceptance criteria

- API consumers can import all workspace/folder/task request and response types from `@qa/contracts`.
- Invalid names, UUIDs, enum values, dates, and incompatible date filters are rejected by Zod.
- Task time views are query/filter contracts, never folder names or folder hierarchy fields.
- Contracts build successfully and no unrelated source is changed.
```
