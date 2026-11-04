import { describe, expect, it } from "vitest";
import { readThemePreference, saveThemePreference } from "../client/themePreference";

function memoryStorage(initial?: string) {
  let value = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => { value = next; },
  };
}

describe("theme preference", () => {
  it("defaults to dark mode", () => {
    expect(readThemePreference(memoryStorage())).toBe("dark");
  });

  it("restores the saved light theme after reload", () => {
    const storage = memoryStorage();
    saveThemePreference("light", storage);
    expect(readThemePreference(storage)).toBe("light");
  });

  it("uses dark mode for unknown stored values", () => {
    expect(readThemePreference(memoryStorage("blue"))).toBe("dark");
  });
});
