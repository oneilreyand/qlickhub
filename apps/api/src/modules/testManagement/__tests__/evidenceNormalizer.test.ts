import assert from 'node:assert';
import { afterEach, describe, test } from 'node:test';
import { normalizeEvidenceUrl } from '../evidenceNormalizer.js';

const originalAllowlist = process.env.EVIDENCE_DIRECT_MEDIA_HOST_ALLOWLIST;

afterEach(() => {
  if (originalAllowlist === undefined) delete process.env.EVIDENCE_DIRECT_MEDIA_HOST_ALLOWLIST;
  else process.env.EVIDENCE_DIRECT_MEDIA_HOST_ALLOWLIST = originalAllowlist;
});

describe('evidence preview provider policy', () => {
  test('previews direct image/video only from configured hosts', () => {
    process.env.EVIDENCE_DIRECT_MEDIA_HOST_ALLOWLIST = 'media.example.com';
    assert.deepStrictEqual(
      normalizeEvidenceUrl('https://media.example.com/run.png').previewStatus,
      'ready',
    );
    assert.deepStrictEqual(
      normalizeEvidenceUrl('https://media.example.com/run.mp4').previewStatus,
      'ready',
    );
    const unlisted = normalizeEvidenceUrl('https://other.example.com/run.png');
    assert.strictEqual(unlisted.provider, 'external');
    assert.strictEqual(unlisted.previewStatus, 'unsupported');
  });

  test('keeps named providers previewable and rejects non-HTTPS links', () => {
    assert.strictEqual(
      normalizeEvidenceUrl('https://www.youtube.com/watch?v=abc123').provider,
      'youtube',
    );
    assert.throws(
      () => normalizeEvidenceUrl('http://media.example.com/run.png'),
      /Only secure HTTPS/,
    );
  });
});
