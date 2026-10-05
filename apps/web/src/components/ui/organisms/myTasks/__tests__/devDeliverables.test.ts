import { describe, expect, it } from 'vitest';
import {
  DELIVERABLE_LABELS,
  LEGACY_DELIVERABLE_LABELS,
  buildCombinedDescription,
  parseDeliverablesFromDescription,
  stripDeliverablesFromDescription,
} from '../devDeliverables';

describe('devDeliverables helpers', () => {
  describe('DELIVERABLE_LABELS constants', () => {
    it('uses Indonesian canonical labels', () => {
      expect(DELIVERABLE_LABELS.PR).toBe('Tautan PR');
      expect(DELIVERABLE_LABELS.BRANCH).toBe('Branch');
      expect(DELIVERABLE_LABELS.STAGING).toBe('URL Staging');
      expect(DELIVERABLE_LABELS.HANDOFF).toBe('Petunjuk Handoff');
    });

    it('contains expected legacy English labels for backward compatibility', () => {
      expect(LEGACY_DELIVERABLE_LABELS.PR).toContain('PR Link');
      expect(LEGACY_DELIVERABLE_LABELS.STAGING).toContain('Staging URL');
      expect(LEGACY_DELIVERABLE_LABELS.HANDOFF).toContain('Handoff Instructions');
    });
  });

  describe('parseDeliverablesFromDescription', () => {
    it('handles empty, null, or undefined descriptions gracefully', () => {
      const expectedEmpty = {
        pr: '',
        branch: '',
        staging: '',
        handoff: '',
        notes: '',
      };
      expect(parseDeliverablesFromDescription(null)).toEqual(expectedEmpty);
      expect(parseDeliverablesFromDescription(undefined)).toEqual(expectedEmpty);
      expect(parseDeliverablesFromDescription('')).toEqual(expectedEmpty);
      expect(parseDeliverablesFromDescription('   \n\n  ')).toEqual(expectedEmpty);
    });

    it('parses canonical Indonesian labels correctly and cleans notes', () => {
      const description = [
        'Arsitektur autentikasi telah diselesaikan.',
        'Menggunakan JWT cookie httpOnly.',
        '',
        '- **Tautan PR**: https://github.com/org/repo/pull/456',
        '- **Branch**: `feature/auth-v2`',
        '- **URL Staging**: https://staging.qlick.io/auth',
        '- **Petunjuk Handoff**: Akun demo: tester@qlick.io / password123',
      ].join('\n');

      const parsed = parseDeliverablesFromDescription(description);

      expect(parsed.pr).toBe('https://github.com/org/repo/pull/456');
      expect(parsed.branch).toBe('feature/auth-v2');
      expect(parsed.staging).toBe('https://staging.qlick.io/auth');
      expect(parsed.handoff).toBe('Akun demo: tester@qlick.io / password123');
      expect(parsed.notes).toBe(
        'Arsitektur autentikasi telah diselesaikan.\nMenggunakan JWT cookie httpOnly.',
      );
    });

    it('parses legacy English labels for backward compatibility and cleans notes', () => {
      const legacyDescription = [
        'Create responsive navigation with dark mode support.',
        '- **PR Link**: https://github.com/org/repo/pull/123',
        '- **Branch**: `feature/nav-bar`',
        '- **Staging URL**: https://staging.app.io/nav',
        '- **Handoff Instructions**: Log in with qa-lead@qlick.io',
      ].join('\n');

      const parsed = parseDeliverablesFromDescription(legacyDescription);

      expect(parsed.pr).toBe('https://github.com/org/repo/pull/123');
      expect(parsed.branch).toBe('feature/nav-bar');
      expect(parsed.staging).toBe('https://staging.app.io/nav');
      expect(parsed.handoff).toBe('Log in with qa-lead@qlick.io');
      expect(parsed.notes).toBe('Create responsive navigation with dark mode support.');
    });

    it('strips backticks from branch name whether wrapped or unwrapped', () => {
      const wrapped = '- **Branch**: `feat/with-backticks`';
      const unwrapped = '- **Branch**: feat/plain-text';

      expect(parseDeliverablesFromDescription(wrapped).branch).toBe('feat/with-backticks');
      expect(parseDeliverablesFromDescription(unwrapped).branch).toBe('feat/plain-text');
    });
  });

  describe('buildCombinedDescription', () => {
    it('writes canonical Indonesian deliverable labels', () => {
      const result = buildCombinedDescription(
        'Catatan teknis fitur profil.',
        'https://github.com/org/repo/pull/789',
        'feature/profile',
        'https://staging.qlick.io/profile',
        'Periksa upload avatar',
      );

      expect(result).toContain('- **Tautan PR**: https://github.com/org/repo/pull/789');
      expect(result).toContain('- **Branch**: `feature/profile`');
      expect(result).toContain('- **URL Staging**: https://staging.qlick.io/profile');
      expect(result).toContain('- **Petunjuk Handoff**: Periksa upload avatar');
      expect(result).not.toContain('PR Link');
      expect(result).not.toContain('Staging URL');
      expect(result).not.toContain('Handoff Instructions');
    });

    it('does not duplicate deliverable lines when saving twice with same notes and deliverables', () => {
      const initialNotes = 'Catatan fitur pembayaran.';
      const pr = 'https://github.com/org/repo/pull/101';
      const branch = 'feat/payment';
      const staging = 'https://staging.qlick.io/pay';
      const handoff = 'Gunakan sandbox Midtrans';

      const firstSave = buildCombinedDescription(initialNotes, pr, branch, staging, handoff);
      // Second save: developer saves again while previous combined output or parsed notes are used
      const secondSave = buildCombinedDescription(firstSave, pr, branch, staging, handoff);

      expect(secondSave).toBe(firstSave);

      // Verify each deliverable item appears exactly once
      const prMatches = secondSave.match(/- \*\*Tautan PR\*\*:/g);
      const branchMatches = secondSave.match(/- \*\*Branch\*\*:/g);
      const stagingMatches = secondSave.match(/- \*\*URL Staging\*\*:/g);
      const handoffMatches = secondSave.match(/- \*\*Petunjuk Handoff\*\*:/g);

      expect(prMatches).toHaveLength(1);
      expect(branchMatches).toHaveLength(1);
      expect(stagingMatches).toHaveLength(1);
      expect(handoffMatches).toHaveLength(1);
    });

    it('strips legacy English deliverable lines if passed in notes when re-saving', () => {
      const dirtyLegacyNotes = [
        'Catatan legacy.',
        '- **PR Link**: https://github.com/old/pull/1',
        '- **Branch**: `old-branch`',
        '- **Staging URL**: https://old-staging.io',
        '- **Handoff Instructions**: Old instruction',
      ].join('\n');

      const updated = buildCombinedDescription(
        dirtyLegacyNotes,
        'https://github.com/new/pull/2',
        'new-branch',
        'https://new-staging.io',
        'New instruction',
      );

      expect(updated).not.toContain('PR Link');
      expect(updated).not.toContain('Staging URL');
      expect(updated).not.toContain('Handoff Instructions');
      expect(updated).toContain('- **Tautan PR**: https://github.com/new/pull/2');
      expect(updated).toContain('- **Branch**: `new-branch`');
      expect(updated).toContain('- **URL Staging**: https://new-staging.io');
      expect(updated).toContain('- **Petunjuk Handoff**: New instruction');
      expect(updated.startsWith('Catatan legacy.')).toBe(true);
    });

    it('preserves non-deliverable markdown bullet points in notes', () => {
      const customNotes = [
        'Daftar perubahan:',
        '- Mengubah skema validasi email',
        '- Menambahkan rate limiting pada endpoint login',
        '* Bullet lain dengan bintang',
      ].join('\n');

      const combined = buildCombinedDescription(
        customNotes,
        'https://github.com/org/repo/pull/99',
        'fix/login',
        'https://staging.io',
      );

      expect(combined).toContain('- Mengubah skema validasi email');
      expect(combined).toContain('- Menambahkan rate limiting pada endpoint login');
      expect(combined).toContain('* Bullet lain dengan bintang');
      expect(combined).toContain('- **Tautan PR**: https://github.com/org/repo/pull/99');
    });
  });

  describe('Round-trip write -> parse', () => {
    it('faithfully reconstructs all fields on write then parse', () => {
      const originalNotes =
        'Implementasi sistem notifikasi push via FCM.\nDetail arsitektur di docs.';
      const originalPr = 'https://github.com/org/repo/pull/999';
      const originalBranch = 'feature/fcm-notifications';
      const originalStaging = 'https://staging.qlick.io/notif';
      const originalHandoff = 'Tes via Firebase test console dengan token dev.';

      const serialized = buildCombinedDescription(
        originalNotes,
        originalPr,
        originalBranch,
        originalStaging,
        originalHandoff,
      );

      const parsed = parseDeliverablesFromDescription(serialized);

      expect(parsed.notes).toBe(originalNotes);
      expect(parsed.pr).toBe(originalPr);
      expect(parsed.branch).toBe(originalBranch);
      expect(parsed.staging).toBe(originalStaging);
      expect(parsed.handoff).toBe(originalHandoff);
    });

    it('upgrades legacy English format to canonical Indonesian format on parse -> write cycle', () => {
      const legacyText = [
        'Initial bug investigation notes.',
        '- **PR Link**: https://github.com/org/repo/pull/77',
        '- **Branch**: `fix/header-zindex`',
        '- **Staging URL**: https://staging.qlick.io/header',
        '- **Handoff Instructions**: Cek modal backdrop di mobile screen',
      ].join('\n');

      // 1. Read legacy data
      const parsedLegacy = parseDeliverablesFromDescription(legacyText);
      expect(parsedLegacy.pr).toBe('https://github.com/org/repo/pull/77');
      expect(parsedLegacy.branch).toBe('fix/header-zindex');
      expect(parsedLegacy.staging).toBe('https://staging.qlick.io/header');
      expect(parsedLegacy.handoff).toBe('Cek modal backdrop di mobile screen');
      expect(parsedLegacy.notes).toBe('Initial bug investigation notes.');

      // 2. Re-save via writer
      const rewritten = buildCombinedDescription(
        parsedLegacy.notes,
        parsedLegacy.pr,
        parsedLegacy.branch,
        parsedLegacy.staging,
        parsedLegacy.handoff,
      );

      // Verify rewritten text uses Indonesian labels
      expect(rewritten).toContain('- **Tautan PR**: https://github.com/org/repo/pull/77');
      expect(rewritten).toContain('- **Branch**: `fix/header-zindex`');
      expect(rewritten).toContain('- **URL Staging**: https://staging.qlick.io/header');
      expect(rewritten).toContain('- **Petunjuk Handoff**: Cek modal backdrop di mobile screen');
      expect(rewritten).not.toContain('PR Link');
      expect(rewritten).not.toContain('Staging URL');
      expect(rewritten).not.toContain('Handoff Instructions');

      // 3. Re-parse rewritten text
      const parsedRewritten = parseDeliverablesFromDescription(rewritten);
      expect(parsedRewritten).toEqual(parsedLegacy);
    });
  });

  describe('stripDeliverablesFromDescription', () => {
    it('returns empty string if input contains only deliverables and whitespace', () => {
      const onlyDeliverables = [
        '- **Tautan PR**: https://github.com/org/repo/pull/1',
        '- **Branch**: `main`',
        '- **URL Staging**: https://staging.app',
      ].join('\n');

      expect(stripDeliverablesFromDescription(onlyDeliverables)).toBe('');
    });
  });
});
