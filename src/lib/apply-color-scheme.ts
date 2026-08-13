/**
 * Color-scheme helpers for the Livtet theme.
 *
 * Web Awesome exposes `.wa-dark` / `.wa-light` / `.wa-invert` classes that
 * switch the theme. Per the [WA docs](https://webawesome.com/docs/customizing#light-and-dark-mode),
 * WA does NOT auto-detect `prefers-color-scheme` — that glue is the
 * consumer's responsibility. This module provides it.
 *
 * The CSS already includes a `@media (prefers-color-scheme: dark)` block
 * that applies dark tokens at `:where(:root)` automatically, so *no JS
 * is required* for the default case. JavaScript is only needed when:
 *   1. The user wants to override OS preference per-session (.wa-dark on `<html>`).
 *   2. The app wants to remember the user's preference across visits.
 *
 * The layout matches the WA-recommended snippet from the docs.
 */

export const STORAGE_KEY = "wa-color-scheme";

/** Pure DOM write: toggle `.wa-dark` on the root element. */
export function applyColorScheme(dark: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("wa-dark", dark);
}

/** Read the user's explicit preference from localStorage. */
export function getStoredScheme(): boolean | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "dark") return true;
    if (v === "light") return false;
  } catch {
    /* localStorage may be unavailable (private mode, quota, etc.) */
  }
  return null;
}

/** Read the OS-level preference via matchMedia. */
export function getSystemScheme(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Persist the user's explicit preference. */
export function setStoredScheme(dark: boolean): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
  } catch {
    /* swallow */
  }
}

/** Flip the stored preference and return the new value. */
export function toggleStoredScheme(): boolean {
  const next = !getStoredScheme();
  setStoredScheme(next);
  return next;
}

/**
 * Side-effecting: apply the user's preferred scheme on load and subscribe
 * to OS preference changes. Idempotent — safe to call multiple times
 * (e.g. from both the app entry and `<ThemeToggle>`); the matchMedia
 * listener is only attached once.
 */
let initialized = false;

export function autoApplyColorScheme(): void {
  if (typeof window === "undefined") return;
  if (initialized) return;
  initialized = true;

  applyColorScheme(getStoredScheme() ?? getSystemScheme());

  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  if (!mql) return;
  mql.addEventListener("change", (event) => {
    // Only follow OS preference while the user has no explicit override.
    if (getStoredScheme() === null) {
      applyColorScheme(event.matches);
    }
  });
}
