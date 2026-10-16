import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "runtime-guards": "src/runtime-guards.ts",
  },
  exports: true,
  format: ["esm"],
  target: "node24",
  clean: true,
  dts: true,
  treeshake: true,
  publint: true,
});
