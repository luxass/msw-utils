import { HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createMockFetch } from "../src/index";

const server = setupServer();
const mockFetch = createMockFetch({ mswServer: server });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("createMockFetch", () => {
  it("should throw error when mswServer is not provided", () => {
    expect(() => createMockFetch({ mswServer: null as any })).toThrow(
      "mswServer instance is required to create mockFetch",
    );
  });

  it("should return mockFetch function", () => {
    const result = createMockFetch({ mswServer: server });
    expect(typeof result).toBe("function");
  });
});

describe("mockFetch - single endpoint registration", () => {
  it("should mock a single GET endpoint", async () => {
    mockFetch("GET", "/api/test", () => {
      return HttpResponse.json({ message: "success" });
    });

    const response = await fetch("/api/test");
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ message: "success" });
  });

  it("should mock a single POST endpoint", async () => {
    mockFetch("POST", "/api/users", () => {
      return HttpResponse.json({ id: 1, name: "John" }, { status: 201 });
    });

    const response = await fetch("/api/users", { method: "POST" });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual({ id: 1, name: "John" });
  });

  it("should mock multiple HTTP methods for the same endpoint", async () => {
    mockFetch(["GET", "POST"], "/api/multi", ({ request }) => {
      if (request.method === "GET") {
        return HttpResponse.json({ method: "GET" });
      }
      return HttpResponse.json({ method: "POST" }, { status: 201 });
    });

    const getResponse = await fetch("/api/multi");
    const getData = await getResponse.json();
    expect(getResponse.status).toBe(200);
    expect(getData).toEqual({ method: "GET" });

    const postResponse = await fetch("/api/multi", { method: "POST" });
    const postData = await postResponse.json();
    expect(postResponse.status).toBe(201);
    expect(postData).toEqual({ method: "POST" });
  });

  it("should handle all HTTP methods", async () => {
    const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"] as const;

    methods.forEach((method) => {
      mockFetch(method, `/api/${method.toLowerCase()}`, () => {
        return HttpResponse.json({ method });
      });
    });

    for (const method of methods) {
      const response = await fetch(`/api/${method.toLowerCase()}`, { method });
      const data = await response.json();
      expect(data).toEqual({ method });
    }
  });

  it("should handle HEAD requests properly", async () => {
    mockFetch("HEAD", "/api/head", () => {
      return HttpResponse.json(
        { data: "should not be in response body" },
        {
          headers: { "X-Custom-Header": "test-value" },
          status: 200,
        },
      );
    });

    const response = await fetch("/api/head", { method: "HEAD" });

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Custom-Header")).toBe("test-value");
    expect(await response.text()).toBe("");
  });

  it("should handle HEAD requests with multiple methods", async () => {
    mockFetch(["GET", "HEAD"], "/api/both", () => {
      return HttpResponse.json(
        { users: [] },
        {
          headers: { "X-Total-Count": "0" },
        },
      );
    });

    const headResponse = await fetch("/api/both", { method: "HEAD" });
    expect(headResponse.status).toBe(200);
    expect(headResponse.headers.get("X-Total-Count")).toBe("0");
    expect(await headResponse.text()).toBe("");

    const getResponse = await fetch("/api/both");
    const getData = await getResponse.json();
    expect(getResponse.status).toBe(200);
    expect(getResponse.headers.get("X-Total-Count")).toBe("0");
    expect(getData).toEqual({ users: [] });
  });
});

describe("mockFetch - batch registration", () => {
  it("should register multiple endpoints at once", async () => {
    mockFetch([
      ["GET", "/api/endpoint1", () => HttpResponse.json({ endpoint: 1 })],
      ["POST", "/api/endpoint2", () => HttpResponse.json({ endpoint: 2 }, { status: 201 })],
      ["PUT", "/api/endpoint3", () => HttpResponse.json({ endpoint: 3 })],
    ]);

    const response1 = await fetch("/api/endpoint1");
    const data1 = await response1.json();
    expect(data1).toEqual({ endpoint: 1 });

    const response2 = await fetch("/api/endpoint2", { method: "POST" });
    const data2 = await response2.json();
    expect(response2.status).toBe(201);
    expect(data2).toEqual({ endpoint: 2 });

    const response3 = await fetch("/api/endpoint3", { method: "PUT" });
    const data3 = await response3.json();
    expect(data3).toEqual({ endpoint: 3 });
  });

  it("should handle multiple methods per endpoint in batch registration", async () => {
    mockFetch([
      [["GET", "POST"], "/api/multi1", ({ request }) => {
        return HttpResponse.json({ method: request.method });
      }],
      [["PUT", "DELETE"], "/api/multi2", ({ request }) => {
        return HttpResponse.json({ method: request.method });
      }],
    ]);

    const getResponse = await fetch("/api/multi1");
    const getData = await getResponse.json();
    expect(getData).toEqual({ method: "GET" });

    const postResponse = await fetch("/api/multi1", { method: "POST" });
    const postData = await postResponse.json();
    expect(postData).toEqual({ method: "POST" });

    const putResponse = await fetch("/api/multi2", { method: "PUT" });
    const putData = await putResponse.json();
    expect(putData).toEqual({ method: "PUT" });

    const deleteResponse = await fetch("/api/multi2", { method: "DELETE" });
    const deleteData = await deleteResponse.json();
    expect(deleteData).toEqual({ method: "DELETE" });
  });
});

describe("mockFetch - advanced scenarios", () => {
  it("should handle path parameters", async () => {
    mockFetch("GET", "/api/users/:id", ({ params }) => {
      const { id } = params;
      return HttpResponse.json({ id: Number(id), name: `User ${id}` });
    });

    const response = await fetch("/api/users/123");
    const data = await response.json();

    expect(data).toEqual({ id: 123, name: "User 123" });
  });

  it("should handle request body", async () => {
    mockFetch("POST", "/api/users", async ({ request }) => {
      const userData = await request.json();
      return HttpResponse.json(
        {
          id: Date.now(),
          ...userData,
        },
        { status: 201 },
      );
    });

    const userData = { name: "John Doe", email: "john@example.com" };
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    expect(response.status).toBe(201);
    expect(data).toMatchObject(userData);
    expect(data.id).toBeDefined();
  });

  it("should handle custom headers", async () => {
    mockFetch("GET", "/api/headers", () => {
      return HttpResponse.json(
        { data: "test" },
        {
          headers: {
            "X-Custom-Header": "custom-value",
            "Cache-Control": "no-cache",
          },
        },
      );
    });

    const response = await fetch("/api/headers");

    expect(response.headers.get("X-Custom-Header")).toBe("custom-value");
    expect(response.headers.get("Cache-Control")).toBe("no-cache");
  });

  it("should handle error responses", async () => {
    mockFetch("GET", "/api/error", () => {
      return HttpResponse.json(
        { error: "Something went wrong" },
        { status: 500 },
      );
    });

    const response = await fetch("/api/error");
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Something went wrong" });
  });

  it("should handle empty responses", async () => {
    mockFetch("DELETE", "/api/users/:id", () => {
      return new HttpResponse(null, { status: 204 });
    });

    const response = await fetch("/api/users/123", { method: "DELETE" });

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });
});

describe("mockFetch - HEAD request edge cases", () => {
  it("should handle HEAD requests when resolver returns null", async () => {
    mockFetch("HEAD", "/api/null", () => null);

    const response = await fetch("/api/null", { method: "HEAD" });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });

  it("should handle HEAD requests when resolver returns error", async () => {
    mockFetch("HEAD", "/api/error-head", () => {
      return HttpResponse.error();
    });

    const response = await fetch("/api/error-head", { method: "HEAD" });

    expect(response.type).toBe("error");
  });

  it("should handle HEAD requests with Response object", async () => {
    mockFetch("HEAD", "/api/response-obj", () => {
      return new Response("body content", {
        status: 202,
        statusText: "Accepted",
        headers: { "X-Test": "value" },
      });
    });

    const response = await fetch("/api/response-obj", { method: "HEAD" });

    expect(response.status).toBe(202);
    expect(response.statusText).toBe("Accepted");
    expect(response.headers.get("X-Test")).toBe("value");
    expect(await response.text()).toBe("");
  });
});

describe("mockFetch - error handling", () => {
  it("should throw error for invalid arguments", () => {
    expect(() => {
      mockFetch([] as any);
    }).toThrow("invalid arguments for mockFetch");
  });

  it("should throw error when missing required parameters for single registration", () => {
    expect(() => {
      mockFetch("GET" as any);
    }).toThrow("invalid arguments for mockFetch");
  });
});
