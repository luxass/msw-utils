import type { HttpResponseResolver, PathParams } from "msw";

import type { HTTPMethod, MockFetchFn, NonEmptyArray } from "./types";

/**
 * Helper type for batch endpoint registration with typed wrapper.
 * Preserves individual URL and method types for each endpoint in the batch.
 */
type TypedEndpointsBatchWrapper<
  Registry extends Record<string, any>,
  T extends ReadonlyArray<readonly [any, keyof Registry & string, any]>,
> = {
  [K in keyof T]: T[K] extends readonly [infer Methods, infer URL, any]
    ? Methods extends HTTPMethod
      ? URL extends keyof Registry & string
        ? Methods extends keyof Registry[URL] & HTTPMethod
          ? readonly [Methods, URL, HttpResponseResolver<PathParams, any, Registry[URL][Methods]>]
          : readonly [Methods, URL, HttpResponseResolver]
        : readonly [Methods, URL, HttpResponseResolver]
      : Methods extends NonEmptyArray<HTTPMethod>
        ? URL extends keyof Registry & string
          ? readonly [
              Methods,
              URL,
              HttpResponseResolver<PathParams, any, Registry[URL][Methods[number]]>,
            ]
          : readonly [Methods, URL, HttpResponseResolver]
        : never
    : never;
};

/**
 * Type-safe MockFetchFn wrapper that provides inline URL registry without module augmentation.
 *
 * @template Registry - Record mapping URLs to HTTP methods and their response types
 *
 * @example
 * ```typescript
 * interface MyURLs {
 *   "/api/users": {
 *     GET: User[];
 *     POST: CreateUserResponse;
 *   };
 *   "https://google.com": {
 *     GET: string;
 *   };
 * }
 *
 * const typedMock = createTypedMockFetch<MyURLs>(mockFetch);
 *
 * // Type-safe calls
 * typedMock("GET", "/api/users", () => HttpResponse.json([...])); // Must return User[]
 * typedMock("POST", "/api/users", () => HttpResponse.json({...})); // Must return CreateUserResponse
 * ```
 */
export interface TypedMockFetchFn<Registry extends Record<string, any>> {
  // Overload 1: Single method + URL from registry
  <URL extends keyof Registry & string, Method extends keyof Registry[URL] & HTTPMethod>(
    method: Method,
    url: URL,
    resolver: HttpResponseResolver<PathParams, any, Registry[URL][Method]>,
  ): void;

  // Overload 2: Multiple methods + URL from registry
  <
    URL extends keyof Registry & string,
    Methods extends NonEmptyArray<keyof Registry[URL] & HTTPMethod>,
  >(
    methods: Methods,
    url: URL,
    resolver: HttpResponseResolver<PathParams, any, Registry[URL][Methods[number]]>,
  ): void;

  // Overload 3: Batch registration
  <const Endpoints extends ReadonlyArray<readonly [any, keyof Registry & string, any]>>(
    endpoints: TypedEndpointsBatchWrapper<Registry, Endpoints> & Endpoints,
  ): void;

  // Overload 4: Safe fallback for untyped single-method URLs (not in registry)
  (method: HTTPMethod, url: string, resolver: HttpResponseResolver): void;

  // Overload 5: Safe fallback for untyped multi-method URLs (not in registry)
  (methods: NonEmptyArray<HTTPMethod>, url: string, resolver: HttpResponseResolver): void;

  // Overload 6: Safe fallback for batch registration when tuple inference cannot preserve typed resolver bodies
  (
    endpoints: ReadonlyArray<
      readonly [NonEmptyArray<HTTPMethod> | HTTPMethod, string, HttpResponseResolver]
    >,
  ): void;
}

/**
 * Creates a type-safe wrapper around MockFetchFn with inline URL registry.
 * Provides an alternative to module augmentation for users who prefer explicit type parameters.
 *
 * @template Registry - Record mapping URLs to HTTP methods and their response types
 * @param mockFetch - The MockFetchFn instance to wrap
 * @returns Type-safe wrapper with enforced response types based on registry
 *
 * @example
 * ```typescript
 * interface MyURLs {
 *   "/api/users": {
 *     GET: User[];
 *     POST: CreateUserResponse;
 *   };
 * }
 *
 * const mockFetch = createMockFetch({ mswServer: server });
 * const typedMock = createTypedMockFetch<MyURLs>(mockFetch);
 *
 * // Type-safe - enforces User[] response
 * typedMock("GET", "/api/users", () => HttpResponse.json([...]));
 *
 * // Type error - wrong response type
 * typedMock("GET", "/api/users", () => HttpResponse.json("wrong"));
 * ```
 */
export function createTypedMockFetch<Registry extends Record<string, any>>(
  mockFetch: MockFetchFn,
): TypedMockFetchFn<Registry> {
  // Runtime: just return the same function (types are compile-time only)
  return mockFetch as any as TypedMockFetchFn<Registry>;
}
