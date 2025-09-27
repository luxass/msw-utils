import type { HttpResponseResolver } from "msw";
import type { SetupServerApi } from "msw/node";
import type { HTTPMethod, MockFetchFn, NonEmptyArray } from "./types";
import { createHandlersFromMethods } from "./utils";

export interface CreateMockFetchOptions {
  mswServer: SetupServerApi;
}

/**
 * Creates a mockFetch function that provides a cleaner API for defining MSW handlers.
 *
 * @param options - Configuration options
 * @param options.mswServer - MSW server instance from setupServer()
 * @returns The mockFetch function
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
export function createMockFetch({ mswServer }: CreateMockFetchOptions): MockFetchFn {
  if (!mswServer) {
    throw new Error("mswServer instance is required to create mockFetch");
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
        return createHandlersFromMethods(methodArray, endpointUrl, handlerResolver);
      });

      mswServer.use(...handlers);
      return;
    }

    if (url && resolver) {
      // handle single registration
      const methods = methodsOrEndpoints as NonEmptyArray<HTTPMethod> | HTTPMethod;
      const methodArray = Array.isArray(methods) ? methods : [methods];
      const handlers = createHandlersFromMethods(methodArray, url, resolver);

      mswServer.use(...handlers);
      return;
    }

    throw new Error("invalid arguments for mockFetch");
  };

  return mockFetch;
}
