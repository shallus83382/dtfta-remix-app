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

  red: {
    unisex_tee_front: "assets/customizer/red/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/red/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/red/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/red/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/red/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/red/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/red/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/red/back/heavy-blend-hoodie-back.png",
  },

  black: {
    unisex_tee_front: "assets/customizer/black/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/black/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/black/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/black/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/black/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/black/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/black/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/black/back/heavy-blend-hoodie-back.png",
  },

  white: {
    unisex_tee_front: "assets/customizer/white/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/white/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/white/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/white/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/white/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/white/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/white/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/white/back/heavy-blend-hoodie-back.png",
  },

  brown: {
    unisex_tee_front: "assets/customizer/brown/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/brown/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/brown/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/brown/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/brown/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/brown/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/brown/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/brown/back/heavy-blend-hoodie-back.png",
  },

  green: {
    unisex_tee_front: "assets/customizer/green/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/green/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/green/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/green/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/green/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/green/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/green/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/green/back/heavy-blend-hoodie-back.png",
  },
  blue: {
    unisex_tee_front: "assets/customizer/blue/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/blue/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/blue/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/blue/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/blue/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/blue/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/blue/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/blue/back/heavy-blend-hoodie-back.png",
  },
  orange: {
    unisex_tee_front: "assets/customizer/orange/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/orange/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/orange/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/orange/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/orange/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/orange/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/orange/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/orange/back/heavy-blend-hoodie-back.png",
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

    case "brown":
    case "brn":
      return "brown";

    case "green":
    case "grn":
      return "green";

    case "blue":
    case "blu":
      return "blue";

    case "orange":
    case "org":
      return "orange";
    
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
  console.log("resolved", resolved ? `${APP_ASSET_BASE}/${resolved}` : "", "colorCategory", colorCategory, "assetKey", assetKey);
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
