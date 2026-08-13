import type { Meta, StoryObj } from "@storybook/svelte";
import ApplyColorSchemeDemo from "./ApplyColorSchemeDemo.svelte";

/**
 * The apply-color-scheme helpers are the JS glue for theme switching.
 *
 * The CSS theme already includes a `@media (prefers-color-scheme: dark)`
 * block that auto-applies dark tokens at `:where(:root)` — no JS needed
 * for the default case. JS is only required when:
 *   1. The user wants to override OS preference per-session.
 *   2. The app wants to remember the user's preference across visits.
 *
 * Three recommended call sites:
 *
 * 1. Plain HTML (no framework), in `<head>` before the theme CSS:
 *    ```html
 *    <script type="module">
 *      import { autoApplyColorScheme } from "@olamaelcu/livtet-branding/apply-color-scheme";
 *      autoApplyColorScheme();
 *    </script>
 *    ```
 *
 * 2. Svelte app entry — root layout's `onMount`:
 *    ```svelte
 *    <script>
 *      import { onMount } from "svelte";
 *      import { autoApplyColorScheme } from "@olamaelcu/livtet-branding";
 *      onMount(autoApplyColorScheme);
 *    </script>
 *    ```
 *
 * 3. With `<ThemeToggle>` — the toggle's `onMount` already calls
 *    `autoApplyColorScheme()`, so consumers only need the toggle.
 *
 * One-time migration: this module reads `localStorage.wa-color-scheme`.
 * Earlier versions stored under `theme`; that value is now ignored.
 * Users fall back to system preference once after upgrade; subsequent
 * toggles write the canonical key.
 */
const meta = {
  title: "Utilities/ApplyColorScheme",
  component: ApplyColorSchemeDemo,
  tags: ["autodocs"],
} satisfies Meta<ApplyColorSchemeDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
