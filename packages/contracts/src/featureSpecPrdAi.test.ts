import assert from 'node:assert';
import { describe, test } from 'node:test';
import { AiFeatureSpecPrdOutputSchema, GenerateFeatureSpecPrdSchema } from './featureSpecPrdAi.js';

const uuid = '3f596b26-37e1-4d82-9aac-9954679336f0';
const criterion = { given: 'Plan lengkap', when: 'PO membuka PRD', then: 'PRD tampil' };
const requirement = (title: string) => ({
  title,
  description: 'Deskripsi',
  acceptanceCriteria: [criterion],
});
const brief = { inScope: 'Masuk', outScope: 'Tidak masuk' };

describe('Feature Spec AI PRD contracts (P5c, AC-5.5)', () => {
  test('requirements: 3 to 10 are accepted, fewer or more are rejected', () => {
    const three = [requirement('a'), requirement('b'), requirement('c')];
    assert.ok(AiFeatureSpecPrdOutputSchema.safeParse({ brief, requirements: three }).success);
    assert.ok(
      !AiFeatureSpecPrdOutputSchema.safeParse({ brief, requirements: three.slice(0, 2) }).success,
    );
    assert.ok(
      !AiFeatureSpecPrdOutputSchema.safeParse({
        brief,
        requirements: Array.from({ length: 11 }, (_, i) => requirement(`r${i}`)),
      }).success,
    );
  });

  test('a requirement needs a title, a description, and 1 to 5 complete criteria', () => {
    const base = [requirement('a'), requirement('b')];
    const parse = (third: unknown) =>
      AiFeatureSpecPrdOutputSchema.safeParse({ brief, requirements: [...base, third] });
    assert.ok(parse(requirement('c')).success);
    assert.ok(!parse({ ...requirement('c'), title: ' ' }).success);
    assert.ok(!parse({ ...requirement('c'), description: '' }).success);
    assert.ok(!parse({ ...requirement('c'), acceptanceCriteria: [] }).success);
    assert.ok(
      !parse({ ...requirement('c'), acceptanceCriteria: Array(6).fill(criterion) }).success,
    );
    assert.ok(
      !parse({ ...requirement('c'), acceptanceCriteria: [{ ...criterion, then: '' }] }).success,
    );
  });

  test('brief: in-scope and out-of-scope are required, context is optional', () => {
    const requirements = [requirement('a'), requirement('b'), requirement('c')];
    assert.ok(AiFeatureSpecPrdOutputSchema.safeParse({ brief, requirements }).success);
    assert.ok(
      !AiFeatureSpecPrdOutputSchema.safeParse({ brief: { ...brief, inScope: ' ' }, requirements })
        .success,
    );
    assert.ok(
      !AiFeatureSpecPrdOutputSchema.safeParse({ brief: { inScope: 'a' }, requirements }).success,
    );
  });

  test('generate input validates ids and version, and replace defaults to false', () => {
    const parsed = GenerateFeatureSpecPrdSchema.parse({
      workspaceId: uuid,
      specId: uuid,
      version: 3,
    });
    assert.strictEqual(parsed.replace, false);
    assert.strictEqual(
      GenerateFeatureSpecPrdSchema.parse({
        workspaceId: uuid,
        specId: uuid,
        version: 3,
        replace: true,
      }).replace,
      true,
    );
    assert.ok(
      !GenerateFeatureSpecPrdSchema.safeParse({ workspaceId: 'x', specId: uuid, version: 1 })
        .success,
    );
    assert.ok(
      !GenerateFeatureSpecPrdSchema.safeParse({ workspaceId: uuid, specId: uuid, version: 0 })
        .success,
    );
  });
});
