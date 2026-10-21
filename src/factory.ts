import type { HttpResponseResolver } from "msw";
import type { setupServer } from "msw/node";

import type { HTTPMethod, MockFetchFn, NonEmptyArray } from "./types";
import { createHandlersFromMethods, replaceOpenAPIPathParamsWithMSWParams } from "./utils";

type HandlerEndpoint = [
  methods: HTTPMethod | NonEmptyArray<HTTPMethod>,
  url: string,
  resolver: HttpResponseResolver,
];

export interface CreateMockFetchOptions {
  mswServer: Pick<ReturnType<typeof setupServer>, "use">;

  /**
   * Whether or not to replace OpenAPI Path Parameters
   *
   * @default false
   */
  replaceOpenAPIPathParams?: boolean;
}

function resolveOptions(options: Partial<CreateMockFetchOptions>) {
  const { mswServer, replaceOpenAPIPathParams = false } = options;

  if (!mswServer) {
    throw new Error("mswServer is required to create mockFetch");
  }

  return { mswServer, replaceOpenAPIPathParams };
}

/**
 * Creates a mockFetch function that provides a cleaner API for defining MSW handlers.
 *
 * @param {CreateMockFetchOptions} options - Configuration options
 * @returns {MockFetchFn} The mockFetch function
 *
 * @example
 * ```ts
 * const server = setupServer();
 * const mockFetch = createMockFetch({ mswServer: server });
 *
 * // Single endpoint
 * mockFetch("GET", "/api/users", () => HttpResponse.json([]));
 *
 * // Multiple endpoints
 * mockFetch([
 *   ["GET", "/api/users", () => HttpResponse.json([])],
 *   ["POST", "/api/users", () => HttpResponse.json({}, { status: 201 })]
 * ]);
 * ```
 */
export function createMockFetch(options: CreateMockFetchOptions): MockFetchFn {
  const { mswServer, replaceOpenAPIPathParams } = resolveOptions(options);

  const mockFetch: MockFetchFn = (
    methodsOrEndpoints: unknown,
    url = "",
    resolver?: HttpResponseResolver,
  ): void => {
    if (
      Array.isArray(methodsOrEndpoints) &&
      methodsOrEndpoints.length > 0 &&
      Array.isArray(methodsOrEndpoints[0])
    ) {
      // handle batch registration
      const endpoints = methodsOrEndpoints as HandlerEndpoint[];
      const handlers = endpoints.flatMap(([methods, endpointUrl, handlerResolver]) => {
        const methodArray = Array.isArray(methods) ? methods : [methods];

        const finalUrl = replaceOpenAPIPathParams
          ? replaceOpenAPIPathParamsWithMSWParams(endpointUrl)
          : endpointUrl;

        return createHandlersFromMethods(methodArray, finalUrl, handlerResolver);
      });

      mswServer.use(...handlers);
      return;
    }

    if (url && resolver) {
      // handle single registration
      const methods = methodsOrEndpoints as HandlerEndpoint[0];
      const methodArray = Array.isArray(methods) ? methods : [methods];

      const finalUrl = replaceOpenAPIPathParams ? replaceOpenAPIPathParamsWithMSWParams(url) : url;

      const handlers = createHandlersFromMethods(methodArray, finalUrl, resolver);

      mswServer.use(...handlers);
      return;
    }

    throw new Error("invalid arguments for mockFetch");
  };

  return mockFetch;
}
