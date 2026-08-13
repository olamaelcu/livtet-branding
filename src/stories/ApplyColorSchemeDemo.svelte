<script lang="ts">
  import { onMount } from "svelte";
  import {
    autoApplyColorScheme,
    applyColorScheme,
    toggleStoredScheme,
  } from "../lib/apply-color-scheme.js";

  let isDark = $state(false);

  onMount(() => {
    autoApplyColorScheme();
    isDark = document.documentElement.classList.contains("wa-dark");
  });

  function toggle() {
    const next = toggleStoredScheme();
    applyColorScheme(next);
    isDark = next;
  }
</script>

<wa-button onclick={toggle} variant="neutral" size="s">
  Toggle scheme (currently {isDark ? "dark" : "light"})
</wa-button>
