import { describe, expect, it } from "vitest";
import { isMSWError } from "../src/runtime-guards";

describe("isMSWError", () => {
  it("returns true for errors with InternalError name", () => {
    const error = new Error("Test error");
    error.name = "InternalError";
    expect(isMSWError(error)).toBe(true);
  });

  it("returns true for errors with [MSW] prefix", () => {
    const error = new Error("[MSW] Test error message");
    expect(isMSWError(error)).toBe(true);
  });

  it("returns true for errors with both InternalError name and [MSW] prefix", () => {
    const error = new Error("[MSW] Test error message");
    error.name = "InternalError";
    expect(isMSWError(error)).toBe(true);
  });

  it("returns false for regular errors", () => {
    const error = new Error("Regular error");
    expect(isMSWError(error)).toBe(false);
  });

  it("returns false for non-Error objects", () => {
    expect(isMSWError("string error")).toBe(false);
    expect(isMSWError(null)).toBe(false);
    expect(isMSWError(undefined)).toBe(false);
    expect(isMSWError({})).toBe(false);
    expect(isMSWError(123)).toBe(false);
  });

  it("returns false for errors with similar but not exact patterns", () => {
    const error1 = new Error("MSW error");
    expect(isMSWError(error1)).toBe(false);

    const error2 = new Error("Some [MSW] in middle");
    expect(isMSWError(error2)).toBe(false);

    const error3 = new Error("Test");
    error3.name = "CustomError";
    expect(isMSWError(error3)).toBe(false);
  });
});
