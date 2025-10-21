// @ts-check
import { luxass } from "@luxass/eslint-config";

export default luxass({
  formatters: true,
}).append({
  files: [
    "./src/runtime-guards.ts",
  ],
  rules: {
    "no-restricted-imports": ["error", {
      paths: [{
        name: "msw",
        allowTypeImports: true,
        message: "Inside runtime-guards.ts, import only types from 'msw' to avoid loading in msw core code.",
      }],
    }],
  },
});
