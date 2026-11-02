import assert from 'node:assert';
import { describe, test } from 'node:test';
import {
  AiFeatureSpecTasksOutputSchema,
  GenerateFeatureSpecTasksSchema,
} from './featureSpecTasksAi.js';

const uuid = '3f596b26-37e1-4d82-9aac-9954679336f0';
const subtask = (title: string) => ({
  title,
  description: 'Deskripsi',
  deliveryArea: 'backend',
  priority: 'medium',
  requirementKeys: ['R1'],
});

describe('Feature Spec AI Tasks contracts (P5d-1, AC-5.6)', () => {
  test('subtasks: 3 to 30 are accepted, fewer or more are rejected', () => {
    const three = [subtask('a'), subtask('b'), subtask('c')];
    assert.ok(AiFeatureSpecTasksOutputSchema.safeParse({ subtasks: three }).success);
    assert.ok(!AiFeatureSpecTasksOutputSchema.safeParse({ subtasks: three.slice(0, 2) }).success);
    assert.ok(
      !AiFeatureSpecTasksOutputSchema.safeParse({
        subtasks: Array.from({ length: 31 }, (_, i) => subtask(`t${i}`)),
      }).success,
    );
  });

  test('a subtask needs a title, a description, a known area, a priority, and a Requirement', () => {
    const base = [subtask('a'), subtask('b')];
    const parse = (third: unknown) =>
      AiFeatureSpecTasksOutputSchema.safeParse({ subtasks: [...base, third] });
    assert.ok(parse(subtask('c')).success);
    assert.ok(!parse({ ...subtask('c'), title: ' ' }).success);
    assert.ok(!parse({ ...subtask('c'), description: '' }).success);
    assert.ok(!parse({ ...subtask('c'), deliveryArea: 'design' }).success);
    assert.ok(!parse({ ...subtask('c'), priority: 'asap' }).success);
    assert.ok(!parse({ ...subtask('c'), requirementKeys: [] }).success);
  });

  test('dates and the assignee are lenient so the server can repair them instead of failing', () => {
    const lenient = {
      ...subtask('c'),
      startDate: '3 Nov',
      dueDate: null,
      assigneeId: 'bukan-uuid',
    };
    assert.ok(
      AiFeatureSpecTasksOutputSchema.safeParse({
        subtasks: [subtask('a'), subtask('b'), lenient],
      }).success,
    );
  });

  test('generate input validates ids and version, and replace defaults to false', () => {
    const parsed = GenerateFeatureSpecTasksSchema.parse({
      workspaceId: uuid,
      specId: uuid,
      version: 3,
    });
    assert.strictEqual(parsed.replace, false);
    assert.strictEqual(
      GenerateFeatureSpecTasksSchema.parse({
        workspaceId: uuid,
        specId: uuid,
        version: 3,
        replace: true,
      }).replace,
      true,
    );
    assert.ok(
      !GenerateFeatureSpecTasksSchema.safeParse({ workspaceId: 'x', specId: uuid, version: 1 })
        .success,
    );
    assert.ok(
      !GenerateFeatureSpecTasksSchema.safeParse({ workspaceId: uuid, specId: uuid, version: 0 })
        .success,
    );
  });
});
