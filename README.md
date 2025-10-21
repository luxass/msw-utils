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
