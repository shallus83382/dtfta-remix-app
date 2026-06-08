/**
 * Client-safe mapping from productKey to design asset URLs (-front/-back).
 * Base URL is injected at build/dev time via Vite `define` (see `vite.config.ts`, env `AWS_COULD_FRONT_URL`).
 *
 * Color-specific mockup images come from CRM `color_mockups` only.
 * Generic product front/back placeholders use `PRODUCT_KEY_TO_DESIGN_ASSET.default`.
 */
const APP_ASSET_BASE = __DTFTA_ASSET_BASE__;

export const PRODUCT_KEY_TO_DESIGN_ASSET_BASE: Record<string, string> = {
  "nl-6210": "unisex-tee",
  "nl-3601": "long-sleeve-tee",
  "gd-18500": "heavy-blend-hoodie",
  "ch-m2650ch": "heavyweight-hoodie",
};

/** Generic product silhouettes (not per-color). Used when CRM has no color mockup for a placement. */
export const PRODUCT_KEY_TO_DESIGN_ASSET: Record<string, Record<string, string>> = {
  default: {
    unisex_tee: "assets/customizer/product/unisex-tee.png",
    long_sleeve_tee: "assets/customizer/product/long-sleeve-tee.png",
    heavyweight_hoodie: "assets/customizer/product/heavyweight-hoodie.png",
    heavy_blend_hoodie: "assets/customizer/product/heavy-blend-hoodie.png",

    unisex_tee_front: "assets/customizer/front/unisex-tee-front.png",
    long_sleeve_tee_front: "assets/customizer/front/long-sleeve-tee-front.png",
    heavyweight_hoodie_front: "assets/customizer/front/heavyweight-hoodie-front.png",
    heavy_blend_hoodie_front: "assets/customizer/front/heavy-blend-hoodie-front.png",

    unisex_tee_back: "assets/customizer/back/unisex-tee-back.png",
    long_sleeve_tee_back: "assets/customizer/back/long-sleeve-tee-back.png",
    heavyweight_hoodie_back: "assets/customizer/back/heavyweight-hoodie-back.png",
    heavy_blend_hoodie_back: "assets/customizer/back/heavy-blend-hoodie-back.png",

    long_sleeve_tee_left_sleeve: "assets/customizer/left-sleeve/long-sleeve-tee-left-sleeves.png",
    heavyweight_hoodie_left_sleeve: "assets/customizer/left-sleeve/heavyweight-hoodie-left-sleeves.png",
    heavy_blend_hoodie_left_sleeve: "assets/customizer/left-sleeve/heavy-blend-hoodie-left-sleeves.png",

    long_sleeve_tee_right_sleeve: "assets/customizer/right-sleeve/long-sleeve-tee-right-sleeves.png",
    heavyweight_hoodie_right_sleeve: "assets/customizer/right-sleeve/heavyweight-hoodie-right-sleeves.png",
    heavy_blend_hoodie_right_sleeve: "assets/customizer/right-sleeve/heavy-blend-hoodie-right-sleeves.png",
  },
};

export type DesignPlacement = "front" | "back" | "left_sleeve" | "right_sleeve";

export type ColorMockupEntry = {
  name?: string;
  hex?: string;
  front?: string;
  back?: string;
  left_sleeve?: string;
  right_sleeve?: string;
};

export type ProductColorMockups = Record<string, ColorMockupEntry>;

export type ProductDesignAssetOptions = {
  colorMockups?: ProductColorMockups | null;
};

/** Optional aliases so variant color codes match CRM `color_mockups` keys. */
const COLOR_MOCKUP_LOOKUP_ALIASES: Record<string, string> = {
  rd: "red",
  blk: "black",
  wht: "white",
  brn: "brown",
  grn: "green",
  blu: "blue",
  org: "orange",
  nav: "navy",
  char: "charcoal",
  hgr: "heather_gray",
};

function slugifyColorKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function colorMockupLookupKeys(color: string): string[] {
  const trimmed = color.trim();
  const lower = trimmed.toLowerCase();
  const slug = slugifyColorKey(trimmed);
  const keys: string[] = [];

  if (trimmed) keys.push(trimmed);
  if (lower && lower !== trimmed) keys.push(lower);
  if (slug && !keys.includes(slug)) keys.push(slug);

  const alias = COLOR_MOCKUP_LOOKUP_ALIASES[lower];
  if (alias && !keys.includes(alias)) {
    keys.push(alias);
  }

  return keys;
}

/**
 * Resolve which key exists in CRM `color_mockups` for a variant color code.
 */
export function resolveColorMockupMapKey(
  colorCode: string,
  colorMockups?: ProductColorMockups | null
): string | null {
  if (!colorMockups || !colorCode.trim()) {
    return null;
  }

  for (const key of colorMockupLookupKeys(colorCode)) {
    if (colorMockups[key] !== undefined) {
      return key;
    }
  }

  const targetSlug = slugifyColorKey(colorCode);
  if (targetSlug) {
    for (const [key, entry] of Object.entries(colorMockups)) {
      if (slugifyColorKey(key) === targetSlug) {
        return key;
      }
      if (entry.name && slugifyColorKey(entry.name) === targetSlug) {
        return key;
      }
    }
  }

  return null;
}

/**
 * @deprecated Prefer `resolveColorMockupMapKey` for CRM lookups. Returns a normalized key for aliases only.
 */
export function mapColorToAssetCategory(color?: string): string {
  const lower = color?.trim().toLowerCase() ?? "";
  if (!lower) return "";
  return COLOR_MOCKUP_LOOKUP_ALIASES[lower] ?? lower;
}

function placementFromAssetKey(assetKey: string): DesignPlacement | null {
  const key = assetKey.trim().toLowerCase();
  if (key.endsWith("_front") || key === "front") {
    return "front";
  }
  if (key.endsWith("_back") || key === "back") {
    return "back";
  }
  if (key.includes("left_sleeve") || key.includes("left-sleeve")) {
    return "left_sleeve";
  }
  if (key.includes("right_sleeve") || key.includes("right-sleeve")) {
    return "right_sleeve";
  }
  return null;
}

function placementFromPrintAreaTitle(title: string): DesignPlacement | null {
  const normalized = title.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (/right[\s_-]*sleeve/.test(normalized)) {
    return "right_sleeve";
  }
  if (/left[\s_-]*sleeve/.test(normalized)) {
    return "left_sleeve";
  }
  if (normalized === "front" || /\bfront\b/.test(normalized)) {
    return "front";
  }
  if (normalized === "back" || /\bback\b/.test(normalized)) {
    return "back";
  }

  return null;
}

export type PrintAreaImageSource = {
  title: string;
  image?: string | null;
};

export function resolveDesignPlacementFromPrintArea(
  printArea: PrintAreaImageSource
): DesignPlacement | null {
  return (
    placementFromPrintAreaTitle(printArea.title) ??
    (printArea.image ? placementFromAssetKey(printArea.image) : null)
  );
}

function colorMockupPathForPlacement(
  entry: ColorMockupEntry,
  placement: DesignPlacement
): string | undefined {
  return entry[placement];
}

function resolveColorMockupEntry(
  color: string | undefined,
  placement: DesignPlacement,
  colorMockups?: ProductColorMockups | null
): ColorMockupEntry | null {
  if (!colorMockups || !color?.trim()) {
    return null;
  }

  const mapKey = resolveColorMockupMapKey(color, colorMockups);
  if (!mapKey) {
    return null;
  }

  const entry = colorMockups[mapKey];
  const path = entry ? colorMockupPathForPlacement(entry, placement) : undefined;

  return path?.trim() ? entry : null;
}

function colorMockupAssetUrl(path: string): string {
  const normalized = path.trim().replace(/^\/+/, "");
  return normalized ? `${APP_ASSET_BASE}/${normalized}` : "";
}

function defaultDesignAssetUrl(assetKey: string): string {
  const path = PRODUCT_KEY_TO_DESIGN_ASSET.default?.[assetKey];
  return path ? `${APP_ASSET_BASE}/${path}` : "";
}

function resolveColorMockupAssetUrl(
  placement: DesignPlacement,
  color: string | undefined,
  options?: ProductDesignAssetOptions
): string {
  const mockupEntry = resolveColorMockupEntry(color, placement, options?.colorMockups);
  const mockupPath = mockupEntry
    ? colorMockupPathForPlacement(mockupEntry, placement)
    : undefined;

  if (mockupPath?.trim()) {
    return colorMockupAssetUrl(mockupPath.trim().replace(/^\/+/, ""));
  }

  return "";
}

/**
 * Resolve mockup/background URL: CRM color mockup first, then generic default product asset.
 */
export function getProductDesignAssetUrl(
  assetKey: string,
  color?: string,
  options?: ProductDesignAssetOptions
): string {
  const placement = placementFromAssetKey(assetKey);
  if (placement) {
    const mockupUrl = resolveColorMockupAssetUrl(placement, color, options);
    if (mockupUrl) {
      return mockupUrl;
    }
  }

  return defaultDesignAssetUrl(assetKey);
}

/**
 * Resolve a print-area canvas background from CRM color mockups (by placement title)
 * with optional fallback to the print-area catalog asset key.
 */
export function getPrintAreaBackgroundImageUrl(
  printArea: PrintAreaImageSource,
  color?: string,
  options?: ProductDesignAssetOptions
): string {
  const placement = resolveDesignPlacementFromPrintArea(printArea);
  if (placement) {
    const mockupUrl = resolveColorMockupAssetUrl(placement, color, options);
    if (mockupUrl) {
      return mockupUrl;
    }
  }

  if (printArea.image?.trim()) {
    return getProductDesignAssetUrl(printArea.image, color, options);
  }

  return "";
}

const FABRIC_IMAGE_PROXY_PATH = "/app/api/artworks-image";

/**
 * Fabric / canvas APIs load images with `crossOrigin: "anonymous"`, which requires
 * ACAO from the image host. Our design CDN may not send CORS headers, so we load
 * catalog assets through the same-origin app proxy instead.
 *
 * Only URLs under the configured asset base are rewritten (not an open proxy).
 */
export function toProxiedFabricImageUrl(remoteUrl: string): string {
  const trimmed = remoteUrl.trim();
  if (!trimmed) return trimmed;
  const base = __DTFTA_ASSET_BASE__.replace(/\/+$/, "");
  if (trimmed.startsWith(`${base}/`) || trimmed === base) {
    return `${FABRIC_IMAGE_PROXY_PATH}?url=${encodeURIComponent(trimmed)}`;
  }
  return trimmed;
}

/** Catalog print-area background URL safe for Fabric (`fromURL` + export). */
export function getProductDesignAssetUrlForFabric(
  assetKey: string,
  color?: string,
  options?: ProductDesignAssetOptions
): string {
  const remote = getProductDesignAssetUrl(assetKey, color, options);
  return remote ? toProxiedFabricImageUrl(remote) : "";
}

/** Print-area background URL safe for Fabric (`fromURL` + export). */
export function getPrintAreaBackgroundImageUrlForFabric(
  printArea: PrintAreaImageSource,
  color?: string,
  options?: ProductDesignAssetOptions
): string {
  const remote = getPrintAreaBackgroundImageUrl(printArea, color, options);
  return remote ? toProxiedFabricImageUrl(remote) : "";
}

/**
 * Resolve product image by productKey + placement + optional color.
 * Useful when you do not already have selectedPrintArea.image.
 */
export function getDesignAssetUrl(
  productKey: string,
  placement: DesignPlacement,
  color?: string,
  options?: ProductDesignAssetOptions
): string {
  const base = PRODUCT_KEY_TO_DESIGN_ASSET_BASE[productKey] ?? "unisex_tee";
  const assetKey = `${base}_${placement}`;

  return getProductDesignAssetUrl(assetKey, color, options);
}
