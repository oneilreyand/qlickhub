export const LEGACY_AUTH_STORAGE_KEYS = [
  'user_id',
  'user_email',
  'user_name',
  'user_role',
  'user_onboarding_completed_at',
] as const;

export const SESSION_STORAGE_KEYS = {
  ACTIVE_WORKSPACE_ID: 'active_workspace_id',
  ONBOARDING_DISMISSED: 'onboarding_dismissed',
} as const;

/**
 * Removes legacy PII, credentials, and role keys from localStorage.
 * Runs on application startup and during authentication cleanups.
 */
export function cleanLegacyAuthStorage(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    for (const key of LEGACY_AUTH_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage access errors in restricted/test environments
  }
}

/**
 * Wipes legacy auth keys from localStorage and clears all session-scoped
 * state in sessionStorage (active workspace and onboarding flags).
 */
export function clearSessionScopedData(): void {
  cleanLegacyAuthStorage();
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    window.sessionStorage.removeItem(SESSION_STORAGE_KEYS.ACTIVE_WORKSPACE_ID);
    window.sessionStorage.removeItem(SESSION_STORAGE_KEYS.ONBOARDING_DISMISSED);

    // Clean up any legacy user-keyed dismissal flags
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key && key.startsWith('onboarding_dismissed_')) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Ignore storage access errors
  }
}

/**
 * Gets the active workspace ID stored for the current browser session.
 */
export function getActiveWorkspaceId(): string | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    return window.sessionStorage.getItem(SESSION_STORAGE_KEYS.ACTIVE_WORKSPACE_ID);
  } catch {
    return null;
  }
}

/**
 * Sets or removes the active workspace ID for the current browser session.
 */
export function setActiveWorkspaceId(workspaceId: string | null): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    if (workspaceId) {
      window.sessionStorage.setItem(SESSION_STORAGE_KEYS.ACTIVE_WORKSPACE_ID, workspaceId);
    } else {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEYS.ACTIVE_WORKSPACE_ID);
    }
  } catch {
    // Ignore storage access errors
  }
}

/**
 * Clears the active workspace ID from sessionStorage.
 */
export function clearActiveWorkspaceId(): void {
  setActiveWorkspaceId(null);
}

/**
 * Checks if the onboarding guide has been dismissed in this tab session.
 */
export function isOnboardingDismissed(): boolean {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return false;
    return window.sessionStorage.getItem(SESSION_STORAGE_KEYS.ONBOARDING_DISMISSED) === 'true';
  } catch {
    return false;
  }
}

/**
 * Records or resets the onboarding dismissal flag for the current tab session.
 */
export function setOnboardingDismissed(dismissed: boolean): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    if (dismissed) {
      window.sessionStorage.setItem(SESSION_STORAGE_KEYS.ONBOARDING_DISMISSED, 'true');
    } else {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEYS.ONBOARDING_DISMISSED);
    }
  } catch {
    // Ignore storage access errors
  }
}

/**
 * Clears the onboarding dismissed flag from sessionStorage.
 */
export function clearOnboardingDismissed(): void {
  setOnboardingDismissed(false);
}
