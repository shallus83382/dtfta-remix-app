/**
 * Client-safe mapping from productKey to design asset URLs (-front/-back).
 * Used by the customizer; do not use Node/server-only APIs here.
 */
const APP_ASSET_BASE = "https://d315otl6ckb9m2.cloudfront.net";

export const PRODUCT_KEY_TO_DESIGN_ASSET_BASE: Record<string, string> = {
  "nl-6210": "unisex-tee",
  "nl-3601": "long-sleeve-tee",
  "gd-18500": "heavy-blend-hoodie",
  "ch-m2650ch": "heavyweight-hoodie",
};


export const PRODUCT_KEY_TO_DESIGN_ASSET: Record<string, Record<string, string>> = {
  default: {
    unisex_tee: "assets/customizer/product/unisex-tee.jpg",
    long_sleeve_tee: "assets/customizer/product/long-sleeve-tee.jpg",
    heavyweight_hoodie: "assets/customizer/product/heavyweight-hoodie.jpg",
    heavy_blend_hoodie: "assets/customizer/product/heavy-blend-hoodie.jpg",

    unisex_tee_front: "assets/customizer/front/unisex-tee-front.jpg",
    long_sleeve_tee_front: "assets/customizer/front/long-sleeve-tee-front.jpg",
    heavyweight_hoodie_front: "assets/customizer/front/heavyweight-hoodie-front.jpg",
    heavy_blend_hoodie_front: "assets/customizer/front/heavy-blend-hoodie-front.jpg",

    unisex_tee_back: "assets/customizer/back/unisex-tee-back.jpg",
    long_sleeve_tee_back: "assets/customizer/back/long-sleeve-tee-back.jpg",
    heavyweight_hoodie_back: "assets/customizer/back/heavyweight-hoodie-back.jpg",
    heavy_blend_hoodie_back: "assets/customizer/back/heavy-blend-hoodie-back.jpg",
  },

  red: {
    unisex_tee_front: "assets/customizer/red/front/unisex-tee-front.jpg",
    unisex_tee_back: "assets/customizer/red/back/unisex-tee-back.jpg",

    long_sleeve_tee_front: "assets/customizer/red/front/long-sleeve-tee-front.jpg",
    long_sleeve_tee_back: "assets/customizer/red/back/long-sleeve-tee-back.jpg",

    heavyweight_hoodie_front: "assets/customizer/red/front/heavyweight-hoodie-front.jpg",
    heavyweight_hoodie_back: "assets/customizer/red/back/heavyweight-hoodie-back.jpg",

    heavy_blend_hoodie_front: "assets/customizer/red/front/heavy-blend-hoodie-front.jpg",
    heavy_blend_hoodie_back: "assets/customizer/red/back/heavy-blend-hoodie-back.jpg",
  },

  black: {
    unisex_tee_front: "assets/customizer/black/front/unisex-tee-front.jpg",
    unisex_tee_back: "assets/customizer/black/back/unisex-tee-back.jpg",

    long_sleeve_tee_front: "assets/customizer/black/front/long-sleeve-tee-front.jpg",
    long_sleeve_tee_back: "assets/customizer/black/back/long-sleeve-tee-back.jpg",

    heavyweight_hoodie_front: "assets/customizer/black/front/heavyweight-hoodie-front.jpg",
    heavyweight_hoodie_back: "assets/customizer/black/back/heavyweight-hoodie-back.jpg",

    heavy_blend_hoodie_front: "assets/customizer/black/front/heavy-blend-hoodie-front.jpg",
    heavy_blend_hoodie_back: "assets/customizer/black/back/heavy-blend-hoodie-back.jpg",
  },

  white: {
    unisex_tee_front: "assets/customizer/white/front/unisex-tee-front.jpg",
    unisex_tee_back: "assets/customizer/white/back/unisex-tee-back.jpg",

    long_sleeve_tee_front: "assets/customizer/white/front/long-sleeve-tee-front.jpg",
    long_sleeve_tee_back: "assets/customizer/white/back/long-sleeve-tee-back.jpg",

    heavyweight_hoodie_front: "assets/customizer/white/front/heavyweight-hoodie-front.jpg",
    heavyweight_hoodie_back: "assets/customizer/white/back/heavyweight-hoodie-back.jpg",

    heavy_blend_hoodie_front: "assets/customizer/white/front/heavy-blend-hoodie-front.jpg",
    heavy_blend_hoodie_back: "assets/customizer/white/back/heavy-blend-hoodie-back.jpg",
  },

  navy: {
    unisex_tee_front: "assets/customizer/navy/front/unisex-tee-front.jpg",
    unisex_tee_back: "assets/customizer/navy/back/unisex-tee-back.jpg",

    long_sleeve_tee_front: "assets/customizer/navy/front/long-sleeve-tee-front.jpg",
    long_sleeve_tee_back: "assets/customizer/navy/back/long-sleeve-tee-back.jpg",

    heavyweight_hoodie_front: "assets/customizer/navy/front/heavyweight-hoodie-front.jpg",
    heavyweight_hoodie_back: "assets/customizer/navy/back/heavyweight-hoodie-back.jpg",

    heavy_blend_hoodie_front: "assets/customizer/navy/front/heavy-blend-hoodie-front.jpg",
    heavy_blend_hoodie_back: "assets/customizer/navy/back/heavy-blend-hoodie-back.jpg",
  },
};


export type DesignPlacement = "front" | "back";

/**
 * Resolve the product image URL for the customizer canvas (1000x1000 -front/-back assets).
 * Returns e.g. /assets/unisex-tee-front.jpg or /assets/unisex-tee-back.jpg.
 */
export function mapColorToAssetCategory(color?: string): string {
  const value = color?.trim().toLowerCase();

  switch (value) {
    case "red":
    case "rd":
      return "red";

    case "black":
    case "blk":
      return "black";

    case "white":
    case "wht":
      return "white";

    case "navy":
    case "nav":
      return "navy";

    default:
      return "default";
  }
}

/**
 * Existing flat asset-key resolver, now color-aware with default fallback.
 *
 * Example:
 * getProductDesignAssetUrl("heavy_blend_hoodie_back", "red")
 * -> /assets/customizer/red/back/heavy-blend-hoodie-back.jpg
 */
export function getProductDesignAssetUrl(assetKey: string, color?: string): string {
  const colorCategory = mapColorToAssetCategory(color);

  const colorAsset = PRODUCT_KEY_TO_DESIGN_ASSET[colorCategory]?.[assetKey];
  const fallbackAsset = PRODUCT_KEY_TO_DESIGN_ASSET.default?.[assetKey];
  const resolved = colorAsset || fallbackAsset;

  return resolved ? `${APP_ASSET_BASE}/${resolved}` : "";
}

/**
 * Resolve product image by productKey + placement + optional color.
 * Useful when you do not already have selectedPrintArea.image.
 */
export function getDesignAssetUrl(
  productKey: string,
  placement: DesignPlacement,
  color?: string
): string {
  const base = PRODUCT_KEY_TO_DESIGN_ASSET_BASE[productKey] ?? "unisex_tee";
  const assetKey = `${base}_${placement}`;

  return getProductDesignAssetUrl(assetKey, color);
}
