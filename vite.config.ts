import { resolve } from "path";
import { defineConfig } from "vite";
import { terser } from "rollup-plugin-terser";

export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "./src/index.ts"),
      name: "index",
      fileName: "index",
    },
  },
});
