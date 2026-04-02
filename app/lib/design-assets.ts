/**
 * Client-safe mapping from productKey to design asset URLs (-front/-back).
 * Used by the customizer; do not use Node/server-only APIs here.
 */
const APP_ASSET_BASE = "https://phpstack-1180784-6299772.cloudwaysapps.com";

export const PRODUCT_KEY_TO_DESIGN_ASSET_BASE: Record<string, string> = {
  "nl-6210": "unisex-tee",
  "nl-3601": "long-sleeve-tee",
  "gd-18500": "heavy-blend-hoodie",
  "ch-m2650ch": "heavyweight-hoodie",
};


export const PRODUCT_KEY_TO_DESIGN_ASSET: Record<string, string> = {
  "unisex_tee": "assets/customizer/product/unisex-tee.jpg",
  "long_sleeve_tee": "assets/customizer/product/long-sleeve-tee.jpg",
  "heavyweight_hoodie": "assets/customizer/product/heavyweight-hoodie.jpg",
  "heavy_blend_hoodie": "assets/customizer/product/heavy-blend-hoodie.jpg",
  "unisex_tee_front": "assets/customizer/front/unisex-tee-front.jpg",
  "long_sleeve_tee_front": "assets/customizer/front/long-sleeve-tee-front.jpg",
  "heavyweight_hoodie_front": "assets/customizer/front/heavyweight-hoodie-front.jpg",
  "heavy_blend_hoodie_front": "assets/customizer/front/heavy-blend-hoodie-front.jpg", 
  "unisex_tee_back": "assets/customizer/back/unisex-tee-back.jpg",
  "long_sleeve_tee_back": "assets/customizer/back/long-sleeve-tee-back.jpg",
  "heavyweight_hoodie_back": "assets/customizer/back/heavyweight-hoodie-back.jpg",
  "heavy_blend_hoodie_back": "assets/customizer/back/heavy-blend-hoodie-back.jpg",   
};


export type DesignPlacement = "front" | "back";

/**
 * Resolve the product image URL for the customizer canvas (1000x1000 -front/-back assets).
 * Returns e.g. /assets/unisex-tee-front.jpg or /assets/unisex-tee-back.jpg.
 */
export function getDesignAssetUrl(productKey: string, placement: DesignPlacement): string {
  const base = PRODUCT_KEY_TO_DESIGN_ASSET_BASE[productKey] ?? "unisex-tee";
  return `/assets/${base}-${placement}.jpg`;
}

export function getProductDesignAssetUrl(assetKey: string): string {
  const base = PRODUCT_KEY_TO_DESIGN_ASSET[assetKey] ;
  return `${APP_ASSET_BASE}/${base}`;
}
