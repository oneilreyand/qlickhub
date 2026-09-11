## Task

REQUIREMENT-DETAIL-RICH-TEXT: Align the Requirement detail input with the Product Brief rich-text
editor.

## Outcome

Requirement create/edit now uses the shared `RichTextEditor` for Detailed Description, matching the
Product Brief context editor. Planners can use bold, italic, strikethrough, headings, lists,
checklists, quotes, inline code, explicit links, media links, dividers, preview, and fullscreen focus
mode. Expanded Requirement details render the saved Markdown rather than exposing formatting
characters as plain text.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md` Context Ownership; `docs/2_WORKFLOW_AND_ROLES.md`
  Planning Context Ownership; `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md` shared RichTextEditor and
  FormattedText components; `docs/4_AGENT_DEV_GUIDELINES.md` frontend consistency and evidence.
- **Policy IDs:** `DOMAIN-004`, `UI-001`, `UI-002`, `TEST-001`, `DOC-004`.
- **Data/interface impact:** No response shape, request shape, or persistence model changed. The
  existing nullable Requirement description string can now contain Markdown and is rendered through
  the existing shared formatter.
- **Authorization impact:** None. Existing planner-only Requirement mutation remains unchanged and
  backend-enforced.
- **Migration risk:** None. No schema or migration change.

## Changed files

- `apps/web/src/components/ui/molecules/RequirementFormModal.tsx` — replaces the plain description
  textarea with the shared rich-text editor used by Product Brief.
- `apps/web/src/components/ui/organisms/RequirementManager.tsx` — renders persisted Requirement
  descriptions with the shared Markdown formatter.
- `apps/web/src/components/ui/molecules/__tests__/RequirementFormModal.test.tsx` — verifies the
  shared toolbar and bold Markdown submission.
- `apps/web/src/components/ui/organisms/__tests__/RequirementManager.test.tsx` — verifies formatted
  Markdown output and link behavior in expanded details.
- `TODO.md` — records lifecycle and evidence for the task.

## Validation

- `npm --workspace apps/web test -- --run src/components/ui/molecules/__tests__/RequirementFormModal.test.tsx src/components/ui/organisms/__tests__/RequirementManager.test.tsx`
  — passed, 2 files and 16/16 tests; 0 skipped.
- `npm --workspace apps/web test -- --run` — passed, 74 files and 375/375 tests; 0 skipped. Existing
  React `act(...)` warnings were emitted by unrelated My Task drawer, Workspace Settings, Timeline,
  and Header tests; the existing Component Gallery nested-button warning was also emitted.
- `npm --workspace apps/web run typecheck` — passed with no TypeScript errors.
- `npm --workspace apps/web run build` — passed; Vite transformed 1,699 modules and produced the
  production bundle.
- Targeted ESLint for the four changed TypeScript/TSX files — passed with 0 errors and 0 warnings.
- Targeted Prettier check for the four changed TypeScript/TSX files — passed.
- Local visual review — passed at desktop 1280 × 720 and mobile 375 × 812. The toolbar wraps without
  horizontal overflow, Write/Preview remain operable, formatted preview is readable, and modal
  actions remain visible.
- `npm run docs:check` — passed, 5/5 governance tests and documentation validation.
- `git diff --check` — passed with no whitespace errors across the current worktree diff.

## Risks or follow-up

- No known functional gap. PostgreSQL integration evidence is not applicable because this change
  reuses the existing Requirement description contract and makes no backend, authorization, or
  persistence change.

## TODO update

- `REQUIREMENT-DETAIL-RICH-TEXT` → `Done`.
