import { getResponse, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { createMockFetch } from "../src";
import { createHeadHandler } from "../src/utils";
import { listenOptions } from "./helpers/msw";

const server = setupServer();
const mockFetch = createMockFetch({ mswServer: server });
const base = "http://localhost";

beforeAll(() => {
  server.listen(listenOptions);
});
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => {
  server.close();
});

describe("HEAD handling", () => {
  it("returns 200 with empty body when resolver is undefined", async () => {
    mockFetch("HEAD", `${base}/head/empty`, async () => {
      // Intentionally return no response to exercise the HEAD fallback.
    });

    const res = await fetch(`${base}/head/empty`, { method: "HEAD" });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("");
  });

  it("copies status/statusText/headers from HttpResponse", async () => {
    mockFetch(
      "HEAD",
      `${base}/head/copy`,
      async () =>
        new HttpResponse("ignored", {
          status: 204,
          statusText: "No Content",
          headers: { "X-Test": "1" },
        }),
    );

    const res = await fetch(`${base}/head/copy`, { method: "HEAD" });
    expect(res.status).toBe(204);
    expect(res.statusText).toBe("No Content");
    expect(res.headers.get("x-test")).toBe("1");
    expect(await res.text()).toBe("");
  });

  it("copies status, statusText, and headers from a native Response without its body", async () => {
    mockFetch(
      "HEAD",
      `${base}/head/native`,
      () =>
        new Response("ignored", {
          status: 202,
          statusText: "Accepted",
          headers: { "X-Test": "native" },
        }),
    );

    const res = await fetch(`${base}/head/native`, { method: "HEAD" });
    expect(res.status).toBe(202);
    expect(res.statusText).toBe("Accepted");
    expect(res.headers.get("x-test")).toBe("native");
    expect(await res.text()).toBe("");
  });

  it("works with HttpResponse.json and preserves status", async () => {
    mockFetch("HEAD", `${base}/head/json`, () => HttpResponse.json({ ok: true }, { status: 201 }));

    const res = await fetch(`${base}/head/json`, { method: "HEAD" });
    expect(res.status).toBe(201);
    expect(await res.text()).toBe("");
  });

  it("keeps generator state, promised yields, and terminal responses", async () => {
    mockFetch("HEAD", `${base}/head/generator`, function* () {
      yield Promise.resolve(
        HttpResponse.text("first", { status: 201, headers: { "X-Step": "first" } }),
      );
      return HttpResponse.text("last", { status: 202, headers: { "X-Step": "last" } });
    });

    for (const [status, step] of [
      [201, "first"],
      [202, "last"],
      [202, "last"],
    ] as const) {
      const response = await fetch(`${base}/head/generator`, { method: "HEAD" });
      expect(response.status).toBe(status);
      expect(response.headers.get("x-step")).toBe(step);
      expect(await response.text()).toBe("");
    }
  });

  it("keeps asynchronous generator state and terminal responses", async () => {
    mockFetch("HEAD", `${base}/head/async-generator`, async function* () {
      yield new Response("first", { status: 201 });
      return new Response("last", { status: 202 });
    });

    for (const status of [201, 202, 202]) {
      const response = await fetch(`${base}/head/async-generator`, { method: "HEAD" });
      expect(response.status).toBe(status);
      expect(await response.text()).toBe("");
    }
  });

  it("removes the body from a thrown response", async () => {
    mockFetch("HEAD", `${base}/head/thrown`, () => {
      throw new Response("ignored", { status: 202, headers: { "X-Thrown": "yes" } });
    });

    const response = await fetch(`${base}/head/thrown`, { method: "HEAD" });
    expect(response.status).toBe(202);
    expect(response.headers.get("x-thrown")).toBe("yes");
    expect(await response.text()).toBe("");
  });

  it("removes bodies from responses thrown by generators", async () => {
    mockFetch("HEAD", `${base}/head/generator-throw`, function* () {
      yield new Response("first", { status: 201 });
      throw new Response("last", { status: 202 });
    });

    for (const status of [201, 202]) {
      const response = await fetch(`${base}/head/generator-throw`, { method: "HEAD" });
      expect(response.status).toBe(status);
      expect(await response.text()).toBe("");
    }
  });

  it("does not rebuild a response that already has no body", async () => {
    const original = new HttpResponse(null, { headers: { "X-Metadata": "retained" } });
    const handler = createHeadHandler(`${base}/head/identity`, () => original);
    const response = await getResponse(
      [handler],
      new Request(`${base}/head/identity`, { method: "HEAD" }),
    );
    expect(response).toBe(original);
  });

  it("propagates error responses as fetch rejection", async () => {
    mockFetch("HEAD", `${base}/head/error`, () => HttpResponse.error());
    await expect(fetch(`${base}/head/error`, { method: "HEAD" })).rejects.toThrow();
  });
});

describe("non-HEAD handler mapping", () => {
  it("maps PATCH to http.patch and responds", async () => {
    mockFetch("PATCH", `${base}/utils/patch`, () =>
      HttpResponse.json({ ok: true }, { status: 202 }),
    );

    const res = await fetch(`${base}/utils/patch`, { method: "PATCH" });
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ ok: true });
  });
});
