import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    runes: true,
  },
  vitePlugin: {
    dynamicCompileOptions({ filename }) {
      if (filename.includes("/node_modules/@storybook/")) {
        return { runes: false };
      }
    },
  },
};
