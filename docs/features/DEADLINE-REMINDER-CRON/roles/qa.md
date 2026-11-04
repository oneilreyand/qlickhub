# DEADLINE-REMINDER-CRON — QA Path

**Applicable Policy IDs:** TEST-001, DOC-005

## Inputs and preconditions

- A deployed build with the scheduler configured (AC-8), or the integration suite for AC-1–AC-6.

## Actions and evidence

- In Production: create or pick a test task due today in a test Workspace, run the job manually, and confirm one reminder per assignee/reporter; run it again and confirm no duplicate.
- Confirm a task overdue by more than 7 days and a `canceled` task receive no reminder.

## Outputs and handoff

- Results recorded in [testing.md](../testing.md) and [release.md](../release.md).
