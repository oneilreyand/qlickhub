import { describe, expect, it } from 'vitest';
import { formatQaHandoffBody, latestQaHandoffBuild } from '../qaHandoff';

describe('QA handoff build (E2E-SDLC-FLOW P7, AC-14)', () => {
  it('appends labelled build lines to the note and omits empty parts', () => {
    expect(formatQaHandoffBody(' Siap diuji ', 'web-1.4.2', 'staging')).toBe(
      'Siap diuji\n\nBuild: web-1.4.2\nLingkungan: staging',
    );
    expect(formatQaHandoffBody('', ' web-2 ', '')).toBe('Build: web-2');
    expect(formatQaHandoffBody(undefined, '', '')).toBeUndefined();
  });

  it('returns the newest ready_for_qa handoff that names a build', () => {
    const latest = latestQaHandoffBuild([
      {
        body: 'Build: web-1\nLingkungan: dev',
        createdAt: '2026-11-01T00:00:00Z',
        handoffKind: 'ready_for_qa',
      },
      {
        body: 'Build: web-2\nLingkungan: staging',
        createdAt: '2026-11-03T00:00:00Z',
        handoffKind: 'ready_for_qa',
      },
      { body: 'Build: web-9', createdAt: '2026-11-04T00:00:00Z', handoffKind: null },
      { body: 'Tanpa build', createdAt: '2026-11-05T00:00:00Z', handoffKind: 'ready_for_qa' },
    ]);
    expect(latest).toEqual({
      build: 'web-2',
      environment: 'staging',
      createdAt: '2026-11-03T00:00:00Z',
    });
  });
});
