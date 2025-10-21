/**
 * Checks if an error is an MSW internal error.
 *
 * MSW throws internal errors with the name "InternalError" and
 * prefixes error messages with "[MSW]".
 *
 * @param {unknown} error - The error to check
 * @returns {boolean} true if the error is from MSW
 *
 * @example
 * ```ts
 * try {
 *   // some code that might throw MSW errors
 * } catch (error) {
 *   if (isMSWError(error)) {
 *     console.log("This is an MSW error:", error.message);
 *   }
 * }
 * ```
 */
export function isMSWError(error: unknown): error is Error {
  return (
    error instanceof Error
    && (error.name === "InternalError" || error.message.startsWith("[MSW]"))
  );
}
