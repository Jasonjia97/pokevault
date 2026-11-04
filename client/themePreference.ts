export type Theme = "dark" | "light";

const THEME_STORAGE_KEY = "pokevault-theme";

export function readThemePreference(
  storage?: Pick<Storage, "getItem">,
): Theme {
  try {
    const value = (storage ?? window.localStorage).getItem(THEME_STORAGE_KEY);
    return value === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function saveThemePreference(
  theme: Theme,
  storage?: Pick<Storage, "setItem">,
): void {
  try {
    (storage ?? window.localStorage).setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Keep the current in-memory theme if storage is unavailable.
  }
}
