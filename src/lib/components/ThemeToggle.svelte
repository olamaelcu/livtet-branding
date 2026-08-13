<script lang="ts">
  import { onMount } from "svelte";
  import {
    applyColorScheme,
    autoApplyColorScheme,
    getStoredScheme,
    toggleStoredScheme,
  } from "../apply-color-scheme.js";

  let isDark = $state(false);

  onMount(() => {
    autoApplyColorScheme();
    isDark = getStoredScheme() ?? false;
  });

  function toggle() {
    isDark = toggleStoredScheme();
    applyColorScheme(isDark);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<wa-button
  variant="neutral"
  size="s"
  onclick={toggle}
  onkeydown={(e: KeyboardEvent) => e.key === "Enter" && toggle()}
  aria-label="Toggle theme"
>
  <wa-icon library="lucide" name={isDark ? "sun" : "moon"}></wa-icon>
</wa-button>
