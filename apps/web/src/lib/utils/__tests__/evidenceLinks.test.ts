import { describe, expect, it } from 'vitest';
import { isPreviewableEvidenceUrl } from '../evidenceLinks';

describe('isPreviewableEvidenceUrl', () => {
  it('accepts the providers the backend counts as previewable evidence', () => {
    expect(isPreviewableEvidenceUrl('https://drive.google.com/file/d/abc_123/view')).toBe(true);
    expect(isPreviewableEvidenceUrl('https://drive.google.com/open?id=abc123')).toBe(true);
    expect(isPreviewableEvidenceUrl('https://www.youtube.com/watch?v=abc')).toBe(true);
    expect(isPreviewableEvidenceUrl('https://youtu.be/abc')).toBe(true);
    expect(isPreviewableEvidenceUrl('https://www.loom.com/share/abc123')).toBe(true);
    expect(isPreviewableEvidenceUrl('https://vimeo.com/12345')).toBe(true);
  });

  it('rejects plain, insecure, malformed, and unsupported links', () => {
    expect(isPreviewableEvidenceUrl('https://example.com/screenshot.png')).toBe(false);
    expect(isPreviewableEvidenceUrl('http://www.loom.com/share/abc123')).toBe(false);
    expect(isPreviewableEvidenceUrl('https://drive.google.com/drive/folders/xyz')).toBe(false);
    expect(isPreviewableEvidenceUrl('not a url')).toBe(false);
    expect(isPreviewableEvidenceUrl('https://www.youtube.com/')).toBe(false);
  });
});
