import { describe, expect, it } from "vitest";
import { isUniqueViolation } from "./unique-violation";

describe("isUniqueViolation", () => {
  it("recognises the Postgres unique-violation code", () => {
    expect(isUniqueViolation({ code: "23505", message: "duplicate key value" })).toBe(true);
  });

  it("sees through the wrapper Drizzle puts around driver errors", () => {
    expect(isUniqueViolation({ message: "Failed query", cause: { code: "23505" } })).toBe(true);
    expect(isUniqueViolation({ cause: { cause: { code: "23505" } } })).toBe(true);
  });

  it("ignores unrelated driver errors", () => {
    expect(isUniqueViolation({ code: "22P02" })).toBe(false);
    expect(isUniqueViolation({ cause: { code: "23503" } })).toBe(false);
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
    expect(isUniqueViolation("23505")).toBe(false);
  });

  it("does not loop forever on a self-referential cause", () => {
    const loop: Record<string, unknown> = { code: "XX" };
    loop.cause = loop;
    expect(isUniqueViolation(loop)).toBe(false);
  });
});
