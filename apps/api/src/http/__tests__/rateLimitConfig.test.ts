import assert from 'node:assert';
import { test } from 'node:test';

import {
  API_RATE_LIMIT_PRODUCTION_MAX,
  API_RATE_LIMIT_WINDOW_MS,
  LOGIN_RATE_LIMIT_PRODUCTION_MAX,
  LOGIN_RATE_LIMIT_WINDOW_MS,
} from '../middleware/rateLimit.js';

test('shortens public and login rate-limit windows while preserving their prior per-minute throughput', () => {
  assert.strictEqual(API_RATE_LIMIT_WINDOW_MS, 5 * 60 * 1000);
  assert.strictEqual(API_RATE_LIMIT_PRODUCTION_MAX, 100);
  assert.strictEqual(LOGIN_RATE_LIMIT_WINDOW_MS, 5 * 60 * 1000);
  assert.strictEqual(LOGIN_RATE_LIMIT_PRODUCTION_MAX, 3);
});
