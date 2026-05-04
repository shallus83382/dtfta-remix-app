/**
 * Brand colors: Get Started scheme — orange + black only (solid CTAs, no gradients on buttons).
 * Orange matches `.gs-btn-primary` / `--gs-orange` in `app/styles/get-started.css`.
 */
export const brandOrange = "#ff6a00";
export const brandOrangeHover = "#e65f00";

export const brandColors = {
  canvas: "#f6f5fb",
  canvasDeep: "#ebe8f4",
  surfaceSolid: "#ffffff",
  surfaceBorder: "rgba(26, 26, 34, 0.09)",
  text: "#16161f",
  textMuted: "#5a5a6e",
  textSubtle: "#4b4b5e",
  textSoft: "#6b6b7e",
  linkOnLight: brandOrange,
} as const;

/** Primary CTA — solid orange (same as Get Started primary button). */
export const brandPrimaryButtonBg = brandOrange;
export const brandPrimaryButtonHover = brandOrangeHover;
export const brandPrimaryCtaShadow = "0 6px 20px rgba(255, 106, 0, 0.35)";

/**
 * Legacy name: was a gradient; now a solid for `background:` on buttons.
 * Prefer `brandPrimaryButtonBg` in new code.
 */
export const brandPrimaryGradient = brandPrimaryButtonBg;

/** Hero strip behind titles (solid orange). */
export const brandHeroGradient = brandPrimaryButtonBg;

/** Selected control fill (solid orange). */
export const brandAccentSelectionGradient = brandPrimaryButtonBg;

/** Dark/inverted surfaces — near-black. */
export const brandCardDarkGradient = brandColors.text;

export const brandTextOnLightShadow = "0 1px 10px rgba(22, 22, 31, 0.28)";

/**
 * Shared chrome for controls sitting on the solid orange hero: white surface, black type,
 * orange ring — readable and consistent (no dark pills, no orange-on-orange CTAs).
 */
const brandHeroOnOrangeChrome = {
  background: brandColors.surfaceSolid,
  color: brandColors.text,
  border: `2px solid ${brandOrange}`,
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
} as const;

/**
 * Stat / info chips on the orange hero. Prefer `<span role="status">` so Polaris
 * doesn’t override button colors.
 */
export const brandHeroStatChipStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box" as const,
  borderRadius: 10,
  height: 36,
  padding: "0 14px",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "inherit",
  ...brandHeroOnOrangeChrome,
  transition: "filter 0.15s ease, transform 0.15s ease",
} as const;

/** Compact pill on orange hero (status labels). */
export const brandHeroBadgePillStyle = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "5px 12px",
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1.25,
  fontFamily: "inherit",
  ...brandHeroOnOrangeChrome,
} as const;

/**
 * Primary actions on the orange hero (View Products, View Orders, etc.).
 * Use with class `dtfta-hero-cta` where `<button>` needs `!important` vs Polaris.
 */
export const brandHeroBannerCtaStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box" as const,
  borderRadius: 10,
  height: 38,
  padding: "0 16px",
  fontSize: 14,
  fontWeight: 700,
  fontFamily: "inherit",
  cursor: "pointer",
  ...brandHeroOnOrangeChrome,
  boxShadow: "0 6px 18px rgba(0, 0, 0, 0.14)",
  transition: "filter 0.15s ease, transform 0.15s ease",
} as const;

/** Tinted panel behind stats (orange + black theme). */
export const brandAccentTint = "rgba(255, 106, 0, 0.12)";

/**
 * All entries map to orange so existing multi-hue call sites collapse to one accent.
 */
export const brandPalette = {
  blue: brandOrange,
  green: brandOrange,
  pink: brandOrange,
  orange: brandOrange,
  teal: brandOrange,
  coral: brandOrange,
  violet: brandOrange,
  magenta: brandOrange,
  sky: brandOrange,
} as const;
