import assert from 'node:assert';
import { describe, test } from 'node:test';
import {
  buildDeterministicFallbackDraft,
  isObviouslyUnintelligiblePrompt,
} from '../geminiClient.js';

describe('Gemini task-draft prompt quality guard', () => {
  const unintelligiblePrompt =
    'aswdas asdnasjkldn asdjjaskld askljdaskl dsakljdklas dklasjdnla jkdszbfl sdzkhsdzbflsdjkb fsdzkjbfsdzfsdz';

  test('returns a cited clarification rather than a fabricated Feature for clearly unintelligible text', () => {
    assert.strictEqual(isObviouslyUnintelligiblePrompt(unintelligiblePrompt), true);

    const result = buildDeterministicFallbackDraft(unintelligiblePrompt);
    assert.strictEqual(result.outcome, 'clarification');
    if (result.outcome === 'clarification') {
      assert.ok(result.clarification.message.length > 0);
      assert.ok(result.clarification.questions.length > 0);
      assert.strictEqual(result.clarification.citations[0].excerpt, unintelligiblePrompt);
    }
  });

  test('continues to produce a reviewable draft for a descriptive product request', () => {
    const result = buildDeterministicFallbackDraft(
      'Tambahkan pembayaran QRIS di checkout dengan validasi webhook dan batas waktu bayar 15 menit.',
    );

    assert.strictEqual(result.outcome, 'draft');
    if (result.outcome === 'draft') {
      assert.ok(result.draft.task.title.length > 0);
      assert.ok(result.draft.requirements.length > 0);
    }
  });
});
