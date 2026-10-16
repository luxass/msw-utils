import { HttpHandler, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { version } from "msw/package.json";
import { afterAll, afterEach, beforeAll, expect, inject, it, vi } from "vitest";

import { createMockFetch } from "../src";
import { isMSWError } from "../src/runtime-guards";
import type { HTTPMethod } from "../src/types";
import { createHandlersFromMethods } from "../src/utils";
import { listenOptions, mswMajor, unhandledFetchError } from "./helpers/msw";

const server = setupServer();
const mockFetch = createMockFetch({ mswServer: server });
const base = "http://localhost";

beforeAll(() => {
  server.listen(listenOptions);
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

it("uses the selected MSW version in both tests and library handlers", async () => {
  expect(version).toBe(inject("mswVersion"));

  const selectedMSW = await vi.importActual<typeof import("msw")>(inject("mswEntry"));
  expect(HttpHandler).toBe(selectedMSW.HttpHandler);
  expect(HttpResponse).toBe(selectedMSW.HttpResponse);

  const handlers = createHandlersFromMethods(["GET", "HEAD"], "http://localhost/identity", () =>
    HttpResponse.json({ ok: true }),
  );
  for (const handler of handlers) {
    expect(handler).toBeInstanceOf(selectedMSW.HttpHandler);
  }
});

const methods: HTTPMethod[] = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

it.each(methods)("registers %s with the correct request method", async (method) => {
  mockFetch(
    method,
    `${base}/method`,
    ({ request }) =>
      new HttpResponse(request.method, {
        status: 202,
        headers: { "X-Method": request.method },
      }),
  );

  const response = await fetch(`${base}/method`, { method });
  expect(response.status).toBe(202);
  expect(response.headers.get("x-method")).toBe(method);
  expect(await response.text()).toBe(method === "HEAD" ? "" : method);
});

it("passes a POST body to an asynchronous resolver", async () => {
  mockFetch("POST", `${base}/body`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ received: body }, { status: 201 });
  });

  const response = await fetch(`${base}/body`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Ada" }),
  });
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ received: { name: "Ada" } });
});

it.each(["+", "*"])("preserves MSW's repeated parameter value for :parts%s", async (modifier) => {
  mockFetch("GET", `${base}/files/:parts${modifier}`, ({ params }) =>
    HttpResponse.json({ parts: params.parts }),
  );

  const response = await fetch(`${base}/files/a/b`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ parts: mswMajor === 2 ? ["a", "b"] : "a/b" });
});

it("matches a plain named parameter on both MSW majors", async () => {
  mockFetch("GET", `${base}/users/:id`, ({ params }) => HttpResponse.json({ id: params.id }));

  const response = await fetch(`${base}/users/123`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ id: "123" });
});

it("preserves the selected MSW major's inline regex constraint behavior", async () => {
  mockFetch("GET", `${base}/users/:id(\\d+)`, ({ params }) => HttpResponse.json({ id: params.id }));

  if (mswMajor === 3) {
    await expect(fetch(`${base}/users/123`)).rejects.toMatchObject(unhandledFetchError);
  } else {
    const response = await fetch(`${base}/users/123`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "123" });
  }
});

it("recognizes an actual MSW unhandled-request error", async () => {
  mockFetch("GET", `${base}/handled`, () => HttpResponse.json({ ok: true }));

  const request = fetch(`${base}/unhandled`);
  await expect(request).rejects.toMatchObject(unhandledFetchError);
  await expect(
    request.catch((error: Error) => isMSWError(mswMajor === 2 ? error : error.cause)),
  ).resolves.toBe(true);
});
