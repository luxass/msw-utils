import type { HttpResponseResolver } from "msw";
import type { SetupServerApi } from "msw/node";
import { http, HttpResponse } from "msw";

export type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
export type NonEmptyArray<T> = [T, ...T[]];

export interface CreateMockFetchOptions {
  mswServer: SetupServerApi;
}

export function createMockFetch({ mswServer }: CreateMockFetchOptions) {
  if (!mswServer) {
    throw new Error("mswServer instance is required to create mockFetch");
  }

  function mockFetch(
    methods: NonEmptyArray<HTTPMethod> | HTTPMethod,
    url: string,
    resolver: HttpResponseResolver,
  ): void;
  function mockFetch(
    endpoints: [NonEmptyArray<HTTPMethod> | HTTPMethod, string, HttpResponseResolver][],
  ): void;
  function mockFetch(
    methodsOrEndpoints: NonEmptyArray<HTTPMethod> | HTTPMethod | [NonEmptyArray<HTTPMethod> | HTTPMethod, string, HttpResponseResolver][],
    url?: string,
    resolver?: HttpResponseResolver,
  ): void {
    if (Array.isArray(methodsOrEndpoints) && methodsOrEndpoints.length > 0 && Array.isArray(methodsOrEndpoints[0])) {
      // handle batch registration
      const endpoints = methodsOrEndpoints as [NonEmptyArray<HTTPMethod> | HTTPMethod, string, HttpResponseResolver][];
      const handlers = endpoints.flatMap(([methods, endpointUrl, handlerResolver]) => {
        const methodArray = Array.isArray(methods) ? methods : [methods];
        return createHandlersFromMethods(methodArray, endpointUrl, handlerResolver);
      });

      mswServer.use(...handlers);
      return;
    } else if (url && resolver) {
      // handle single registration
      const methods = methodsOrEndpoints as NonEmptyArray<HTTPMethod> | HTTPMethod;
      const methodArray = Array.isArray(methods) ? methods : [methods];
      const handlers = createHandlersFromMethods(methodArray, url, resolver);

      mswServer.use(...handlers);
      return;
    }

    throw new Error("invalid arguments for mockFetch");
  }

  return { mockFetch };
}

function createHandlersFromMethods(methods: readonly HTTPMethod[], url: string, resolver: HttpResponseResolver) {
  return methods.map((method) => {
    // For HEAD requests, execute the resolver and return response without body
    if (method === "HEAD") {
      return createHeadHandler(url, resolver);
    }
    return http[method.toLowerCase() as Lowercase<HTTPMethod>](url, resolver);
  });
}

function createHeadHandler(url: string, resolver: HttpResponseResolver) {
  return http.head(url, async (info) => {
    const response = await resolver(info);

    if (!response) {
      return new HttpResponse(null, { status: 200 });
    }

    if ("type" in response && response.type === "error") {
      return HttpResponse.error();
    }

    if (response instanceof HttpResponse || response instanceof Response) {
      return new HttpResponse(null, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }

    return new HttpResponse(null, { status: 200 });
  });
}
