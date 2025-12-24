import type { HttpResponseResolver } from "msw";
import type { SetupServerApi } from "msw/node";
import type { HTTPMethod, MockFetchFn, NonEmptyArray } from "./types";
import { createHandlersFromMethods } from "./utils";

const OPENAPI_PATH_PARAM_RE = /\{([^}]+)\}/g;

export interface CreateMockFetchOptions {
  mswServer: SetupServerApi;

  /**
   * Whether or not to replace OpenAPI Path Parameters
   *
   * @default false
   */
  replaceOpenAPIPathParams?: boolean;
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
  const { mswServer, replaceOpenAPIPathParams = false } = options;

  if (!mswServer) {
    throw new Error("mswServer is required to create mockFetch");
  }

  const mockFetch: MockFetchFn = (
    methodsOrEndpoints: NonEmptyArray<HTTPMethod> | HTTPMethod | [NonEmptyArray<HTTPMethod> | HTTPMethod, string, HttpResponseResolver][],
    url?: string,
    resolver?: HttpResponseResolver,
  ) => {
    if (Array.isArray(methodsOrEndpoints) && methodsOrEndpoints.length > 0 && Array.isArray(methodsOrEndpoints[0])) {
      // handle batch registration
      const endpoints = methodsOrEndpoints as [NonEmptyArray<HTTPMethod> | HTTPMethod, string, HttpResponseResolver][];
      const handlers = endpoints.flatMap(([methods, endpointUrl, handlerResolver]) => {
        const methodArray = Array.isArray(methods) ? methods : [methods];

        if (replaceOpenAPIPathParams) {
          endpointUrl = endpointUrl.replace(OPENAPI_PATH_PARAM_RE, "/:$1");
        }

        return createHandlersFromMethods(methodArray, endpointUrl, handlerResolver);
      });

      mswServer.use(...handlers);
      return;
    }

    if (url && resolver) {
      // handle single registration
      const methods = methodsOrEndpoints as NonEmptyArray<HTTPMethod> | HTTPMethod;
      const methodArray = Array.isArray(methods) ? methods : [methods];

      if (replaceOpenAPIPathParams) {
        url = url.replace(OPENAPI_PATH_PARAM_RE, "/:$1");
      }

      const handlers = createHandlersFromMethods(methodArray, url, resolver);

      mswServer.use(...handlers);
      return;
    }

    throw new Error("invalid arguments for mockFetch");
  };

  return mockFetch;
}
