import type { Theme } from "./themePreference";

export function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: Theme;
  onToggle: () => void;
}) {
  const nextTheme = theme === "dark" ? "light" : "dark";
  return (
    <button
      className="secondary-button theme-toggle"
      type="button"
      aria-label={`Switch to ${nextTheme} theme`}
      aria-pressed={theme === "light"}
      onClick={onToggle}
    >
      {nextTheme === "light" ? "Light mode" : "Dark mode"}
    </button>
  );
}
