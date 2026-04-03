import { HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { createMockFetch } from "../src";

const server = setupServer();
const mockFetch = createMockFetch({ mswServer: server });
const base = "http://localhost";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe("createMockFetch - Single Method Approach", () => {
  it("registers single method and responds", async () => {
    const spy = vi.spyOn(server, "use");
    mockFetch("GET", `${base}/api/a`, () => {
      return HttpResponse.json({ a: 1 });
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toHaveLength(1);

    const res = await fetch(`${base}/api/a`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ a: 1 });
  });

  it("registers batch endpoints with single methods", async () => {
    const spy = vi.spyOn(server, "use");
    mockFetch([
      [
        "GET",
        `${base}/batch/a`,
        () => {
          return HttpResponse.json({ a: true });
        },
      ],
      [
        "POST",
        `${base}/batch/b`,
        () => {
          return HttpResponse.json({ b: true });
        },
      ],
    ]);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toHaveLength(2);

    const a = await fetch(`${base}/batch/a`);
    expect(a.status).toBe(200);
    expect(await a.json()).toEqual({ a: true });

    const b = await fetch(`${base}/batch/b`, { method: "POST" });
    expect(b.status).toBe(200);
    expect(await b.json()).toEqual({ b: true });
  });

  it("matches path parameters with single method", async () => {
    const spy = vi.spyOn(server, "use");
    mockFetch("GET", `${base}/users/:id`, ({ params }) => {
      return HttpResponse.json({ id: params.id });
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toHaveLength(1);

    const resGet = await fetch(`${base}/users/123`);
    expect(resGet.status).toBe(200);
    expect(await resGet.json()).toEqual({ id: "123" });
  });

  it("matches path parameters with multiple segments using single method", async () => {
    const spy = vi.spyOn(server, "use");
    mockFetch("GET", `${base}/users/:id/posts/:postId`, ({ params }) => {
      return HttpResponse.json({ id: params.id, postId: params.postId });
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toHaveLength(1);

    const resGet = await fetch(`${base}/users/123/posts/456`);
    expect(resGet.status).toBe(200);
    expect(await resGet.json()).toEqual({ id: "123", postId: "456" });
  });

  it("replaces openapi path parameters with single method", async () => {
    const spy = vi.spyOn(server, "use");
    const mockFetch = createMockFetch({
      mswServer: server,
      replaceOpenAPIPathParams: true,
    });

    mockFetch("GET", `${base}/users/{id}/posts/{postId}`, ({ params }) => {
      return HttpResponse.json({ id: params.id, postId: params.postId });
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toHaveLength(1);

    const resGet = await fetch(`${base}/users/123/posts/456`);
    expect(resGet.status).toBe(200);
    expect(await resGet.json()).toEqual({ id: "123", postId: "456" });
  });

  it("does not replace openapi path parameters when not enabled with single method", async () => {
    const spy = vi.spyOn(server, "use");
    const mockFetch = createMockFetch({
      mswServer: server,
      replaceOpenAPIPathParams: false,
    });

    mockFetch("GET", `${base}/users/{id}/posts/{postId}`, ({ params }) => {
      return HttpResponse.json({ id: params.id, postId: params.postId });
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toHaveLength(1);

    await expect(() => fetch(`${base}/users/123/posts/456`)).rejects.toThrow(
      /\[MSW\] Cannot bypass a request when using the "error" strategy for the "onUnhandledRequest" option\./,
    );
  });

  it("throws on missing url/resolver for single method", () => {
    expect(() => mockFetch("GET" as any)).toThrow("invalid arguments for mockFetch");
  });

  it("throws when passing a single endpoint tuple without outer array", () => {
    const bad = ["GET", "/wrong/single-tuple", () => HttpResponse.json({ ok: true })];
    expect(() => mockFetch(bad as any)).toThrow("invalid arguments for mockFetch");
  });
});

describe("createMockFetch - Array Method Approach", () => {
  it("registers multiple methods (array) for one URL", async () => {
    const spy = vi.spyOn(server, "use");
    mockFetch(["GET", "POST"], `${base}/api/b`, ({ request }) => {
      return HttpResponse.json({ method: request.method });
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toHaveLength(2);

    const resGet = await fetch(`${base}/api/b`);
    expect(resGet.status).toBe(200);
    expect(await resGet.json()).toEqual({ method: "GET" });

    const resPost = await fetch(`${base}/api/b`, { method: "POST" });
    expect(resPost.status).toBe(200);
    expect(await resPost.json()).toEqual({ method: "POST" });
  });

  it("registers multiple methods including HEAD and OPTIONS for one URL", async () => {
    const spy = vi.spyOn(server, "use");
    mockFetch(["GET", "HEAD", "OPTIONS"], `${base}/api/mixed`, ({ request }) => {
      return HttpResponse.json({ method: request.method });
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toHaveLength(3);

    const resGet = await fetch(`${base}/api/mixed`);
    expect(resGet.status).toBe(200);
    expect(await resGet.json()).toEqual({ method: "GET" });

    const resHead = await fetch(`${base}/api/mixed`, { method: "HEAD" });
    expect(resHead.status).toBe(200);
    expect(await resHead.text()).toBe("");

    const resOptions = await fetch(`${base}/api/mixed`, { method: "OPTIONS" });
    expect(resOptions.status).toBe(200);
    expect(await resOptions.json()).toEqual({ method: "OPTIONS" });
  });

  it("matches path parameters with array methods", async () => {
    const spy = vi.spyOn(server, "use");
    mockFetch(["GET", "POST"], `${base}/users/:id`, ({ request, params }) => {
      return HttpResponse.json({ method: request.method, id: params.id });
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toHaveLength(2);

    const resGet = await fetch(`${base}/users/123`);
    expect(resGet.status).toBe(200);
    expect(await resGet.json()).toEqual({ method: "GET", id: "123" });

    const resPost = await fetch(`${base}/users/123`, { method: "POST" });
    expect(resPost.status).toBe(200);
    expect(await resPost.json()).toEqual({ method: "POST", id: "123" });
  });

  it("matches path parameters with multiple segments using array methods", async () => {
    const spy = vi.spyOn(server, "use");
    mockFetch(["GET", "PUT"], `${base}/users/:id/posts/:postId`, ({ request, params }) => {
      return HttpResponse.json({ method: request.method, id: params.id, postId: params.postId });
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toHaveLength(2);

    const resGet = await fetch(`${base}/users/123/posts/456`);
    expect(resGet.status).toBe(200);
    expect(await resGet.json()).toEqual({ method: "GET", id: "123", postId: "456" });

    const resPut = await fetch(`${base}/users/123/posts/456`, { method: "PUT" });
    expect(resPut.status).toBe(200);
    expect(await resPut.json()).toEqual({ method: "PUT", id: "123", postId: "456" });
  });

  it("replaces openapi path parameters with array methods", async () => {
    const spy = vi.spyOn(server, "use");
    const mockFetch = createMockFetch({
      mswServer: server,
      replaceOpenAPIPathParams: true,
    });

    mockFetch(["GET", "POST"], `${base}/users/{id}/posts/{postId}`, ({ request, params }) => {
      return HttpResponse.json({ method: request.method, id: params.id, postId: params.postId });
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toHaveLength(2);

    const resGet = await fetch(`${base}/users/123/posts/456`);
    expect(resGet.status).toBe(200);
    expect(await resGet.json()).toEqual({ method: "GET", id: "123", postId: "456" });

    const resPost = await fetch(`${base}/users/123/posts/456`, { method: "POST" });
    expect(resPost.status).toBe(200);
    expect(await resPost.json()).toEqual({ method: "POST", id: "123", postId: "456" });
  });

  it("does not replace openapi path parameters when not enabled with array methods", async () => {
    const spy = vi.spyOn(server, "use");
    const mockFetch = createMockFetch({
      mswServer: server,
      replaceOpenAPIPathParams: false,
    });

    mockFetch(["GET", "POST"], `${base}/users/{id}/posts/{postId}`, ({ request, params }) => {
      return HttpResponse.json({ method: request.method, id: params.id, postId: params.postId });
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toHaveLength(2);

    await expect(() => fetch(`${base}/users/123/posts/456`)).rejects.toThrow(
      /\[MSW\] Cannot bypass a request when using the "error" strategy for the "onUnhandledRequest" option\./,
    );
  });

  it("registers batch endpoints with array methods", async () => {
    const spy = vi.spyOn(server, "use");
    mockFetch([
      [
        ["GET", "DELETE"],
        `${base}/batch/b`,
        ({ request }) => {
          return HttpResponse.json({ method: request.method });
        },
      ],
    ]);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toHaveLength(2);

    const bGet = await fetch(`${base}/batch/b`);
    expect(bGet.status).toBe(200);
    expect(await bGet.json()).toEqual({ method: "GET" });

    const bDel = await fetch(`${base}/batch/b`, { method: "DELETE" });
    expect(bDel.status).toBe(200);
    expect(await bDel.json()).toEqual({ method: "DELETE" });
  });

  it("registers batch with a single tuple (array-of-one)", async () => {
    const spy = vi.spyOn(server, "use");
    mockFetch([
      [
        ["GET", "HEAD"],
        `${base}/batch/one`,
        ({ request }) => {
          return HttpResponse.json({ method: request.method });
        },
      ],
    ]);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toHaveLength(2);

    const resGet = await fetch(`${base}/batch/one`);
    expect(resGet.status).toBe(200);
    expect(await resGet.json()).toEqual({ method: "GET" });

    const resHead = await fetch(`${base}/batch/one`, { method: "HEAD" });
    expect(resHead.status).toBe(200);
    expect(await resHead.text()).toBe("");
  });
});

describe("createMockFetch - Mixed Batch Operations", () => {
  it("registers batch endpoints (mix of single and multi-method)", async () => {
    const spy = vi.spyOn(server, "use");
    mockFetch([
      [
        "GET",
        `${base}/batch/a`,
        () => {
          return HttpResponse.json({ a: true });
        },
      ],
      [
        ["GET", "DELETE"],
        `${base}/batch/b`,
        ({ request }) => {
          return HttpResponse.json({ method: request.method });
        },
      ],
    ]);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toHaveLength(3);

    const a = await fetch(`${base}/batch/a`);
    expect(a.status).toBe(200);
    expect(await a.json()).toEqual({ a: true });

    const bGet = await fetch(`${base}/batch/b`);
    expect(bGet.status).toBe(200);
    expect(await bGet.json()).toEqual({ method: "GET" });

    const bDel = await fetch(`${base}/batch/b`, { method: "DELETE" });
    expect(bDel.status).toBe(200);
    expect(await bDel.json()).toEqual({ method: "DELETE" });
  });

  it("throws on empty batch", () => {
    expect(() => mockFetch([] as any)).toThrow("invalid arguments for mockFetch");
  });
});
