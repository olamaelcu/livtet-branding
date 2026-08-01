declare module "*.svelte" {
  import type { SvelteComponent } from "svelte";
  const component: typeof SvelteComponent;
  export default component;
}

declare module "*.svg" {
  const content: string;
  export default content;
}
