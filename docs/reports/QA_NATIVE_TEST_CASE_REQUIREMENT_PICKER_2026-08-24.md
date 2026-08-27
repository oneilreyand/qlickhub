## Task

QA-NATIVE-TEST-CASE-REQUIREMENT-PICKER

## Outcome

QA can author the first native Test Case without depending on an existing Test Case. The QA desk now reads active, persisted Requirements linked to the current Feature and supplies them to the authoring form. If there is no active linked Requirement, native authoring is disabled with an explanation instead of failing only after form submission.

The form resets its Requirement selection each time it opens, so an asynchronously loaded Requirement is selected for a new Test Case.

## Changed files

- `apps/web/src/components/ui/organisms/myTasks/QaTestingDesk.tsx` — loads active Feature-linked Requirements and presents loading, empty, and error states for native authoring.
- `apps/web/src/components/ui/organisms/myTasks/TestCaseFormModal.tsx` — resets form state and selects the first valid Requirement when opened.
- `apps/web/src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx` — proves QA can save the first Test Case linked to an active persisted Requirement.
- `TODO.md` — marks the item done with validation evidence.

## Validation

- `npm --prefix apps/web test -- QaTestingDesk.test.tsx` — passed, 1 file and 7 tests.
- `npm --prefix apps/web run build` — passed (`tsc && vite build`). Vite emitted its existing chunk-size advisory only.
- `git diff --check` — passed.

## Risks or follow-up

- The Role Timeline calendar task remains blocked solely on authenticated desktop/mobile visual validation; it is unrelated to this Requirement picker fix.

## TODO update

- QA-NATIVE-TEST-CASE-REQUIREMENT-PICKER → Done
