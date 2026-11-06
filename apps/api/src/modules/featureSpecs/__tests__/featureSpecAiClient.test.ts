import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { afterEach, beforeEach, describe, test, type TestContext } from 'node:test';
import { AiFeatureSpecTasksOutputSchema } from '@qlick/contracts';
import { env } from '../../../config/env.js';
import {
  FeatureSpecAiUnavailableError,
  GeminiFeatureSpecAiClient,
} from '../featureSpecAiClient.js';

const originalFetch = globalThis.fetch;
const originalKey = env.GEMINI_API_KEY;
// External-provider contract fixture only; no real Gemini key, prompt, or database is used.
const fixtureAnswer = AiFeatureSpecTasksOutputSchema.parse({
  subtasks: ['backend', 'frontend', 'qa'].map((deliveryArea) => ({
    title: `Checkout ${deliveryArea}`,
    description: `Implement and verify the checkout ${deliveryArea} work.`,
    deliveryArea,
    priority: 'medium',
    startDate: '2026-11-07',
    dueDate: '2026-11-20',
    requirementKeys: ['R1'],
  })),
});
const request = { system: 'Fixture system', prompt: 'Fixture prompt', responseSchema: {} };

beforeEach(() => {
  env.GEMINI_API_KEY = 'fixture-key-not-a-real-credential';
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  env.GEMINI_API_KEY = originalKey;
});

/** Virtual time controls only the external provider and clock, not the application adapter. */
function delayedProvider(t: TestContext, delayMs: number) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.mock.method(AbortSignal, 'timeout', (timeoutMs: number) => {
    const controller = new AbortController();
    setTimeout(
      () => controller.abort(new DOMException('Fixture timeout', 'TimeoutError')),
      timeoutMs,
    );
    return controller.signal;
  });
  let calls = 0;
  globalThis.fetch = async (_input, init) => {
    calls++;
    return new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(
        () =>
          resolve(
            Response.json({
              candidates: [{ content: { parts: [{ text: JSON.stringify(fixtureAnswer) }] } }],
            }),
          ),
        delayMs,
      );
      init?.signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(init.signal?.reason);
        },
        { once: true },
      );
    });
  };
  return () => calls;
}

describe('Gemini Feature Spec request deadlines', () => {
  test('accepts a Task answer at 31 seconds instead of aborting at the old cutoff', async (t) => {
    const calls = delayedProvider(t, 31_000);
    const taskRequest = { ...request, timeoutMs: 90_000 };
    const result = new GeminiFeatureSpecAiClient().generateJson(taskRequest);
    t.mock.timers.tick(31_000);
    assert.deepEqual(await result, fixtureAnswer);
    assert.equal(calls(), 1);
  });

  test('keeps an unfinished Task alive until 90 seconds, then reports the existing failure without retry', async (t) => {
    const calls = delayedProvider(t, 91_000);
    let settled = false;
    const taskRequest = { ...request, timeoutMs: 90_000 };
    const result = new GeminiFeatureSpecAiClient().generateJson(taskRequest);
    const rejected = assert.rejects(result, (error: unknown) => {
      settled = true;
      assert.ok(error instanceof FeatureSpecAiUnavailableError);
      assert.equal(error.message, 'The AI service did not respond. Try again.');
      return true;
    });
    t.mock.timers.tick(89_999);
    await setImmediate();
    assert.equal(settled, false);
    t.mock.timers.tick(1);
    await rejected;
    assert.equal(calls(), 1);
  });

  test('still stops default requests at 30 seconds', async (t) => {
    delayedProvider(t, 31_000);
    let settled = false;
    const result = new GeminiFeatureSpecAiClient().generateJson(request);
    const rejected = assert.rejects(result, (error: unknown) => {
      settled = true;
      return error instanceof FeatureSpecAiUnavailableError;
    });
    t.mock.timers.tick(29_999);
    await setImmediate();
    assert.equal(settled, false);
    t.mock.timers.tick(1);
    await rejected;
    assert.equal(settled, true);
  });

  test('still accepts default responses before their deadline', async (t) => {
    delayedProvider(t, 25_000);
    const result = new GeminiFeatureSpecAiClient().generateJson(request);
    t.mock.timers.tick(25_000);
    assert.deepEqual(await result, fixtureAnswer);
  });

  test('preserves the upstream HTTP failure contract', async () => {
    globalThis.fetch = async () => Response.json({ error: 'Fixture unavailable' }, { status: 503 });
    await assert.rejects(new GeminiFeatureSpecAiClient().generateJson(request), {
      name: 'FeatureSpecAiUnavailableError',
      message: 'The AI service returned status 503.',
    });
  });
});
