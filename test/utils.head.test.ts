import { HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
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

// eslint-disable-next-line test/prefer-lowercase-title
describe("HEAD handling", () => {
  it("returns 200 with empty body when resolver is undefined", async () => {
    mockFetch("HEAD", `${base}/head/empty`, async () => undefined as any);

    const res = await fetch(`${base}/head/empty`, { method: "HEAD" });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("");
  });

  it("copies status/statusText/headers from HttpResponse", async () => {
    mockFetch("HEAD", `${base}/head/copy`, async () =>
      new HttpResponse("ignored", {
        status: 204,
        statusText: "No Content",
        headers: { "X-Test": "1" },
      }));

    const res = await fetch(`${base}/head/copy`, { method: "HEAD" });
    expect(res.status).toBe(204);
    expect(res.statusText).toBe("No Content");
    expect(res.headers.get("x-test")).toBe("1");
    expect(await res.text()).toBe("");
  });

  it("works with HttpResponse.json and preserves status", async () => {
    mockFetch("HEAD", `${base}/head/json`, () => HttpResponse.json({ ok: true }, { status: 201 }));

    const res = await fetch(`${base}/head/json`, { method: "HEAD" });
    expect(res.status).toBe(201);
    expect(await res.text()).toBe("");
  });

  it("propagates error responses as fetch rejection", async () => {
    mockFetch("HEAD", `${base}/head/error`, () => HttpResponse.error());
    await expect(fetch(`${base}/head/error`, { method: "HEAD" })).rejects.toThrow();
  });
});

describe("non-HEAD handler mapping", () => {
  it("maps PATCH to http.patch and responds", async () => {
    mockFetch("PATCH", `${base}/utils/patch`, () => HttpResponse.json({ ok: true }, { status: 202 }));

    const res = await fetch(`${base}/utils/patch`, { method: "PATCH" });
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ ok: true });
  });
});
