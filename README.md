# @luxass/msw-utils

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]

A collection of utilities for working with [MSW (Mock Service Worker)](https://mswjs.io/).

> [!IMPORTANT]
> This package is still in a very early stage of development and many things are still missing. If you have any suggestions or ideas, please open an issue or a pull request.

## Installation

```bash
npm install @luxass/msw-utils
```

## Usage

> [!NOTE]
> This library requires MSW to be set up in your testing environment. Follow the [MSW Vitest integration guide](https://mswjs.io/docs/integrations/vitest) for complete setup instructions.

```ts
// test/utils.ts
import { createMockFetch } from "@luxass/msw-utils";
import { setupServer } from "msw/node";

export const server = setupServer();
export const mockFetch = createMockFetch({ mswServer: server });
```

```ts
// vitest.setup.ts
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./test/utils.js";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
```

```ts
// your-test.test.ts
import { HttpResponse } from "msw";
import { mockFetch } from "./test/utils.js";

test("should fetch version", async () => {
  mockFetch("GET", "/api/v1/versions", () => {
    return HttpResponse.json({ version: "1.0.0" });
  });

  const response = await fetch("/api/v1/versions");
  const data = await response.json();

  expect(data).toEqual({ version: "1.0.0" });
});
```

<details>
<summary><strong>Alternative: Using Global mockFetch with vi.stubGlobal</strong></summary>

If you prefer to avoid importing `mockFetch` in every test file, you can make it globally available:

```ts
// test/utils.ts
import { createMockFetch } from "@luxass/msw-utils";
import { setupServer } from "msw/node";

export const server = setupServer();
export const mockFetch = createMockFetch({ mswServer: server });
```

```ts
// vitest.setup.ts
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { mockFetch, server } from "./test/utils.js";

vi.stubGlobal("mockFetch", mockFetch);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
```

```ts
// your-test.test.ts
import { HttpResponse } from "msw";

// mockFetch is available globally via vi.stubGlobal
test("should fetch version", async () => {
  mockFetch("GET", "/api/v1/versions", () => {
    return HttpResponse.json({ version: "1.0.0" });
  });

  const response = await fetch("/api/v1/versions");
  const data = await response.json();

  expect(data).toEqual({ version: "1.0.0" });
});
```

</details>

## Typed Mock Fetch

The library provides type-safe mocking with TypeScript through two approaches:

### Global Type Registry (Module Augmentation)

You can augment the `URLRegistry` interface to define type-safe routes globally:

```ts
// types/msw-utils.d.ts
declare module "@luxass/msw-utils" {
  interface URLRegistry {
    "/api/users": {
      GET: Array<{ id: number; name: string }>;
      POST: { id: number; created: boolean };
    };
    "/api/posts/:id": {
      GET: { id: string; title: string; body: string };
      PUT: { id: string; updated: boolean };
    };
  }
}
```

```ts
// your-test.test.ts
import { HttpResponse } from "msw";
import { mockFetch } from "./test/utils.js";

test("should fetch users with type safety", async () => {
  // TypeScript enforces the response type matches URLRegistry
  mockFetch("GET", "/api/users", () => {
    return HttpResponse.json([
      { id: 1, name: "John" },
      { id: 2, name: "Jane" },
    ]);
  });

  const response = await fetch("/api/users");
  const data = await response.json();

  expect(data).toEqual([
    { id: 1, name: "John" },
    { id: 2, name: "Jane" },
  ]);
});

test("should create user with type safety", async () => {
  mockFetch("POST", "/api/users", () => {
    return HttpResponse.json({ id: 1, created: true });
  });

  const response = await fetch("/api/users", {
    method: "POST",
    body: JSON.stringify({ name: "John" }),
  });
  const data = await response.json();

  expect(data).toEqual({ id: 1, created: true });
});
```

### Per-Instance Type Registry

Alternatively, you can use `createTypedMockFetch` to create a typed wrapper without global augmentation:

```ts
// test/utils.ts
import { createMockFetch, createTypedMockFetch } from "@luxass/msw-utils";
import { setupServer } from "msw/node";

interface MyURLs {
  "/api/products": {
    GET: Array<{ id: string; name: string; price: number }>;
    POST: { id: string; created: boolean };
  };
  "/api/orders/:orderId": {
    GET: { orderId: string; total: number; items: string[] };
  };
}

export const server = setupServer();
export const mockFetch = createMockFetch({ mswServer: server });
export const typedMock = createTypedMockFetch<MyURLs>(mockFetch);
```

```ts
// your-test.test.ts
import { HttpResponse } from "msw";
import { typedMock } from "./test/utils.js";

test("should fetch products with type safety", async () => {
  // TypeScript enforces the response type matches MyURLs
  typedMock("GET", "/api/products", () => {
    return HttpResponse.json([
      { id: "1", name: "Widget", price: 9.99 },
      { id: "2", name: "Gadget", price: 19.99 },
    ]);
  });

  const response = await fetch("/api/products");
  const data = await response.json();

  expect(data).toHaveLength(2);
});

test("should handle path parameters with type safety", async () => {
  typedMock("GET", "/api/orders/:orderId", ({ params }) => {
    return HttpResponse.json({
      orderId: params.orderId as string,
      total: 99.99,
      items: ["item1", "item2"],
    });
  });

  const response = await fetch("/api/orders/123");
  const data = await response.json();

  expect(data.orderId).toBe("123");
});
```

Both approaches support:

- Single method endpoints
- Multiple methods on the same URL
- Path parameters
- Batch registration of endpoints

## API

### `createMockFetch(options)`

Creates a mockFetch function that uses MSW server under the hood but provides a nicer developer experience.

#### Parameters

- `options.mswServer`: An MSW server instance from `setupServer()`

#### Returns

The `mockFetch` function.

### `mockFetch(methods, url, resolver)`

Register a single endpoint with one or more HTTP methods.

#### Parameters

- `methods`: HTTP method(s) - can be a single method or array of methods
- `url`: The endpoint URL pattern
- `resolver`: MSW HttpResponseResolver function

### `mockFetch(endpoints)`

Register multiple endpoints at once.

#### Parameters

- `endpoints`: Array of `[methods, url, resolver]` tuples

### `createTypedMockFetch(mockFetch)`

Creates a type-safe wrapper around `mockFetch` with inline URL registry. Provides an alternative to module augmentation for users who prefer explicit type parameters.

#### Parameters

- `mockFetch`: A `MockFetchFn` instance from `createMockFetch()`

#### Type Parameters

- `Registry`: Record mapping URLs to HTTP methods and their response types

#### Returns

A type-safe `mockFetch` wrapper with enforced response types based on the registry.

#### Example

```ts
interface MyURLs {
  "/api/users": {
    GET: User[];
    POST: CreateUserResponse;
  };
}

const mockFetch = createMockFetch({ mswServer: server });
const typedMock = createTypedMockFetch<MyURLs>(mockFetch);

// Type-safe - enforces User[] response
typedMock("GET", "/api/users", () => HttpResponse.json([...yourResponse]));

// Type error - wrong response type
typedMock("GET", "/api/users", () => HttpResponse.json("wrong"));
```

## Runtime Guards

The package also exports runtime type guards for MSW-specific types. Import from `@luxass/msw-utils/runtime-guards`:

### `isMSWError(error)`

Checks if an error is an MSW internal error. MSW throws internal errors with the name `"InternalError"` and prefixes error messages with `"[MSW]"`.

#### Parameters

- `error`: The error to check (type: `unknown`)

#### Returns

`true` if the error is from MSW (type predicate: `error is Error`)

#### Example

```ts
import { isMSWError } from "@luxass/msw-utils/runtime-guards";

try {
  // some code that might throw MSW errors
} catch (error) {
  if (isMSWError(error)) {
    console.log("This is an MSW error:", error.message);
  } else {
    console.log("This is not an MSW error");
  }
}
```

## 📄 License

Published under [MIT License](./LICENSE).

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@luxass/msw-utils?style=flat&colorA=18181B&colorB=4169E1
[npm-version-href]: https://npmjs.com/package/@luxass/msw-utils
[npm-downloads-src]: https://img.shields.io/npm/dm/@luxass/msw-utils?style=flat&colorA=18181B&colorB=4169E1
[npm-downloads-href]: https://npmjs.com/package/@luxass/msw-utils
