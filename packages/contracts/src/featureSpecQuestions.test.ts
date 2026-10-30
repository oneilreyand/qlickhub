import assert from 'node:assert';
import { describe, test } from 'node:test';
import { FeatureSpecPlanSchema } from './featureSpec.js';
import {
  AiFeatureSpecPlanOutputSchema,
  AiFeatureSpecQuestionsOutputSchema,
  AnswerFeatureSpecQuestionSchema,
  GenerateFeatureSpecPlanSchema,
} from './featureSpecQuestions.js';

const uuid = '3f596b26-37e1-4d82-9aac-9954679336f0';

describe('Feature Spec AI Plan contracts (P5b, AC-5.4)', () => {
  test('questions: 3 to 6 are accepted, fewer or more are rejected', () => {
    const question = { text: 'Siapa penggunanya?', reason: 'Menentukan Plan', required: true };
    assert.ok(
      AiFeatureSpecQuestionsOutputSchema.safeParse({ questions: [question, question, question] })
        .success,
    );
    assert.ok(
      !AiFeatureSpecQuestionsOutputSchema.safeParse({ questions: [question, question] }).success,
    );
    assert.ok(
      !AiFeatureSpecQuestionsOutputSchema.safeParse({ questions: Array(7).fill(question) }).success,
    );
  });

  test('questions: required defaults to true and reason to an empty text', () => {
    const parsed = AiFeatureSpecQuestionsOutputSchema.parse({
      questions: [{ text: 'a' }, { text: 'b' }, { text: 'c' }],
    });
    assert.strictEqual(parsed.questions[0].required, true);
    assert.strictEqual(parsed.questions[0].reason, '');
  });

  test('plan output: every text field, the platform, and the priority are required', () => {
    const plan = {
      problem: 'a',
      targetUsers: 'b',
      goal: 'c',
      successMeasure: 'd',
      targetPlatform: 'web',
      priority: 'high',
    };
    assert.ok(AiFeatureSpecPlanOutputSchema.safeParse(plan).success);
    assert.ok(!AiFeatureSpecPlanOutputSchema.safeParse({ ...plan, goal: '  ' }).success);
    assert.ok(
      !AiFeatureSpecPlanOutputSchema.safeParse({ ...plan, targetPlatform: 'desktop' }).success,
    );
    assert.ok(!AiFeatureSpecPlanOutputSchema.safeParse({ ...plan, startDate: '3 Nov' }).success);
  });

  test('answer and generate inputs validate ids, answer text, and version', () => {
    assert.ok(
      AnswerFeatureSpecQuestionSchema.safeParse({
        workspaceId: uuid,
        specId: uuid,
        questionId: uuid,
        answer: 'Pembeli',
      }).success,
    );
    assert.ok(
      !AnswerFeatureSpecQuestionSchema.safeParse({
        workspaceId: uuid,
        specId: uuid,
        questionId: uuid,
        answer: '   ',
      }).success,
    );
    assert.ok(
      !GenerateFeatureSpecPlanSchema.safeParse({ workspaceId: uuid, specId: uuid, version: 0 })
        .success,
    );
  });

  test('the Plan keeps aiFilledFields and rejects unknown field names', () => {
    assert.deepStrictEqual(
      FeatureSpecPlanSchema.parse({ aiFilledFields: ['goal'] }).aiFilledFields,
      ['goal'],
    );
    assert.ok(!FeatureSpecPlanSchema.safeParse({ aiFilledFields: ['title'] }).success);
  });
});
