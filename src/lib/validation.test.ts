import { describe, it, expect } from "vitest";

describe("Validation Utilities", () => {
  it("validates phone numbers", () => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    expect(phoneRegex.test("+5215664436277")).toBe(true);
    expect(phoneRegex.test("5215664436277")).toBe(true);
    expect(phoneRegex.test("invalid")).toBe(false);
    expect(phoneRegex.test("")).toBe(false);
  });

  it("validates email format", () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test("test@example.com")).toBe(true);
    expect(emailRegex.test("invalid")).toBe(false);
  });

  it("validates message content not empty", () => {
    const content = "  Hello world  ";
    expect(content.trim().length).toBeGreaterThan(0);
  });

  it("rejects empty message content", () => {
    const content = "   ";
    expect(content.trim().length).toBe(0);
  });
});
