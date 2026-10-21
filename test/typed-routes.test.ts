import { HttpResponse as MSWHttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createMockFetch, createTypedMockFetch, HttpResponse } from "../src";
import { listenOptions } from "./helpers/msw";

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

beforeAll(() => {
  server.listen(listenOptions);
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

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
      [
        "GET",
        `${base}/api/users`,
        () => {
          return HttpResponse.json([{ id: 1, name: "John" }]);
        },
      ],
      [
        "POST",
        `${base}/api/users`,
        () => {
          return HttpResponse.json({ id: 1, created: true });
        },
      ],
    ]);

    const getRes = await fetch(`${base}/api/users`);
    const getData = await getRes.json();
    expect(getData).toEqual([{ id: 1, name: "John" }]);

    const postRes = await fetch(`${base}/api/users`, { method: "POST" });
    const postData = await postRes.json();
    expect(postData).toEqual({ id: 1, created: true });
  });

  it("should allow untyped URLs", async () => {
    mockFetch("GET", `${base}/untyped`, () => HttpResponse.json({ anything: "goes" }));

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

  it("returns the original registration function", () => {
    expect(typedMock).toBe(mockFetch);
  });

  it("infers responses for a batch entry with multiple methods", async () => {
    typedMock([
      [
        ["GET", "POST"],
        `${base}/api/products`,
        ({ request }) =>
          request.method === "GET"
            ? HttpResponse.json([{ id: "1", name: "Widget", price: 9.99 }])
            : HttpResponse.json({ id: "1", created: true }),
      ],
    ]);

    const get = await fetch(`${base}/api/products`);
    expect(await get.json()).toEqual([{ id: "1", name: "Widget", price: 9.99 }]);
    const post = await fetch(`${base}/api/products`, { method: "POST" });
    expect(await post.json()).toEqual({ id: "1", created: true });
  });

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
      [
        "GET",
        `${base}/api/products`,
        () => {
          return HttpResponse.json([{ id: "1", name: "Widget", price: 9.99 }]);
        },
      ],
      [
        "POST",
        `${base}/api/products`,
        () => {
          return HttpResponse.json({ id: "1", created: true });
        },
      ],
    ]);

    const getRes = await fetch(`${base}/api/products`);
    const getData = await getRes.json();
    expect(getData).toEqual([{ id: "1", name: "Widget", price: 9.99 }]);

    const postRes = await fetch(`${base}/api/products`, { method: "POST" });
    const postData = await postRes.json();
    expect(postData).toEqual({ id: "1", created: true });
  });
});

type InferredResult = { kind: "ok"; value: number } | { kind: "error"; message: string };

function assertTypedMockFetchTypeSignatures(result: InferredResult) {
  const typedMock = createTypedMockFetch<MyURLs>(mockFetch);

  typedMock<"http://localhost/api/products", "GET">("GET", `${base}/api/products`, () =>
    HttpResponse.json([{ id: "1", name: "Widget", price: 9.99 }]),
  );

  typedMock<"http://localhost/api/products", ["GET", "POST"]>(
    ["GET", "POST"],
    `${base}/api/products`,
    ({ request }) =>
      request.method === "GET"
        ? HttpResponse.json([{ id: "1", name: "Widget", price: 9.99 }])
        : HttpResponse.json({ id: "1", created: true }),
  );

  typedMock<"GET", "http://localhost/api/products">("GET", `${base}/api/products`, () =>
    HttpResponse.json([{ id: "1", name: "Widget", price: 9.99 }]),
  );

  typedMock<"http://localhost/api/products", "GET">(
    "GET",
    `${base}/api/products`,
    // @ts-expect-error explicit URL-first type arguments still constrain response bodies
    () => HttpResponse.json({ wrongShape: true }),
  );

  typedMock([
    [
      "GET",
      `${base}/api/products`,
      () => {
        return HttpResponse.json([{ id: "1", name: "Widget", price: 9.99 }]);
      },
    ],
  ]);

  typedMock("GET", `${base}/unregistered`, () => HttpResponse.json({ unrestricted: true }));

  // The native MSW import remains compatible with existing single and batch calls.
  typedMock("GET", `${base}/api/products`, () =>
    MSWHttpResponse.json([{ id: "1", name: "Widget", price: 9.99 }]),
  );
  typedMock([
    [
      "GET",
      `${base}/api/products`,
      () =>
        MSWHttpResponse.json<MyURLs["http://localhost/api/products"]["GET"]>([
          { id: "1", name: "Widget", price: 9.99 },
        ]),
    ],
  ]);

  const isolatedMock = createTypedMockFetch<{
    "http://localhost/api/users": { GET: { source: "instance" } };
  }>(mockFetch);
  isolatedMock("GET", `${base}/api/users`, () => HttpResponse.json({ source: "instance" }));

  // @ts-expect-error the instance registry replaces the global response type for this URL
  isolatedMock("GET", `${base}/api/users`, () => HttpResponse.json([{ id: 1, name: "John" }]));

  // @ts-expect-error registered GET routes require the declared array response
  mockFetch("GET", `${base}/api/users`, () => HttpResponse.json({ wrongShape: true }));

  // @ts-expect-error registered routes keep their response type in batches
  mockFetch([["GET", `${base}/api/users`, () => HttpResponse.json({ wrongShape: true })]]);

  // @ts-expect-error a multi-method resolver must return one of its registered response types
  mockFetch(["GET", "POST"], `${base}/api/users`, () => HttpResponse.json({ wrongShape: true }));

  // @ts-expect-error the instance registry requires an array for GET products
  typedMock("GET", `${base}/api/products`, () => HttpResponse.json({ wrongShape: true }));

  // @ts-expect-error the instance registry also constrains batch response bodies
  typedMock([["GET", `${base}/api/products`, () => HttpResponse.json({ wrongShape: true })]]);

  // @ts-expect-error instance-specific multi-method resolvers cannot return unrelated bodies
  typedMock(["GET", "POST"], `${base}/api/products`, () => HttpResponse.json({ wrongShape: true }));

  // @ts-expect-error runtime requires both url and resolver for single-method registration
  typedMock("GET");

  // @ts-expect-error runtime requires a resolver for single-method registration
  typedMock("GET", `${base}/typed-wrapper/missing-resolver`);

  // @ts-expect-error runtime requires a resolver for multi-method registration
  typedMock(["GET", "POST"], `${base}/typed-wrapper/missing-resolver`);

  // @ts-expect-error runtime requires a resolver for batch registration
  typedMock([["GET", `${base}/typed-wrapper/batch-missing-resolver`]]);

  const inferred = createTypedMockFetch<{
    "/inference/nested": { GET: { state: "ready"; groups: { kind: "user"; ids: number[] }[] } };
    "/inference/tuple": { GET: [number, string] };
    "/inference/result": { GET: InferredResult };
    "/inference/text": { GET: "ready" | "waiting" };
    "/inference/nullable": { GET: { id: number } | null };
    "/inference/number": { GET: 0 | 1 };
  }>(mockFetch);

  // No response-body annotations, including nested literals, tuples, and unions.
  inferred([
    [
      "GET",
      "/inference/nested",
      () =>
        HttpResponse.json({
          state: "ready",
          groups: [{ kind: "user", ids: [1, 2] }],
        }),
    ],
    ["GET", "/inference/tuple", () => HttpResponse.json([1, "one"])],
    ["GET", "/inference/result", () => HttpResponse.json(result)],
    ["GET", "/inference/text", () => HttpResponse.text("ready")],
    ["GET", "/inference/nullable", () => HttpResponse.json(null)],
    ["GET", "/inference/number", () => HttpResponse.json(1)],
  ]);

  // @ts-expect-error the GET schema is not the POST schema
  typedMock([["GET", `${base}/api/products`, () => HttpResponse.json({ id: "1", created: true })]]);

  // @ts-expect-error multi-method batch entries cannot return unrelated bodies
  typedMock([[["GET", "POST"], `${base}/api/products`, () => HttpResponse.json({ wrong: true })]]);

  // @ts-expect-error a literal discriminant must match the registered value
  inferred([["GET", "/inference/nested", () => HttpResponse.json({ state: "wrong", groups: [] })]]);

  // @ts-expect-error tuple positions retain their registered types
  inferred([["GET", "/inference/tuple", () => HttpResponse.json(["one", 1])]]);

  inferred([
    // @ts-expect-error union branches still require their declared fields
    ["GET", "/inference/result", () => HttpResponse.json({ kind: "ok", message: "wrong" })],
  ]);

  // @ts-expect-error inferred text must match one of the registered literals
  inferred([["GET", "/inference/text", () => HttpResponse.text("wrong")]]);

  // @ts-expect-error a missing JSON body is not one of the registered text literals
  inferred([["GET", "/inference/text", () => HttpResponse.json()]]);

  // @ts-expect-error explicit body type arguments still check the JSON input
  HttpResponse.json<{ id: number }>({ id: "wrong" });
}

describe("typed Wrapper - Type Signatures", () => {
  it("keeps typed wrapper call shapes aligned with runtime validation", () => {
    expect(assertTypedMockFetchTypeSignatures).toBeTypeOf("function");
  });
});
