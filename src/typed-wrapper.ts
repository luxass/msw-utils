import type { MockFetchFn } from "./types";

/** A mockFetch function with an instance-specific URL-to-response registry. */
export type TypedMockFetchFn<Registry extends object> = MockFetchFn<Registry>;

/**
 * Apply an instance-specific response registry without changing runtime behavior.
 * Unregistered URLs and methods retain MSW's default response body type.
 */
export function createTypedMockFetch<Registry extends object>(
  mockFetch: MockFetchFn,
): TypedMockFetchFn<Registry> {
  return mockFetch;
}
