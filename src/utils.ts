import type { HttpResponseResolver } from "msw";
import { http, HttpResponse } from "msw";

import type { HTTPMethod } from "./types";

export function createHandlersFromMethods(
  methods: readonly HTTPMethod[],
  url: string,
  resolver: HttpResponseResolver,
) {
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
    try {
      const response = await resolver(info);
      if (!response) return new HttpResponse(null, { status: 200 });
      return response instanceof Response ? toHeadResponse(response) : headResponses(response);
    } catch (error) {
      throw error instanceof Response ? toHeadResponse(error) : error;
    }
  });
}

function toHeadResponse(response: Response): Response {
  // Preserve bodiless responses, including MSW's network-error/passthrough signals.
  if (response.body === null) return response;
  return new HttpResponse(null, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    type: response.type,
  });
}

type ResponseSequence = Exclude<Awaited<ReturnType<HttpResponseResolver>>, Response | void>;

async function* headResponses(responses: ResponseSequence) {
  const iterator =
    Symbol.iterator in responses ? responses[Symbol.iterator]() : responses[Symbol.asyncIterator]();
  let step: Awaited<ReturnType<typeof iterator.next>> | undefined;
  try {
    step = await iterator.next();
    while (step.done !== true) {
      const value = await step.value;
      yield value ? toHeadResponse(value) : undefined;
      step = await iterator.next();
    }
    const value = await step.value;
    return value ? toHeadResponse(value) : undefined;
  } catch (error) {
    throw error instanceof Response ? toHeadResponse(error) : error;
  } finally {
    if (step?.done !== true) await iterator.return?.();
  }
}

const OPENAPI_PATH_PARAM_RE = /\{([^}]+)\}/gu;

export function replaceOpenAPIPathParamsWithMSWParams(url: string): string {
  OPENAPI_PATH_PARAM_RE.lastIndex = 0;
  return url.replace(OPENAPI_PATH_PARAM_RE, (placeholder: string, name: string, offset: number) => {
    const next = url[offset + placeholder.length];
    // Stop literal suffix text from becoming part of the MSW parameter name.
    const boundary = next !== undefined && /[A-Za-z0-9_]/u.test(next) ? "\\" : "";
    return `:${name}${boundary}`;
  });
}
