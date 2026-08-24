import type { ReadinessEvaluation, ReadinessGate, ReadinessSnapshotV2 } from '@qlick/contracts';

export type ReadinessGateFacts = Pick<
  ReadinessSnapshotV2,
  'development' | 'requirements' | 'testExecution' | 'bugs' | 'qaSignOff'
>;

function gate(
  code: ReadinessGate['code'],
  label: string,
  passed: boolean,
  reason: string,
): ReadinessGate {
  return { code, label, status: passed ? 'passed' : 'failed', reason };
}

export function evaluateReadinessGates(facts: ReadinessGateFacts): ReadinessEvaluation {
  const requirementsCovered =
    facts.requirements.total > 0 &&
    facts.requirements.coveredByActiveTestCases === facts.requirements.total;
  const requirementReason =
    facts.requirements.total === 0
      ? 'No requirements are linked to this Feature / Story.'
      : requirementsCovered
        ? `All ${facts.requirements.total} linked requirements are covered by active test cases.`
        : `${facts.requirements.coveredByActiveTestCases}/${facts.requirements.total} linked requirements are covered by active test cases.`;

  const latestTestsPassed =
    facts.testExecution.totalTestCases > 0 &&
    facts.testExecution.passed === facts.testExecution.totalTestCases &&
    facts.testExecution.failed === 0 &&
    facts.testExecution.blocked === 0 &&
    facts.testExecution.skipped === 0 &&
    facts.testExecution.unexecuted === 0;
  const latestTestReason =
    facts.testExecution.totalTestCases === 0
      ? 'No active mapped test cases are available for execution.'
      : latestTestsPassed
        ? `Latest results passed for all ${facts.testExecution.totalTestCases} active mapped test cases.`
        : `Latest results: ${facts.testExecution.passed}/${facts.testExecution.totalTestCases} passed, ${facts.testExecution.failed} failed, ${facts.testExecution.blocked} blocked, ${facts.testExecution.skipped} skipped, ${facts.testExecution.unexecuted} unexecuted.`;

  const criticalHighClear = facts.bugs.criticalOrHighUnverified === 0;
  const criticalHighReason = criticalHighClear
    ? 'No unverified Critical or High bugs are linked to this Feature / Story.'
    : facts.bugs.criticalOrHighUnverified === 1
      ? '1 unverified Critical or High bug remains.'
      : `${facts.bugs.criticalOrHighUnverified} unverified Critical or High bugs remain.`;

  const developmentComplete =
    facts.development.total > 0 && facts.development.completed === facts.development.total;
  const developmentReason =
    facts.development.total === 0
      ? 'No development subtasks are linked to this Feature / Story.'
      : developmentComplete
        ? `All ${facts.development.total} development subtasks are complete.`
        : `${facts.development.completed}/${facts.development.total} development subtasks are complete.`;

  const qaApproved = facts.qaSignOff?.decision === 'approved';
  const qaReason = !facts.qaSignOff
    ? 'No QA Sign-off is recorded.'
    : qaApproved
      ? 'The latest QA Sign-off is approved.'
      : 'The latest QA Sign-off is rejected.';

  const gates: ReadinessGate[] = [
    gate('requirement_coverage', 'Requirement coverage', requirementsCovered, requirementReason),
    gate('latest_test_results', 'Latest Test Run results', latestTestsPassed, latestTestReason),
    gate('critical_high_bugs', 'Critical/High bugs', criticalHighClear, criticalHighReason),
    gate(
      'development_completion',
      'Development completion',
      developmentComplete,
      developmentReason,
    ),
    gate('qa_sign_off', 'QA Sign-off', qaApproved, qaReason),
  ];
  const failedGateCodes = gates.filter((item) => item.status === 'failed').map((item) => item.code);

  return {
    ready: failedGateCodes.length === 0,
    gates,
    failedGateCodes,
  };
}
