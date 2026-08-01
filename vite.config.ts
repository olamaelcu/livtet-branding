import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "node:path";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    svelte(),
    dts({
      include: ["src/lib/**/*.ts", "src/lib/**/*.svelte"],
      outDir: "dist",
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/lib/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      external: [
        "svelte",
        "svelte/transition",
        "@awesome.me/webawesome",
      ],
      output: {
        preserveModules: true,
        preserveModulesRoot: "src/lib",
      },
    },
  },
});
