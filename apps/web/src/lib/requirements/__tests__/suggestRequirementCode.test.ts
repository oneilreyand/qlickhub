import { describe, expect, it } from 'vitest';
import type { Requirement } from '@qlick/contracts';
import { suggestRequirementCode } from '../suggestRequirementCode';

const requirement = (code: string, createdAt = '2026-09-11T00:00:00.000Z'): Requirement => ({
  id: `requirement-${code}`,
  workspaceId: 'workspace-1',
  code,
  title: code,
  description: null,
  url: null,
  status: 'active',
  createdBy: 'planner-1',
  createdAt,
  updatedAt: createdAt,
});

describe('suggestRequirementCode', () => {
  it('continues the numeric series used by Requirement linked to the Task', () => {
    const linked = [requirement('REQ-101'), requirement('REQ-102')];

    expect(suggestRequirementCode(linked, linked)).toBe('REQ-103');
  });

  it('skips a suggested code that is already used elsewhere in the Workspace', () => {
    const linked = [requirement('REQ-101')];
    const workspace = [...linked, requirement('REQ-102')];

    expect(suggestRequirementCode(linked, workspace)).toBe('REQ-103');
  });

  it('preserves a Task-specific prefix and numeric padding', () => {
    const linked = [requirement('UAT-MCU-009')];

    expect(suggestRequirementCode(linked, linked)).toBe('UAT-MCU-010');
  });

  it('uses the first available REQ code when the Task has no numeric series', () => {
    const workspace = [requirement('REFERENCE'), requirement('REQ-001')];

    expect(suggestRequirementCode([], workspace)).toBe('REQ-002');
  });
});
