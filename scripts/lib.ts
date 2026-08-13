import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { converter, formatHex } from "culori";
import { Resvg } from "@resvg/resvg-js";

export interface Tokens {
  color: any;
  font: any;
  icon: any;
}

// ---- Utilities ----

const __dirname = dirname(new URL(import.meta.url).pathname);
const toSrgb = converter("rgb");

export function loadTokens(repoRoot: string): Tokens {
  return JSON.parse(readFileSync(resolve(repoRoot, "tokens.json"), "utf8"));
}

export function writeIfChanged(absPath: string, content: string | Buffer): boolean {
  mkdirSync(dirname(absPath), { recursive: true });
  if (existsSync(absPath)) {
    const existing = readFileSync(absPath);
    const next = typeof content === "string" ? Buffer.from(content, "utf8") : content;
    if (existing.equals(next)) return false;
  }
  writeFileSync(absPath, content);
  return true;
}

// ---- Color conversion ----

export function oklchStringToHex(s: string): string {
  const m = s.match(/oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/);
  if (!m) throw new Error(`Cannot parse OKLCH string: ${s}`);
  const [, L, C, H] = m;
  const c = toSrgb({
    mode: "oklch",
    l: parseFloat(L) / 100,
    c: parseFloat(C),
    h: parseFloat(H),
  });
  if (!c) throw new Error(`Out of gamut for ${s}`);
  return formatHex(c).toUpperCase();
}

export function brandHex(t: Tokens): string {
  const { lightness, chroma, hue } = t.color.brand.oklch;
  return formatHex(
    toSrgb({ mode: "oklch", l: lightness, c: chroma, h: hue })!,
  ).toUpperCase();
}

// ---- Per-flavor brand colors ----
//
// Each consumer project that builds per-store variants (Android flavors,
// Xcode targets, …) supplies its own flavor name(s) via
// `ANDROID_STORE_FLAVORS` (or analogous constants). The token under
// `color.brand.flavor.<name>` is REQUIRED: the generator fails loudly
// if a consumer adds a new flavor but doesn't add the matching OKLCH
// entry, so we never ship a default-tinted icon for a forgotten store.

export const ANDROID_STORE_FLAVORS = ["playstore", "fdroid", "generic"] as const;
export type AndroidStoreFlavor = (typeof ANDROID_STORE_FLAVORS)[number];

export function flavorHex(name: string, t: Tokens): string {
  const flavor = t.color?.brand?.flavor?.[name];
  if (!flavor?.oklch) {
    throw new Error(
      `Missing tokens.json entry for color.brand.flavor.${name}. ` +
        `Add an OKLCH entry under color.brand.flavor for "${name}" — ` +
        `see color.brand.oklch for the schema (lightness, chroma, hue). ` +
        `Required because every consumer-flavor needs an explicit tint; ` +
        `falling back to the default brand would silently ship the wrong icon.`,
    );
  }
  const { lightness, chroma, hue } = flavor.oklch;
  const c = toSrgb({ mode: "oklch", l: lightness, c: chroma, h: hue });
  if (!c) {
    throw new Error(
      `Out-of-gamut OKLCH for color.brand.flavor.${name}: ` +
        `oklch(${lightness} ${chroma} ${hue})`,
    );
  }
  return formatHex(c).toUpperCase();
}

export function brandForegroundHex(light: "light" | "dark", t: Tokens): string {
  return oklchStringToHex(t.color.brand[light].foreground);
}

function hexToRgbNormalized(hex: string): { red: number; green: number; blue: number } {
  const h = hex.replace("#", "");
  return {
    red: parseInt(h.slice(0, 2), 16) / 255,
    green: parseInt(h.slice(2, 4), 16) / 255,
    blue: parseInt(h.slice(4, 6), 16) / 255,
  };
}

function oklchStringToColorKt(s: string): string {
  return `Color(0xFF${oklchStringToHex(s).replace("#", "")})`;
}

function pct(n: number): string {
  return `${Number((n * 100).toFixed(4))}%`;
}

// ---- CSS (web) ----

export function generateBrandTokensCSS(t: Tokens): string {
  const fb = (f: any) =>
    `${f.family}, ${f.fallbacks.map((s: string) => s).join(", ")}`;
  const surface = (m: any) =>
    Object.entries(m)
      .map(([k, v]) => `    --wa-color-surface-${k}: ${v};`)
      .join("\n");
  const text = (m: any) =>
    Object.entries(m)
      .map(([k, v]) => `    --wa-color-text-${k}: ${v};`)
      .join("\n");

  const brandLine = `${pct(t.color.brand.oklch.lightness)} ${t.color.brand.oklch.chroma} ${t.color.brand.oklch.hue}`;
  const brandHue = t.color.brand.oklch.hue;
  const neutralHue = t.color.neutral.oklch.hue;

  /* Selector groups mirror the theme's light/dark scoping in
   * themes/livtet.css (which itself mirrors Web Awesome's default.css),
   * so surface/text overrides apply to exactly the elements the theme colors. */
  const lightSelectors = `:where(:root),
  .wa-theme-livtet,
  .wa-palette-livtet,
  .wa-light,
  .wa-dark .wa-invert,
  .wa-light .wa-theme-livtet,
  .wa-dark .wa-theme-livtet.wa-invert,
  .wa-dark .wa-theme-livtet .wa-invert,
  .wa-light .wa-palette-livtet,
  .wa-dark .wa-palette-livtet.wa-invert,
  .wa-dark .wa-palette-livtet .wa-invert`;
  const darkSelectors = `.wa-dark,
  .wa-invert,
  .wa-dark .wa-theme-livtet,
  .wa-light .wa-theme-livtet.wa-invert,
  .wa-light .wa-theme-livtet .wa-invert,
  .wa-dark .wa-palette-livtet,
  .wa-light .wa-palette-livtet.wa-invert,
  .wa-light .wa-palette-livtet .wa-invert`;

  return `/* GENERATED by livtet-branding — do not edit by hand. */

@layer wa-theme-overrides {
  ${lightSelectors} {
${surface(t.color.surface.light)}

${text(t.color.text.light)}
  }

  ${darkSelectors} {
${surface(t.color.surface.dark)}

${text(t.color.text.dark)}
  }

  /* Auto-detect dark mode via OS preference. Scoped to :where(:root) so
     explicit class overrides (.wa-light, .wa-dark, .wa-invert, .wa-theme-*)
     still win by specificity. Source order matters: this block must come
     after the light block above so the :where(:root) tie at the same
     specificity resolves to dark. */
  @media (prefers-color-scheme: dark) {
    :where(:root) {
${surface(t.color.surface.dark)}

${text(t.color.text.dark)}
    }
  }

  :where(:root),
  .wa-theme-livtet,
  .wa-palette-livtet {
    --wa-color-brand-95: oklch(93% 0.04 ${brandHue});
    --wa-color-brand-90: oklch(85% 0.08 ${brandHue});
    --wa-color-brand-80: oklch(72% 0.11 ${brandHue});
    --wa-color-brand-70: oklch(60% 0.12 ${brandHue});
    --wa-color-brand-60: oklch(50% 0.12 ${brandHue});
    --wa-color-brand-50: oklch(${brandLine});
    --wa-color-brand-40: oklch(35% 0.08 ${brandHue});
    --wa-color-brand-30: oklch(28% 0.06 ${brandHue});
    --wa-color-brand-20: oklch(20% 0.05 ${brandHue});
    --wa-color-brand-10: oklch(12% 0.03 ${brandHue});
    --wa-color-brand-05: oklch(8% 0.02 ${brandHue});
    --wa-color-brand: var(--wa-color-brand-50);
    --wa-color-brand-on: oklch(100% 0 0);

    --wa-color-neutral-95: oklch(95% 0.006 ${neutralHue});
    --wa-color-neutral-90: oklch(90% 0.009 ${neutralHue});
    --wa-color-neutral-80: oklch(80% 0.012 ${neutralHue});
    --wa-color-neutral-70: oklch(70% 0.015 ${neutralHue});
    --wa-color-neutral-60: oklch(60% 0.018 ${neutralHue});
    --wa-color-neutral-50: oklch(${pct(t.color.neutral.oklch.lightness)} ${t.color.neutral.oklch.chroma} ${neutralHue});
    --wa-color-neutral-40: oklch(40% 0.018 ${neutralHue});
    --wa-color-neutral-30: oklch(30% 0.015 ${neutralHue});
    --wa-color-neutral-20: oklch(20% 0.012 ${neutralHue});
    --wa-color-neutral-10: oklch(12% 0.009 ${neutralHue});
    --wa-color-neutral-05: oklch(8% 0.006 ${neutralHue});
    --wa-color-neutral: var(--wa-color-neutral-50);
    --wa-color-neutral-on: oklch(100% 0 0);
  }

  :where(:root),
  .wa-theme-livtet,
  .wa-palette-livtet {
    --wa-font-family-body: ${fb(t.font.body)};
    --wa-font-family-heading: ${fb(t.font.heading)};
    --wa-font-family-code: ${fb(t.font.code)};
  }
}
`;
}

function variantRampCss(t: Tokens, variant: string): string {
  const c = (t.color.semantic as any)[variant];
  const baseHue = c.oklch.hue;
  return `    --wa-color-${variant}-95: oklch(93% 0.04 ${baseHue});
    --wa-color-${variant}-90: oklch(85% 0.08 ${baseHue});
    --wa-color-${variant}-80: oklch(72% 0.11 ${baseHue});
    --wa-color-${variant}-70: oklch(60% 0.12 ${baseHue});
    --wa-color-${variant}-60: oklch(50% 0.12 ${baseHue});
    --wa-color-${variant}-50: oklch(${pct(c.oklch.lightness)} ${c.oklch.chroma} ${baseHue});
    --wa-color-${variant}-40: oklch(35% 0.08 ${baseHue});
    --wa-color-${variant}-30: oklch(28% 0.06 ${baseHue});
    --wa-color-${variant}-20: oklch(20% 0.05 ${baseHue});
    --wa-color-${variant}-10: oklch(12% 0.03 ${baseHue});
    --wa-color-${variant}-05: oklch(8% 0.02 ${baseHue});
    --wa-color-${variant}: var(--wa-color-${variant}-50);
    --wa-color-${variant}-on: oklch(100% 0 0);`;
}

export function generateSemanticColorsCSS(t: Tokens): string {
  const semanticColors = ["success", "warning", "danger"] as const;
  const blocks = semanticColors.map((color) => variantRampCss(t, color)).join("\n\n");
  return `/* GENERATED by livtet-branding — do not edit by hand. */

@layer wa-theme-overrides {
  :where(:root),
  .wa-palette-livtet {
${blocks}
  }
}
`;
}

// ---- Android ----

function surfaceBlock(t: Tokens, mode: "light" | "dark"): string {
  return Object.entries(t.color.surface[mode])
    .map(([k, v]) => {
      const name = k.charAt(0).toUpperCase() + k.slice(1);
      return `        val ${name} = ${oklchStringToColorKt(v as string)}`;
    })
    .join("\n");
}

const ANDROID_VARIANTS = ["neutral", "success", "warning", "danger"] as const;

function variantEntry(t: Tokens, variant: string): any {
  if (variant === "neutral") return t.color.neutral;
  return (t.color.semantic as any)[variant];
}

function semanticBlock(t: Tokens): string {
  const out: string[] = [];
  for (const color of ANDROID_VARIANTS) {
    const c = variantEntry(t, color);
    const name = color.charAt(0).toUpperCase() + color.slice(1);
    out.push(
      `    val ${name} = ${oklchStringToColorKt(`oklch(${pct(c.oklch.lightness)} ${c.oklch.chroma} ${c.oklch.hue})`)}`,
    );
  }
  return out.join("\n") + "\n";
}

function semanticVariantsBlock(t: Tokens): string {
  const out: string[] = [];
  for (const color of ANDROID_VARIANTS) {
    const c = variantEntry(t, color);
    const name = color.charAt(0).toUpperCase() + color.slice(1);
    out.push(`    object ${name}Light {
        val On = ${oklchStringToColorKt(c.light.foreground)}
        val Fill = ${oklchStringToColorKt(c.light.background)}
        val Border = ${oklchStringToColorKt(c.light.border)}
    }
    object ${name}Dark {
        val On = ${oklchStringToColorKt(c.dark.foreground)}
        val Fill = ${oklchStringToColorKt(c.dark.background)}
        val Border = ${oklchStringToColorKt(c.dark.border)}
    }`);
  }
  return out.join("\n\n");
}

export function generateAndroidKotlin(t: Tokens): string {
  const brandKt = oklchStringToColorKt(
    `oklch(${pct(t.color.brand.oklch.lightness)} ${t.color.brand.oklch.chroma} ${t.color.brand.oklch.hue})`,
  );

  const fontResName = (key: string) =>
    (t.font[key as keyof typeof t.font] as any).fontsource.replace(/-/g, "_");

  const schemeKt = (mode: "light" | "dark") => {
    const S = `Surface${mode === "light" ? "Light" : "Dark"}`;
    const T = `Text${mode === "light" ? "Light" : "Dark"}`;
    const isLight = mode === "light";
    const modeSuffix = mode === "light" ? "Light" : "Dark";
    return `    primary               = LivtetColors.Brand,
    onPrimary             = LivtetColors.${T}.Normal,
    primaryContainer      = LivtetColors.${S}.Default,
    onPrimaryContainer    = LivtetColors.${T}.Normal,
    secondary             = LivtetColors.Neutral,
    onSecondary           = LivtetColors.${T}.Normal,
    secondaryContainer    = LivtetColors.Semantic.Neutral${modeSuffix}.Fill,
    onSecondaryContainer  = LivtetColors.Semantic.Neutral${modeSuffix}.On,
    tertiary              = LivtetColors.Success,
    onTertiary            = LivtetColors.${T}.Normal,
    tertiaryContainer     = LivtetColors.Semantic.Success${modeSuffix}.Fill,
    onTertiaryContainer   = LivtetColors.Semantic.Success${modeSuffix}.On,
    background            = LivtetColors.${S}.Default,
    onBackground          = LivtetColors.${T}.Normal,
    surface               = LivtetColors.${S}.Default,
    onSurface             = LivtetColors.${T}.Normal,
    surfaceVariant        = LivtetColors.${S}.Raised,
    onSurfaceVariant      = LivtetColors.${T}.Quiet,
    surfaceTint           = LivtetColors.Brand,
    inverseSurface        = LivtetColors.${isLight ? "SurfaceDark" : "SurfaceLight"}.Default,
    inverseOnSurface      = LivtetColors.${isLight ? "TextDark" : "TextLight"}.Normal,
    inversePrimary        = LivtetColors.${S}.Default,
    error                 = LivtetColors.Danger,
    onError               = LivtetColors.Semantic.Danger${modeSuffix}.On,
    errorContainer        = LivtetColors.Semantic.Danger${modeSuffix}.Fill,
    onErrorContainer      = LivtetColors.Semantic.Danger${modeSuffix}.On,
    outline               = LivtetColors.${S}.Border,
    outlineVariant        = LivtetColors.${S}.Border,
    scrim                 = LivtetColors.${isLight ? "SurfaceDark" : "SurfaceLight"}.Default,`;
  };

  return `package net.olamaelcu.livtet.branding

import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight

// GENERATED by livtet-branding — do not edit by hand.

object LivtetColors {
    val Brand = ${brandKt}
${semanticBlock(t)}
    object Semantic {
${semanticVariantsBlock(t)}
    }

    object SurfaceLight {
${surfaceBlock(t, "light")}
    }
    object SurfaceDark {
${surfaceBlock(t, "dark")}
    }

    object TextLight {
        val Normal = ${oklchStringToColorKt(t.color.text.light.normal)}
        val Quiet  = ${oklchStringToColorKt(t.color.text.light.quiet)}
        val Link   = ${oklchStringToColorKt(t.color.text.light.link)}
    }
    object TextDark {
        val Normal = ${oklchStringToColorKt(t.color.text.dark.normal)}
        val Quiet  = ${oklchStringToColorKt(t.color.text.dark.quiet)}
        val Link   = ${oklchStringToColorKt(t.color.text.dark.link)}
    }
}

val BodyFamily    = FontFamily(Font(R.font.${fontResName("body")},    FontWeight.Normal))
val HeadingFamily = FontFamily(Font(R.font.${fontResName("heading")}, FontWeight.Medium))
val CodeFamily    = FontFamily(Font(R.font.${fontResName("code")},    FontWeight.Normal))

fun livtetLightColorScheme() = lightColorScheme(
${schemeKt("light")}
)

fun livtetDarkColorScheme() = darkColorScheme(
${schemeKt("dark")}
)
`;
}

export function generateAndroidXml(t: Tokens): string {
  const brand = brandHex(t);
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- GENERATED by livtet-branding — do not edit by hand. -->
<resources>
    <color name="ic_launcher_background">${brand}</color>
    <color name="brand">${brand}</color>
</resources>
`;
}

// ---- Per-flavor Android resources (launcher icon) ----
//
// For each flavor the consumer declares (e.g. playstore, fdroid, generic)
// we emit:
//   - values/colors.xml — overrides ic_launcher_background + brand
//   - mipmap-<dpi>/ic_launcher{,_round}.png — rasterized PNG fallback
//     for API 24/25 (pre-adaptive-icon devices)
//   - mipmap-anydpi-v26/ic_launcher{,_round}.xml — adaptive icon shell
//     for API 26+
//   - mipmap-anydpi-v33/ic_launcher{,_round}.xml — same shell for API 33+
//
// The foreground (the high-lightness book glyph) is shared across flavors and
// lives in drawable/ic_launcher_foreground.xml — also generated, sourced
// from branding/assets/logo.svg so the SVG is the single source of truth
// for the artwork.

const ANDROID_DENSITIES = [
  { name: "mdpi", size: 48 },
  { name: "hdpi", size: 72 },
  { name: "xhdpi", size: 96 },
  { name: "xxhdpi", size: 144 },
  { name: "xxxhdpi", size: 192 },
] as const;

const ADAPTIVE_ICON_XML_VERSIONS = ["v26", "v33"] as const;

export function generateAndroidForegroundVector(pathData: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- GENERATED by livtet-branding — do not edit by hand.
     Path data is sourced from branding/assets/logo.svg. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <group android:scaleX="0.144" android:scaleY="0.144" android:translateX="3.6" android:translateY="3.6">
        <path android:fillColor="#FFFFFF"
            android:pathData="${pathData}" />
    </group>
</vector>
`;
}

export function generateAndroidFlavorXml(name: string, t: Tokens): string {
  const bg = flavorHex(name, t);
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- GENERATED by livtet-branding — do not edit by hand. -->
<resources>
    <color name="ic_launcher_background">${bg}</color>
    <color name="brand">${bg}</color>
</resources>
`;
}

function generateAndroidFlavorSvg(hex: string, pathData: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="108" height="108" viewBox="0 0 108 108">
  <rect width="108" height="108" fill="${hex}" />
  <g transform="scale(0.144) translate(3.6 3.6)" fill="#FFFFFF">
    <path d="${pathData}"/>
  </g>
</svg>
`;
}

export function generateAndroidFlavorMipmaps(
  name: string,
  t: Tokens,
  pathData: string,
  outDir: string,
): string[] {
  const hex = flavorHex(name, t);
  const svg = generateAndroidFlavorSvg(hex, pathData);
  const written: string[] = [];
  for (const { name: density, size } of ANDROID_DENSITIES) {
    const dir = resolve(outDir, `mipmap-${density}`);
    mkdirSync(dir, { recursive: true });
    const png = new Resvg(svg, {
      fitTo: { mode: "width", value: size },
      background: hex,
    })
      .render()
      .asPng();
    // Pre-v26 (API 24/25) renders the icon as a square PNG; the system
    // applies the launcher-shape mask when roundIcon is requested, so
    // both filenames share the same raster.
    for (const variant of ["ic_launcher.png", "ic_launcher_round.png"]) {
      const path = resolve(dir, variant);
      if (writeIfChanged(path, png)) written.push(path);
    }
  }
  return written;
}

export function generateAndroidFlavorAdaptiveIcons(outDir: string): string[] {
  const shell = `<?xml version="1.0" encoding="utf-8"?>
<!-- GENERATED by livtet-branding — do not edit by hand. -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
`;
  const written: string[] = [];
  for (const v of ADAPTIVE_ICON_XML_VERSIONS) {
    const dir = resolve(outDir, `mipmap-anydpi-${v}`);
    mkdirSync(dir, { recursive: true });
    for (const variant of ["ic_launcher.xml", "ic_launcher_round.xml"]) {
      const path = resolve(dir, variant);
      if (writeIfChanged(path, shell)) written.push(path);
    }
  }
  return written;
}

export function generateFontFamilyXml(fontRefName: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- GENERATED by livtet-branding — do not edit by hand. -->
<font-family xmlns:android="http://schemas.android.com/apk/res-auto">
    <font android:font="@font/${fontRefName}" android:fontWeight="400" />
</font-family>
`;
}

// ---- iOS ----

export function generateColorsetContentsJson(
  name: string,
  lightHex: string,
  darkHex: string,
): any {
  return {
    colors: [
      {
        color: {
          "color-space": "srgb",
          components: { ...hexToRgbNormalized(lightHex), alpha: "1.000" },
        },
        idiom: "universal",
      },
      {
        color: {
          "color-space": "srgb",
          components: { ...hexToRgbNormalized(darkHex), alpha: "1.000" },
        },
        idiom: "universal",
        appearances: [{ appearance: "luminosity", value: "dark" }],
      },
    ],
    info: { version: 1, author: "xcode" },
  };
}

export function generateIOSSwiftColorExt(t: Tokens): string {
  return `// GENERATED by livtet-branding — do not edit by hand.
import SwiftUI
import UIKit

public extension Color {
    static let brand: Color = Color("brand")
}

public extension UIColor {
    static var brand: UIColor { UIColor(named: "brand")! }
}
`;
}

export function generateIOSSwiftFontExt(t: Tokens): string {
  const familyNameMap: Record<string, string> = {
    "Work Sans": "Work Sans",
    "Lora": "Lora",
    "JetBrains Mono": "JetBrains Mono",
  };
  const postScriptMap: Record<string, string> = {
    "Work Sans": "WorkSans-Regular",
    "Lora": "Lora-Regular",
    "JetBrains Mono": "JetBrainsMono-Regular",
  };
  const familyName = (f: any) => familyNameMap[f.family] ?? f.family;
  const postScriptName = (f: any) => postScriptMap[f.family] ?? `${f.family.replace(/\s+/g, "")}-Regular`;
  return `// GENERATED by livtet-branding — do not edit by hand.
import SwiftUI
import UIKit

public extension Font {
    static func livtetBody(size: CGFloat = 16, weight: Font.Weight = .regular) -> Font {
        .custom("${familyName(t.font.body)}", size: size, relativeTo: .body).weight(weight)
    }
    static func livtetHeading(size: CGFloat = 24, weight: Font.Weight = .semibold) -> Font {
        .custom("${familyName(t.font.heading)}", size: size, relativeTo: .title).weight(weight)
    }
    static func livtetCode(size: CGFloat = 14) -> Font {
        .custom("${familyName(t.font.code)}", size: size, relativeTo: .body)
    }
}

public extension UIFont {
    static func livtetBody(size: CGFloat = 16) -> UIFont {
        UIFont(name: "${postScriptName(t.font.body)}", size: size) ?? .systemFont(ofSize: size)
    }
    static func livtetCode(size: CGFloat = 14) -> UIFont {
        UIFont(name: "${postScriptName(t.font.code)}", size: size) ?? .monospacedSystemFont(ofSize: size, weight: .regular)
    }
}
`;
}

// ---- Font downloading ----

function fontsourcePackageName(id: string, scope?: string): string {
  if (scope === "fontsource-variable") {
    return `@fontsource-variable/${id}`;
  }
  return `@fontsource/${id}`;
}

export function buildFontDownloadUrl(
  fontsourceId: string,
  familyName: string,
): string {
  const dir = fontsourceId.replace(/-/g, "");
  const familyFile = familyName.replace(/\s+/g, "");
  const raw = `https://raw.githubusercontent.com/google/fonts/main/ofl/${dir}/${familyFile}[wght].ttf`;
  return encodeURI(raw);
}

async function downloadIfChanged(url: string, absPath: string): Promise<boolean> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return writeIfChanged(absPath, buf);
}

export async function downloadFontsToDirs(
  t: Tokens,
  targets: Record<string, string[]>,
  nodeModulesRoot: string,
): Promise<void> {
  for (const [key, dirs] of Object.entries(targets)) {
    const f = t.font[key as keyof typeof t.font] as any;
    const metaPath = resolve(
      nodeModulesRoot,
      `${fontsourcePackageName(f.fontsource, f.scope)}/metadata.json`,
    );
    const meta = JSON.parse(readFileSync(metaPath, "utf8"));
    const url = buildFontDownloadUrl(meta.id, meta.family);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const androidName = f.fontsource.replace(/-/g, "_");
    const filename = `${androidName}.ttf`;
    for (const dir of dirs) {
      mkdirSync(dir, { recursive: true });
      const absPath = resolve(dir, filename);
      const changed = writeIfChanged(absPath, buf);
      if (changed) console.log(`  wrote ${filename} to ${dir}`);
    }
  }
}
