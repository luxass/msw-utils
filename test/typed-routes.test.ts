import { HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import { createMockFetch, createTypedMockFetch } from "../src";

const base = "http://localhost" as const;

declare module "../src" {
  interface URLRegistry {
    "http://localhost/api/users": {
      GET: Array<{ id: number; name: string }>;
      POST: { id: number; created: boolean };
    };
    "http://localhost/api/posts/:id": {
      GET: { id: string; title: string; body: string };
      PUT: { id: string; updated: boolean };
    };
  }
}

const server = setupServer();
const mockFetch = createMockFetch({ mswServer: server });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("module Augmentation - Runtime Tests", () => {
  it("should handle typed GET endpoint", async () => {
    mockFetch("GET", `${base}/api/users`, () => {
      return HttpResponse.json([
        { id: 1, name: "John" },
        { id: 2, name: "Jane" },
      ]);
    });

    const res = await fetch(`${base}/api/users`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([
      { id: 1, name: "John" },
      { id: 2, name: "Jane" },
    ]);
  });

  it("should handle typed POST endpoint", async () => {
    mockFetch("POST", `${base}/api/users`, () => {
      return HttpResponse.json({ id: 1, created: true });
    });

    const res = await fetch(`${base}/api/users`, {
      method: "POST",
      body: JSON.stringify({ name: "John" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ id: 1, created: true });
  });

  it("should handle multiple methods on same URL", async () => {
    mockFetch(["GET", "POST"], `${base}/api/users`, ({ request }) => {
      if (request.method === "GET") {
        return HttpResponse.json([{ id: 1, name: "John" }]);
      }

      return HttpResponse.json({ id: 1, created: true });
    });

    const getRes = await fetch(`${base}/api/users`);
    const getData = await getRes.json();
    expect(getData).toEqual([{ id: 1, name: "John" }]);

    const postRes = await fetch(`${base}/api/users`, { method: "POST" });
    const postData = await postRes.json();
    expect(postData).toEqual({ id: 1, created: true });
  });

  it("should handle path parameters", async () => {
    mockFetch("GET", `${base}/api/posts/:id`, ({ params }) => {
      return HttpResponse.json({
        id: params.id as string,
        title: "Test Post",
        body: "Test Body",
      });
    });

    const res = await fetch(`${base}/api/posts/123`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      id: "123",
      title: "Test Post",
      body: "Test Body",
    });
  });

  it("should handle batch registration with typed endpoints", async () => {
    mockFetch([
      ["GET", `${base}/api/users`, () => {
        return HttpResponse.json([{ id: 1, name: "John" }]);
      }],
      ["POST", `${base}/api/users`, () => {
        return HttpResponse.json({ id: 1, created: true });
      }],
    ]);

    const getRes = await fetch(`${base}/api/users`);
    const getData = await getRes.json();
    expect(getData).toEqual([{ id: 1, name: "John" }]);

    const postRes = await fetch(`${base}/api/users`, { method: "POST" });
    const postData = await postRes.json();
    expect(postData).toEqual({ id: 1, created: true });
  });

  it("should allow untyped URLs", async () => {
    mockFetch("GET", `${base}/untyped`, () =>
      HttpResponse.json({ anything: "goes" }));

    const res = await fetch(`${base}/untyped`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ anything: "goes" });
  });
});

interface MyURLs {
  "http://localhost/api/products": {
    GET: Array<{ id: string; name: string; price: number }>;
    POST: { id: string; created: boolean };
  };
  "http://localhost/api/orders/:orderId": {
    GET: { orderId: string; total: number; items: string[] };
  };
}

describe("typed Wrapper - Runtime Tests", () => {
  const typedMock = createTypedMockFetch<MyURLs>(mockFetch);

  it("should handle typed GET endpoint", async () => {
    typedMock("GET", `${base}/api/products`, () => {
      return HttpResponse.json([
        { id: "1", name: "Widget", price: 9.99 },
        { id: "2", name: "Gadget", price: 19.99 },
      ]);
    });

    const res = await fetch(`${base}/api/products`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([
      { id: "1", name: "Widget", price: 9.99 },
      { id: "2", name: "Gadget", price: 19.99 },
    ]);
  });

  it("should handle typed POST endpoint", async () => {
    typedMock("POST", `${base}/api/products`, () => {
      return HttpResponse.json({ id: "1", created: true });
    });

    const res = await fetch(`${base}/api/products`, {
      method: "POST",
      body: JSON.stringify({ name: "Widget", price: 9.99 }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ id: "1", created: true });
  });

  it("should handle path parameters", async () => {
    typedMock("GET", `${base}/api/orders/:orderId`, ({ params }) => {
      return HttpResponse.json({
        orderId: params.orderId as string,
        total: 99.99,
        items: ["item1", "item2"],
      });
    });

    const res = await fetch(`${base}/api/orders/123`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      orderId: "123",
      total: 99.99,
      items: ["item1", "item2"],
    });
  });

  it("should handle multiple methods on same URL", async () => {
    typedMock(["GET", "POST"], `${base}/api/products`, ({ request }) => {
      if (request.method === "GET") {
        return HttpResponse.json([{ id: "1", name: "Widget", price: 9.99 }]);
      }
      return HttpResponse.json({ id: "1", created: true });
    });

    const getRes = await fetch(`${base}/api/products`);
    const getData = await getRes.json();
    expect(getData).toEqual([{ id: "1", name: "Widget", price: 9.99 }]);

    const postRes = await fetch(`${base}/api/products`, { method: "POST" });
    const postData = await postRes.json();
    expect(postData).toEqual({ id: "1", created: true });
  });

  it("should handle batch registration", async () => {
    typedMock([
      ["GET", `${base}/api/products`, () => {
        return HttpResponse.json([{ id: "1", name: "Widget", price: 9.99 }]);
      }],
      ["POST", `${base}/api/products`, () => {
        return HttpResponse.json({ id: "1", created: true });
      }],
    ]);

    const getRes = await fetch(`${base}/api/products`);
    const getData = await getRes.json();
    expect(getData).toEqual([{ id: "1", name: "Widget", price: 9.99 }]);

    const postRes = await fetch(`${base}/api/products`, { method: "POST" });
    const postData = await postRes.json();
    expect(postData).toEqual({ id: "1", created: true });
  });
});
