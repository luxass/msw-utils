/**
 * Represents an MSW (Mock Service Worker) internal error.
 * Used as a type guard target to avoid narrowing issues.
 */
export interface MSWError extends Error {
  readonly _brand?: "MSWError";
}
