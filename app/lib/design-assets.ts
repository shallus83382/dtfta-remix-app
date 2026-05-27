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
  },
};

export type DesignPlacement = "front" | "back";

export type ColorMockupEntry = {
  name?: string;
  hex?: string;
  front?: string;
  back?: string;
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

function colorMockupLookupKeys(color: string): string[] {
  const trimmed = color.trim();
  const lower = trimmed.toLowerCase();
  const keys: string[] = [];

  if (trimmed) keys.push(trimmed);
  if (lower && lower !== trimmed) keys.push(lower);

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
  if (key.endsWith("_front")) {
    return "front";
  }
  if (key.endsWith("_back")) {
    return "back";
  }
  return null;
}

function resolveColorMockupEntry(
  color: string | undefined,
  placement: DesignPlacement,
  colorMockups?: ProductColorMockups | null
): ColorMockupEntry | null {
  if (!colorMockups || !color?.trim()) {
    return null;
  }

  for (const key of colorMockupLookupKeys(color)) {
    const entry = colorMockups[key];
    if (!entry) {
      continue;
    }

    const path = placement === "front" ? entry.front : entry.back;
    if (path?.trim()) {
      return entry;
    }
  }

  return null;
}

function colorMockupAssetUrl(path: string): string {
  const normalized = path.trim().replace(/^\/+/, "");
  return normalized ? `${APP_ASSET_BASE}/${normalized}` : "";
}

function defaultDesignAssetUrl(assetKey: string): string {
  const path = PRODUCT_KEY_TO_DESIGN_ASSET.default?.[assetKey];
  return path ? `${APP_ASSET_BASE}/${path}` : "";
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
    const mockupEntry = resolveColorMockupEntry(
      color,
      placement,
      options?.colorMockups
    );
    const mockupPath =
      placement === "front" ? mockupEntry?.front : mockupEntry?.back;
    if (mockupPath?.trim()) {
      return colorMockupAssetUrl(mockupPath.trim().replace(/^\/+/, ""));
    }
  }

  return defaultDesignAssetUrl(assetKey);
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
