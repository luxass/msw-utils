import type { HttpResponseResolver, PathParams } from "msw";

export type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Registry for URL-to-response type mappings.
 * Users can augment this interface to add type-safe routes with method-specific response types.
 *
 * @example
 * ```typescript
 * declare module "@luxass/msw-utils" {
 *   interface URLRegistry {
 *     "/api/users": {
 *       GET: User[];
 *       POST: CreateUserResponse;
 *     };
 *     "https://google.com": {
 *       GET: string;
 *     };
 *   }
 * }
 * ```
 */
// eslint-disable-next-line ts/no-empty-object-type
export interface URLRegistry {}

/**
 * Default response body type when no specific type is registered.
 * Uses 'any' to maintain compatibility with MSW's type system.
 */
export type DefaultBodyType = any;

/**
 * Extract response type from URLRegistry based on HTTP method and URL.
 * Falls back to DefaultBodyType for unregistered URLs or methods.
 */
type GetResponseType<
  Method extends HTTPMethod,
  URL extends string,
> = URL extends keyof URLRegistry
  ? Method extends keyof URLRegistry[URL]
    ? URLRegistry[URL][Method]
    : DefaultBodyType
  : DefaultBodyType;

/**
 * Allows both registered URLs from URLRegistry and any arbitrary string.
 * Uses the `string & {}` pattern to enable literal type inference while accepting all strings.
 */
type RegisteredURL = keyof URLRegistry extends never
  ? string
  : keyof URLRegistry | (string & {});

/**
 * Type-aware HTTP response resolver that constrains response body based on URL and method.
 */
type TypedHttpResponseResolver<
  Method extends HTTPMethod,
  URL extends string,
  Params extends PathParams = PathParams,
> = HttpResponseResolver<
  Params,
  any,
  GetResponseType<Method, URL>
>;

/**
 * Helper type for batch endpoint registration that preserves individual URL and method types.
 */
type TypedEndpointsBatch<T extends ReadonlyArray<readonly [any, string, any]>> = {
  [K in keyof T]: T[K] extends readonly [infer Methods, infer URL, any]
    ? Methods extends HTTPMethod
      ? URL extends string
        ? readonly [Methods, URL, TypedHttpResponseResolver<Methods, URL>]
        : never
      : Methods extends NonEmptyArray<HTTPMethod>
        ? URL extends string
          ? readonly [Methods, URL, TypedHttpResponseResolver<Methods[number], URL>]
          : never
        : never
    : never;
};

export interface MockFetchFn {
  // Overload 1: Single method + URL
  <
    Method extends HTTPMethod,
    URL extends RegisteredURL,
  >(
    method: Method,
    url: URL,
    resolver: TypedHttpResponseResolver<Method, URL>
  ): void;

  // Overload 2: Multiple methods + URL
  <
    Methods extends NonEmptyArray<HTTPMethod>,
    URL extends RegisteredURL,
  >(
    methods: Methods,
    url: URL,
    resolver: TypedHttpResponseResolver<Methods[number], URL>
  ): void;

  // Overload 3: Batch registration
  <const Endpoints extends ReadonlyArray<
    readonly [NonEmptyArray<HTTPMethod> | HTTPMethod, string, any]
  >>(
    endpoints: TypedEndpointsBatch<Endpoints> & Endpoints
  ): void;

  // Overload 4: Generic catch-all (for type system fallback)
  (
    methodsOrEndpoints:
      | NonEmptyArray<HTTPMethod>
      | HTTPMethod
      | ReadonlyArray<readonly [any, string, any]>,
    url?: string,
    resolver?: HttpResponseResolver
  ): void;
}
