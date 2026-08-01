import {
  loadTokens,
  writeIfChanged,
  generateBrandTokensCSS,
  generateSemanticColorsCSS,
  generateAndroidKotlin,
  generateAndroidXml,
  generateFontFamilyXml,
  generateIOSSwiftColorExt,
  generateIOSSwiftFontExt,
  generateColorsetContentsJson,
  downloadFontsToDirs,
  oklchStringToHex,
  brandForegroundHex,
} from "./scripts/lib.ts";
import { resolve, dirname } from "node:path";
import { mkdirSync } from "node:fs";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname));

function parsePlatform(): "all" | "web" | "android" | "ios" {
  const idx = process.argv.indexOf("--platform");
  if (idx === -1) return "all";
  const v = process.argv[idx + 1];
  if (!v || !["all", "web", "android", "ios"].includes(v)) {
    console.error("Usage: tsx generate.ts [--platform all|web|android|ios]");
    process.exit(1);
  }
  return v as "all" | "web" | "android" | "ios";
}

async function main() {
  const platform = parsePlatform();
  const t = loadTokens(ROOT);
  const isWeb = platform === "all" || platform === "web";
  const isAndroid = platform === "all" || platform === "android";
  const isIOS = platform === "all" || platform === "ios";
  console.log(`generate: platform=${platform} (web=${isWeb} android=${isAndroid} ios=${isIOS})`);

  function emit(absPath: string, content: string | Buffer) {
    const changed = writeIfChanged(absPath, content);
    if (changed) console.log(`  wrote ${absPath}`);
  }

  // ---- WEB ----

  if (isWeb) {
    const webTokensDir = resolve(ROOT, "src/lib/tokens");
    mkdirSync(webTokensDir, { recursive: true });

    emit(resolve(webTokensDir, "_brand-tokens.css"), generateBrandTokensCSS(t));
    emit(resolve(webTokensDir, "_semantic-tokens.css"), generateSemanticColorsCSS(t));
  }

  // ---- ANDROID ----

  if (isAndroid) {
    const androidRes = resolve(ROOT, "android/library/src/main/res");
    const androidKotlin = resolve(ROOT, "android/library/src/main/kotlin/net/olamaelcu/livtet/branding");

    mkdirSync(androidRes, { recursive: true });
    mkdirSync(androidKotlin, { recursive: true });

    emit(resolve(androidKotlin, "Brand.kt"), generateAndroidKotlin(t));
    emit(resolve(androidRes, "values/colors.xml"), generateAndroidXml(t));

    for (const [key, font] of Object.entries(t.font) as [string, any][]) {
      const androidName = font.fontsource.replace(/-/g, "_");
      emit(
        resolve(androidRes, `font/${key}.xml`),
        generateFontFamilyXml(androidName),
      );
    }
  }

  // ---- iOS ----

  if (isIOS) {
    const iosRoot = resolve(ROOT, "ios/Sources/LivtetBranding");
    const iosAssets = resolve(iosRoot, "Resources/Assets.xcassets");

    mkdirSync(iosRoot, { recursive: true });
    mkdirSync(iosAssets, { recursive: true });

    emit(resolve(iosRoot, "BrandColor+Extension.swift"), generateIOSSwiftColorExt(t));
    emit(resolve(iosRoot, "BrandFont+Extension.swift"), generateIOSSwiftFontExt(t));

    const __hex = (s: string): string => oklchStringToHex(s);

    function writeColorset(name: string, lightHex: string, darkHex: string) {
      const dir = resolve(iosAssets, `${name}.colorset`);
      mkdirSync(dir, { recursive: true });
      emit(
        resolve(dir, "Contents.json"),
        JSON.stringify(generateColorsetContentsJson(name, lightHex, darkHex), null, 2),
      );
    }

    writeColorset("brand", brandForegroundHex("light", t), brandForegroundHex("dark", t));
    writeColorset("surfaceDefault", __hex(t.color.surface.light.default), __hex(t.color.surface.dark.default));
    writeColorset("surfaceRaised", __hex(t.color.surface.light.raised), __hex(t.color.surface.dark.raised));
    writeColorset("surfaceLowered", __hex(t.color.surface.light.lowered), __hex(t.color.surface.dark.lowered));
    writeColorset("surfaceHighlighted", __hex(t.color.surface.light.highlighted), __hex(t.color.surface.dark.highlighted));
    writeColorset("surfaceBorder", __hex(t.color.surface.light.border), __hex(t.color.surface.dark.border));
    writeColorset("textNormal", __hex(t.color.text.light.normal), __hex(t.color.text.dark.normal));
    writeColorset("textQuiet", __hex(t.color.text.light.quiet), __hex(t.color.text.dark.quiet));
    writeColorset("textLink", __hex(t.color.text.light.link), __hex(t.color.text.dark.link));

    const semantic = ["informational", "success", "warning", "danger"] as const;
    for (const color of semantic) {
      const c = (t.color.semantic as any)[color];
      const cap = color.charAt(0).toUpperCase() + color.slice(1);
      writeColorset(`semantic${cap}Foreground`, __hex(c.light.foreground), __hex(c.dark.foreground));
      writeColorset(`semantic${cap}Background`, __hex(c.light.background), __hex(c.dark.background));
      writeColorset(`semantic${cap}Border`, __hex(c.light.border), __hex(c.dark.border));
    }
  }

  // ---- FONTS (Android + iOS) ----

  if (isAndroid || isIOS) {
    const nodeModulesRoot = resolve(ROOT, "node_modules");
    const fontTargets: Record<string, string[]> = {};

    if (isAndroid) {
      const d = resolve(ROOT, "android/library/src/main/res/font");
      fontTargets.body = [...(fontTargets.body ?? []), d];
      fontTargets.heading = [...(fontTargets.heading ?? []), d];
      fontTargets.code = [...(fontTargets.code ?? []), d];
    }
    if (isIOS) {
      const d = resolve(ROOT, "ios/Sources/LivtetBranding/Resources/Fonts");
      fontTargets.body = [...(fontTargets.body ?? []), d];
      fontTargets.heading = [...(fontTargets.heading ?? []), d];
      fontTargets.code = [...(fontTargets.code ?? []), d];
    }

    console.log("  downloading fonts…");
    await downloadFontsToDirs(t, fontTargets, nodeModulesRoot);
  }

  console.log("done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
