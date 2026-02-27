/**
 * Client-safe mapping from productKey to design asset URLs (-front/-back).
 * Used by the customizer; do not use Node/server-only APIs here.
 */

export const PRODUCT_KEY_TO_DESIGN_ASSET_BASE: Record<string, string> = {
  "nl-6210": "unisex-tee",
  "nl-3601": "long-sleeve-tee",
  "gd-18500": "heavy-blend-hoodie",
  "ch-m2650ch": "heavyweight-hoodie",
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
