import { beforeEach, describe, expect, it } from 'vitest';
import {
  cleanLegacyAuthStorage,
  clearSessionScopedData,
  getActiveWorkspaceId,
  setActiveWorkspaceId,
  clearActiveWorkspaceId,
  isOnboardingDismissed,
  setOnboardingDismissed,
  clearOnboardingDismissed,
  LEGACY_AUTH_STORAGE_KEYS,
  SESSION_STORAGE_KEYS,
} from '../browserStorage';

describe('browserStorage security and session utilities', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('cleanLegacyAuthStorage removes all legacy auth keys while preserving non-sensitive preferences like theme', () => {
    for (const key of LEGACY_AUTH_STORAGE_KEYS) {
      window.localStorage.setItem(key, 'sensitive-value');
    }
    window.localStorage.setItem('theme', 'dark');
    window.localStorage.setItem('custom_pref', 'hello');

    cleanLegacyAuthStorage();

    for (const key of LEGACY_AUTH_STORAGE_KEYS) {
      expect(window.localStorage.getItem(key)).toBeNull();
    }
    expect(window.localStorage.getItem('theme')).toBe('dark');
    expect(window.localStorage.getItem('custom_pref')).toBe('hello');
  });

  it('clearSessionScopedData wipes legacy keys and clears all session-scoped state', () => {
    window.localStorage.setItem('user_role', 'owner');
    window.localStorage.setItem('user_email', 'admin@example.com');
    window.sessionStorage.setItem(SESSION_STORAGE_KEYS.ACTIVE_WORKSPACE_ID, 'ws-123');
    window.sessionStorage.setItem(SESSION_STORAGE_KEYS.ONBOARDING_DISMISSED, 'true');
    window.sessionStorage.setItem('onboarding_dismissed_user-456', 'true');

    clearSessionScopedData();

    expect(window.localStorage.getItem('user_role')).toBeNull();
    expect(window.localStorage.getItem('user_email')).toBeNull();
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEYS.ACTIVE_WORKSPACE_ID)).toBeNull();
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEYS.ONBOARDING_DISMISSED)).toBeNull();
    expect(window.sessionStorage.getItem('onboarding_dismissed_user-456')).toBeNull();
  });

  it('manages active workspace in sessionStorage without touching localStorage', () => {
    expect(getActiveWorkspaceId()).toBeNull();

    setActiveWorkspaceId('ws-999');
    expect(getActiveWorkspaceId()).toBe('ws-999');
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEYS.ACTIVE_WORKSPACE_ID)).toBe('ws-999');
    expect(window.localStorage.getItem(SESSION_STORAGE_KEYS.ACTIVE_WORKSPACE_ID)).toBeNull();

    clearActiveWorkspaceId();
    expect(getActiveWorkspaceId()).toBeNull();
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEYS.ACTIVE_WORKSPACE_ID)).toBeNull();
  });

  it('manages onboarding dismissal as a boolean per-tab in sessionStorage without user ID in key', () => {
    expect(isOnboardingDismissed()).toBe(false);

    setOnboardingDismissed(true);
    expect(isOnboardingDismissed()).toBe(true);
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEYS.ONBOARDING_DISMISSED)).toBe('true');

    clearOnboardingDismissed();
    expect(isOnboardingDismissed()).toBe(false);
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEYS.ONBOARDING_DISMISSED)).toBeNull();
  });
});
