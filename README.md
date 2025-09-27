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

```ts
// vitest global setup
import { createMockFetch } from "@luxass/msw-utils";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

const MSW_SERVER = setupServer();

const { mockFetch } = createMockFetch({ mswServer: MSW_SERVER });

beforeAll(() => MSW_SERVER.listen({ onUnhandledRequest: "error" }));
afterAll(() => MSW_SERVER.close());
afterEach(() => MSW_SERVER.resetHandlers());

// in your test file
mockFetch([
  ["GET", `/api/v1/versions`, () => {
    return HttpResponse.json({ version: "1.0.0" });
  }],
]);
```

## 📄 License

Published under [MIT License](./LICENSE).

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@luxass/msw-utils?style=flat&colorA=18181B&colorB=4169E1
[npm-version-href]: https://npmjs.com/package/@luxass/msw-utils
[npm-downloads-src]: https://img.shields.io/npm/dm/@luxass/msw-utils?style=flat&colorA=18181B&colorB=4169E1
[npm-downloads-href]: https://npmjs.com/package/@luxass/msw-utils
