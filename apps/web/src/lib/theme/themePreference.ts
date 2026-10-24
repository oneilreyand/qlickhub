export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';
export const DEFAULT_THEME: Theme = 'dark';

export const resolveStoredTheme = (savedTheme: string | null): Theme =>
  savedTheme === 'light' ? 'light' : DEFAULT_THEME;

export const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  const isDark = theme === 'dark';

  root.classList.toggle('dark', isDark);
  root.style.backgroundColor = isDark ? '#141413' : '#FBFCF7';
  root.style.colorScheme = theme;
};
