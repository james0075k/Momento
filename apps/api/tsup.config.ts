import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  outDir: "dist",
  clean: true,
  // packages/shared is TypeScript source, so bundle it instead of importing it at runtime.
  noExternal: ["@momento/shared"],
});
