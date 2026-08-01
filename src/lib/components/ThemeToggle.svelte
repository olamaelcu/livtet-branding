<script lang="ts">
  import { onMount } from "svelte";

  let isDark = $state(false);

  onMount(() => {
    const stored = prefersStored();
    isDark = stored ?? prefersSystem();
    applyTheme(isDark);
  });

  function prefersStored(): boolean | null {
    try {
      const v = localStorage.getItem("theme");
      if (v === "dark") return true;
      if (v === "light") return false;
    } catch {
      /* localStorage may be unavailable */
    }
    return null;
  }

  function prefersSystem(): boolean {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function applyTheme(dark: boolean) {
    const html = document.documentElement;
    if (dark) {
      html.classList.add("wa-dark");
      html.setAttribute("data-theme", "dark");
    } else {
      html.classList.remove("wa-dark");
      html.setAttribute("data-theme", "light");
    }
  }

  function toggle() {
    isDark = !isDark;
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {
      /* swallow */
    }
    applyTheme(isDark);
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
