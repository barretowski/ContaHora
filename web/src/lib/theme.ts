export type ThemeName = 'light' | 'dark';

const THEME_KEY = 'contahora.theme';

/** Tema salvo pelo usuário; se não houver, segue a preferência do sistema. */
export function getInitialTheme(): ThemeName {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* localStorage indisponível */
  }
  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {
    /* matchMedia indisponível */
  }
  return 'light';
}

export function saveTheme(name: ThemeName) {
  try {
    localStorage.setItem(THEME_KEY, name);
  } catch {
    /* ignora */
  }
}
