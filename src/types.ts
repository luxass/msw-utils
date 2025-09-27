import type { HttpResponseResolver } from "msw";

export type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
export type NonEmptyArray<T> = [T, ...T[]];

export interface MockFetchFn {
  (methods: NonEmptyArray<HTTPMethod> | HTTPMethod, url: string, resolver: HttpResponseResolver): void;
  (endpoints: [NonEmptyArray<HTTPMethod> | HTTPMethod, string, HttpResponseResolver][]): void;
  (methodsOrEndpoints: NonEmptyArray<HTTPMethod> | HTTPMethod | [NonEmptyArray<HTTPMethod> | HTTPMethod, string, HttpResponseResolver][], url?: string, resolver?: HttpResponseResolver): void;
}
