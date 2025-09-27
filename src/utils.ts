import type { HttpResponseResolver } from "msw";
import type { HTTPMethod } from "./types";
import { http, HttpResponse } from "msw";

export function createHandlersFromMethods(methods: readonly HTTPMethod[], url: string, resolver: HttpResponseResolver) {
  return methods.map((method) => {
    // For HEAD requests, execute the resolver and return response without body
    if (method === "HEAD") {
      return createHeadHandler(url, resolver);
    }
    return http[method.toLowerCase() as Lowercase<HTTPMethod>](url, resolver);
  });
}

export function createHeadHandler(url: string, resolver: HttpResponseResolver) {
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