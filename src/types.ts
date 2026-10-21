import type { DefaultBodyType, HttpResponseResolver, PathParams } from "msw";

export type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Augment this interface to map URLs to method-specific response body types.
 */
export interface URLRegistry {}

/** Keep registered URL suggestions without rejecting other strings. */
export type RegisteredURL<Registry> = (keyof Registry & string) | (string & Record<never, never>);
export type EndpointMethods = HTTPMethod | Readonly<NonEmptyArray<HTTPMethod>>;
type Endpoint = readonly [EndpointMethods, string, unknown];
type MethodOf<Methods extends EndpointMethods> = Methods extends readonly HTTPMethod[]
  ? Methods[number]
  : Extract<Methods, HTTPMethod>;

type GetResponseType<
  Registry,
  Method extends HTTPMethod,
  URL extends string,
> = URL extends keyof Registry
  ? Method extends keyof Registry[URL]
    ? Extract<Registry[URL][Method], DefaultBodyType>
    : DefaultBodyType
  : DefaultBodyType;

export type TypedHttpResponseResolver<
  Registry,
  Methods extends EndpointMethods,
  URL extends string,
> = HttpResponseResolver<
  PathParams,
  DefaultBodyType,
  GetResponseType<Registry, MethodOf<Methods>, URL>
>;

type TypedEndpointsBatch<Registry, Endpoints extends readonly Endpoint[]> = {
  [K in keyof Endpoints]: readonly [
    Endpoints[K][0],
    Endpoints[K][1],
    TypedHttpResponseResolver<Registry, NoInfer<Endpoints[K][0]>, NoInfer<Endpoints[K][1]>>,
  ];
};

export interface MockFetchFn<Registry extends object = URLRegistry> {
  <const Methods extends EndpointMethods, const URL extends RegisteredURL<Registry>>(
    methods: Methods,
    url: URL,
    resolver: TypedHttpResponseResolver<Registry, NoInfer<Methods>, NoInfer<URL>>,
  ): void;
  <const Endpoints extends readonly Endpoint[]>(
    endpoints: Endpoints & TypedEndpointsBatch<Registry, Endpoints>,
  ): void;
}
