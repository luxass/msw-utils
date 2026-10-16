import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const targets = [
  { name: "msw-2-min", version: "2.11.0", major: 2 },
  { name: "msw-2", version: "2.15.0", major: 2 },
  { name: "msw-3-min", version: "3.0.0", major: 3 },
  { name: "msw-3", version: "3.0.3", major: 3 },
];

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["test/runtime-guards.test.ts"],
        },
      },
      ...targets.map(({ name, version, major }) => {
        const entry = fileURLToPath(import.meta.resolve(name));

        return {
          resolve: {
            alias: [
              { find: /^msw$/u, replacement: entry },
              {
                find: /^msw\/node$/u,
                replacement: fileURLToPath(import.meta.resolve(`${name}/node`)),
              },
              {
                find: /^msw\/package\.json$/u,
                replacement: fileURLToPath(import.meta.resolve(`${name}/package.json`)),
              },
            ],
          },
          test: {
            name,
            pool: "forks" as const,
            include: [
              "test/factory.test.ts",
              "test/utils.head.test.ts",
              "test/compatibility.test.ts",
              "test/typed-routes.test.ts",
            ],
            provide: { mswVersion: version, mswMajor: major, mswEntry: entry },
          },
        };
      }),
    ],
  },
});
