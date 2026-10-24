import { describe, expect, it } from 'vitest';
import { applyTheme, DEFAULT_THEME, resolveStoredTheme } from '../themePreference';

describe('ThemeContext helpers', () => {
  it('uses dark as the default for missing or invalid stored values', () => {
    expect(resolveStoredTheme(null)).toBe(DEFAULT_THEME);
    expect(resolveStoredTheme('system')).toBe(DEFAULT_THEME);
    expect(resolveStoredTheme('invalid')).toBe(DEFAULT_THEME);
  });

  it('accepts the supported explicit theme values', () => {
    expect(resolveStoredTheme('light')).toBe('light');
    expect(resolveStoredTheme('dark')).toBe('dark');
  });

  it('applies the root class, background, and browser color scheme together', () => {
    applyTheme('light');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(document.documentElement.style.backgroundColor).toBe('rgb(251, 252, 247)');
    expect(document.documentElement.style.colorScheme).toBe('light');

    applyTheme('dark');
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.backgroundColor).toBe('rgb(20, 20, 19)');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });
});
