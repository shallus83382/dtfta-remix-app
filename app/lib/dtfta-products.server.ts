/**
 * Static DTFTA product/variant config derived from Developer Guide.
 * Four apparel blanks with SKU format: DTFTA-APP-{CATEGORY}-{BRANDCODE}-{STYLE}-{COLORCODE}-{SIZE}
 * Placeholder images from public/assets/ for catalog display.
 */

export interface DtftaVariant {
  colorCode: string;
  colorName: string;
  size: string;
  sku: string;
}

export interface DtftaProductBlank {
  key: string;
  name: string;
  category: string;
  brandCode: string;
  style: string;
  model: string;
  image: string;
  variants: DtftaVariant[];
}

const SIZES_TEE = ["S", "M", "L", "XL", "2XL"];
const SIZES_HOODIE = ["S", "M", "L", "XL", "2XL"];
const COLORS_COMMON = [
  { code: "BLK", name: "Black" },
  { code: "WHT", name: "White" },
  { code: "NAV", name: "Navy" },
  { code: "HGR", name: "Heather Gray" },
  { code: "CHAR", name: "Charcoal" },
  { code: "RED", name: "Red" },
];

function buildSku(category: string, brandCode: string, style: string, colorCode: string, size: string): string {
  return `DTFTA-APP-${category}-${brandCode}-${style}-${colorCode}-${size}`;
}

function buildVariants(
  category: string,
  brandCode: string,
  style: string,
  sizes: string[]
): DtftaVariant[] {
  const variants: DtftaVariant[] = [];
  for (const { code: colorCode, name: colorName } of COLORS_COMMON) {
    for (const size of sizes) {
      variants.push({
        colorCode,
        colorName,
        size,
        sku: buildSku(category, brandCode, style, colorCode, size),
      });
    }
  }
  return variants;
}

const BRAND_NAMES: Record<string, string> = {
  NL: "Next Level",
  GD: "Gildan",
  CH: "Cotton Heritage",
};

/** Placeholder image paths under public/assets/ (served at /assets/...) */
export const DTFTA_PLACEHOLDER_IMAGES = {
  unisexTee: "/assets/unisex-tee.jpg",
  longSleeveTee: "/assets/long-sleeve-tee.jpg",
  heavyBlendHoodie: "/assets/heavy-blend-hoodie.jpg",
  heavyweightHoodie: "/assets/heavyweight-hoodie.jpg",
} as const;

export const DTFTA_PRODUCT_BLANKS: DtftaProductBlank[] = [
  {
    key: "nl-6210",
    name: "Unisex Tee",
    category: "TEE",
    brandCode: "NL",
    style: "6210",
    model: "6210",
    image: DTFTA_PLACEHOLDER_IMAGES.unisexTee,
    variants: buildVariants("TEE", "NL", "6210", SIZES_TEE),
  },
  {
    key: "nl-3601",
    name: "Long Sleeve Tee",
    category: "LS",
    brandCode: "NL",
    style: "3601",
    model: "3601",
    image: DTFTA_PLACEHOLDER_IMAGES.longSleeveTee,
    variants: buildVariants("LS", "NL", "3601", SIZES_TEE),
  },
  {
    key: "gd-18500",
    name: "Heavy Blend Hoodie",
    category: "HOODIE",
    brandCode: "GD",
    style: "18500",
    model: "18500",
    image: DTFTA_PLACEHOLDER_IMAGES.heavyBlendHoodie,
    variants: buildVariants("HOODIE", "GD", "18500", SIZES_HOODIE),
  },
  {
    key: "ch-m2650ch",
    name: "Heavyweight Hoodie",
    category: "HOODIE",
    brandCode: "CH",
    style: "M2650CH",
    model: "M2650CH",
    image: DTFTA_PLACEHOLDER_IMAGES.heavyweightHoodie,
    variants: buildVariants("HOODIE", "CH", "M2650CH", SIZES_HOODIE),
  },
];

/** Map Laravel API product id or model to a DTFTA blank key for customizer / create-in-shopify */
export function getDtftaBlankByKey(key: string): DtftaProductBlank | undefined {
  return DTFTA_PRODUCT_BLANKS.find((b) => b.key === key);
}

/**
 * Return the four DTFTA blanks as placeholder products for the catalog (Product shape with productKey).
 * Use when the API returns no products or fails.
 */
export function getPlaceholderProducts(): Array<{
  id: string;
  name: string;
  brand: string;
  model: string;
  price: number;
  currency: string;
  image: string;
  category: string;
  productKey: string;
}> {
  return DTFTA_PRODUCT_BLANKS.map((blank) => ({
    id: blank.key,
    name: blank.name,
    brand: BRAND_NAMES[blank.brandCode] ?? blank.brandCode,
    model: blank.model,
    price: 0,
    currency: "USD",
    image: blank.image,
    category: blank.category,
    productKey: blank.key,
  }));
}

/** Resolve product key from API product (match by model or id) */
export function resolveProductKeyFromApiProduct(apiProduct: { id?: string; model?: string }): string | undefined {
  if (!apiProduct) return undefined;
  const byModel = apiProduct.model
    ? DTFTA_PRODUCT_BLANKS.find((b) => b.model.toLowerCase() === apiProduct.model!.toLowerCase())
    : undefined;
  if (byModel) return byModel.key;
  if (apiProduct.id) {
    const byId = DTFTA_PRODUCT_BLANKS.find((b) => b.key === apiProduct.id);
    if (byId) return byId.key;
  }
  return undefined;
}

/** Re-export for server code that needs design asset URLs. Source of truth is design-assets.ts (client-safe). */
export { getDesignAssetUrl, PRODUCT_KEY_TO_DESIGN_ASSET_BASE, type DesignPlacement } from "./design-assets";

/** Placeholder image URL for an API product (for catalog display). Use when API does not provide image. */
export function getPlaceholderImageForApiProduct(apiProduct: { id?: string; model?: string }): string | undefined {
  const blank = apiProduct.model
    ? DTFTA_PRODUCT_BLANKS.find((b) => b.model.toLowerCase() === apiProduct.model!.toLowerCase())
    : apiProduct.id
      ? DTFTA_PRODUCT_BLANKS.find((b) => b.key === apiProduct.id)
      : undefined;
  return blank?.image;
}
