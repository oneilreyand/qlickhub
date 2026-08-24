## Task

AGY-4.2 tightly related UI subtask — keep Rich Text Editor focus mode inside the application content region.

## Outcome

The Expand control beside Preview now opens the Rich Text Editor below the 80px application header instead of placing its top edge behind the menu. The backdrop also starts below the header, Escape still restores the editor, and the layout remains free of horizontal overflow at desktop and mobile widths.

Root cause: the My Tasks detail Drawer intentionally uses a lower stacking layer than the persistent application header, while the editor focus panel previously used `inset-4`. That placed the panel 16px from the viewport top and left 64px behind the 80px header.

## Changed files

- `apps/web/src/components/ui/molecules/RichTextEditor.tsx` — positions the expanded editor and its backdrop below the application header.
- `apps/web/src/components/ui/molecules/__tests__/RichTextEditor.test.tsx` — adds a regression assertion for the content-region focus-mode bounds.

## Validation

- `npm --prefix apps/web test -- src/components/ui/molecules/__tests__/RichTextEditor.test.tsx` — passed, 1 file / 8 tests.
- `npm --prefix apps/web test` — passed, 50 files / 223 tests, 0 skipped.
- `npm run typecheck:web` — passed.
- `npm run build:web` — passed; retained the existing Rollup warning for a JavaScript chunk larger than 500 kB.
- Isolated browser layout reproduction at 1440×900 — passed; editor top remained below the header with a 38px gap and no horizontal overflow.
- Isolated browser layout reproduction at 390×844 — passed; editor top remained below the header with a 22px gap, no horizontal overflow, and Escape restored normal mode.

## Risks or follow-up

- No data, API contract, authorization, or migration impact.
- Full authenticated browser validation was not used because the local app redirected to login; the isolated reproduction used the production Header/Drawer stacking contract and the production Rich Text Editor, then was removed.

## TODO update

- `AGY-4.2: Add Bug and Retest experiences` → `In progress`; this verified UI subtask is complete, while the parent item remains active.
