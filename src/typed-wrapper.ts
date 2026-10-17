import type {
  EndpointMethods,
  MockFetchFn,
  RegisteredURL,
  TypedHttpResponseResolver,
} from "./types";

/** Preserve URL-first type arguments and reuse the shared registry-aware call signatures. */
export interface TypedMockFetchFn<Registry extends object> extends MockFetchFn<Registry> {
  <const URL extends RegisteredURL<Registry>, const Methods extends EndpointMethods>(
    methods: Methods,
    url: URL,
    resolver: TypedHttpResponseResolver<Registry, NoInfer<Methods>, NoInfer<URL>>,
  ): void;
}

/**
 * Apply an instance-specific response registry without changing runtime behavior.
 * Unregistered URLs and methods retain MSW's default response body type.
 */
export function createTypedMockFetch<Registry extends object>(
  mockFetch: MockFetchFn,
): TypedMockFetchFn<Registry> {
  return mockFetch;
}
