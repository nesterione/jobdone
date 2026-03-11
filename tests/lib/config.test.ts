import { describe, expect, test } from "bun:test";
import { validateTitle } from "../../src/lib/config.js";

describe("validateTitle", () => {
  test("returns error for undefined", () => {
    expect(validateTitle(undefined)).toBe("Title is required");
  });

  test("returns error for null", () => {
    expect(validateTitle(null)).toBe("Title is required");
  });

  test("returns error for empty string", () => {
    expect(validateTitle("")).toBe("Title is required");
  });

  test("returns error for whitespace-only string", () => {
    expect(validateTitle("   ")).toBe("Title is required");
  });

  test("returns null for valid title", () => {
    expect(validateTitle("Fix the bug")).toBeNull();
  });
});
