# E2E-SDLC-FLOW — Authorization Matrix

**Status:** Disetujui
**Applicable Policy IDs:** DOC-005, QA-004, QA-010, RELEASE-001

| Action                                 | Owner / Admin | PO  | Developer          | QA                           | Backend enforcement and evidence                                                                                                         |
| -------------------------------------- | ------------- | --- | ------------------ | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Read Developer readiness               | Yes           | Yes | If task accessible | If task accessible           | `getDeveloperReadiness` + `taskService.getTask`; test outsider `403`, non-QA `400`                                                       |
| Create Test Run                        | No            | No  | No                 | Assigned QA, readiness met   | `createTestRun` `409`; `testManagementApiIntegration` readiness test                                                                     |
| Record retest Result + Attempt         | No            | No  | No                 | Origin QA subtask assignee   | `applyRetestAttempt` in `recordTestResult`; `bugApiIntegration` contextual retest test                                                   |
| Approve Developer subtask in review    | Yes           | Yes | Not own work       | Yes (QA reviewer transition) | `taskPolicy.ts` existing rules                                                                                                           |
| Approve tested work + complete QA (P7) | No            | No  | No                 | Assigned QA, gate met        | `completeQaReviewImpl`: route `qa`, assignee check, same transitions and gate in one transaction; `testManagementApiIntegration` P7 test |
| Complete QA subtask                    | No            | No  | No                 | Assigned QA, gate met        | `taskLifecycle.ts` QA completion gate                                                                                                    |
| Read QA Test Cases (P7, read-only)     | Yes           | Yes | If task accessible | Yes                          | `getTaskTestExecutions` (`assertCanReadTestManagement`, `assertCanAccessTask`); recording results stays QA-only                          |
| Approve Product Brief                  | Yes           | Yes | No                 | No                           | `qaDocumentService` planner rule                                                                                                         |
| Record Release Decision                | Yes           | Yes | No                 | No (signer cannot)           | `assertCanCreateReleaseDecision`                                                                                                         |

UI visibility is not authorization: the web app only follows the Workspace role (`selectActiveWorkspaceRole`).
