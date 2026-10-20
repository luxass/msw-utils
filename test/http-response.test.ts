import { HttpResponse as MSWHttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { HttpResponse } from "../src";

// The assignments also check the public response type and constructor signatures.
describe("HttpResponse", () => {
  it("exports the original MSW constructor and static methods", () => {
    const Constructor: typeof MSWHttpResponse = HttpResponse;
    expect(Constructor).toBe(MSWHttpResponse);
    expect(HttpResponse.prototype).toBe(MSWHttpResponse.prototype);
  });

  it("preserves constructor bodies, status, and headers", async () => {
    const response: HttpResponse<string> = new HttpResponse<string>("body", {
      status: 202,
      headers: { "X-Test": "constructor" },
    });
    expect(response).toBeInstanceOf(MSWHttpResponse);
    expect(response.status).toBe(202);
    expect(response.headers.get("x-test")).toBe("constructor");
    expect(await response.text()).toBe("body");
  });

  it("infers JSON literals and mutable nested arrays without body type arguments", async () => {
    const response: HttpResponse<{ state: "ready"; ids: number[] }> = HttpResponse.json(
      {
        state: "ready",
        ids: [1, 2],
      },
      { status: 201, headers: { "X-Test": "json" } },
    );
    expect(response).toBeInstanceOf(MSWHttpResponse);
    expect(response.status).toBe(201);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("x-test")).toBe("json");
    expect(await response.json()).toEqual({ state: "ready", ids: [1, 2] });
  });

  it("preserves null and omitted JSON bodies", async () => {
    const nullResponse: HttpResponse<null> = HttpResponse.json(null);
    const emptyResponse: HttpResponse<undefined> = HttpResponse.json();
    expect(await nullResponse.json()).toBeNull();
    expect(await emptyResponse.text()).toBe("");
  });

  it("keeps explicit JSON type arguments available", async () => {
    const response = HttpResponse.json<{ id: number }>({ id: 1 });
    expect(await response.json()).toEqual({ id: 1 });
  });

  it("preserves nominal body types and nested model arrays", async () => {
    class Model {
      #kind = "model";
      id = 1;

      get kind() {
        return this.#kind;
      }
    }

    const model = new Model();
    const explicit: HttpResponse<Model> = HttpResponse.json<Model>(model);
    const nested: HttpResponse<{ items: Model[] }> = HttpResponse.json({ items: [model] });
    expect(await explicit.json()).toEqual({ id: 1 });
    expect(await nested.json()).toEqual({ items: [{ id: 1 }] });
  });

  it("infers text literals and preserves other MSW response helpers", async () => {
    const text: HttpResponse<"ready"> = HttpResponse.text("ready");
    expect(await text.text()).toBe("ready");
    expect(await HttpResponse.html("<p>hello</p>").text()).toBe("<p>hello</p>");
    expect(await HttpResponse.xml("<hello />").text()).toBe("<hello />");
    expect(HttpResponse.error().type).toBe("error");
  });
});
