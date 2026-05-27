import { getProductDesignAssetUrl } from "./design-assets";
import {
  normalizeDtftaProduct,
  resolveProductKeyFromApiProduct,
  type DtftaColorMockups,
  type DtftaProductBlank,
} from "./dtfta-products.server";

/** Raw product row from Laravel `DtftaProductResource`. */
export type ApiCatalogProduct = {
  id?: string | number;
  productKey?: string;
  name?: string;
  category?: string;
  brandCode?: string;
  brand?: string;
  style?: string;
  model?: string;
  image?: string;
  images?: string[];
  description?: string | null;
  status?: string;
  price?: number;
  currency?: string;
  colors?: string[];
  sizes?: string[];
  variants?: unknown[];
  print_areas?: unknown[];
  color_mockups?: unknown;
  created_at?: string;
  updated_at?: string;
};

export function buildNormalizeInputFromApiProduct(
  p: ApiCatalogProduct
): Partial<DtftaProductBlank> {
  const apiProductKey = typeof p.productKey === "string" ? p.productKey.trim() : "";

  return {
    id: p.id,
    productKey: apiProductKey,
    key: apiProductKey || String(p.id ?? ""),
    name: p.name,
    category: p.category,
    brandCode: p.brandCode ?? "",
    brand: p.brand,
    style: p.style ?? p.model ?? "",
    model: p.model ?? "",
    image: p.image,
    images: p.images,
    description: p.description ?? null,
    status: p.status ?? "active",
    price: p.price ?? 0,
    currency: p.currency ?? "USD",
    colors: p.colors,
    sizes: p.sizes,
    variants: p.variants as DtftaProductBlank["variants"],
    print_areas: p.print_areas as DtftaProductBlank["print_areas"],
    color_mockups: p.color_mockups as DtftaColorMockups | undefined,
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}

export function resolveCatalogProductImage(
  imageKey: string | undefined,
  normalized: DtftaProductBlank | null
): string {
  const key = typeof imageKey === "string" ? imageKey.trim() : "";
  if (!key) return "";

  const defaultColorCode =
    normalized?.variants?.find((v) => v.is_active !== false)?.colorCode?.trim() ?? "";

  const resolved = getProductDesignAssetUrl(key, defaultColorCode, {
    colorMockups: normalized?.color_mockups ?? null,
  });

  return resolved || key;
}

export function mapApiProductForDisplay<T extends ApiCatalogProduct>(
  p: T
): T & {
  productKey?: string;
  image: string;
  colors: string[];
  sizes: string[];
  print_areas: DtftaProductBlank["print_areas"];
  color_mockups?: DtftaColorMockups;
} {
  const normalized = normalizeDtftaProduct(buildNormalizeInputFromApiProduct(p));
  const apiProductKey = typeof p.productKey === "string" ? p.productKey.trim() : "";

  const productKey =
    apiProductKey ||
    normalized?.productKey ||
    normalized?.key ||
    resolveProductKeyFromApiProduct({
      id: p.id,
      model: p.model,
      productKey: apiProductKey,
    });

  return {
    ...p,
    productKey: productKey ?? undefined,
    image: resolveCatalogProductImage(p.image, normalized),
    colors: normalized?.colors ?? p.colors ?? [],
    sizes: normalized?.sizes ?? p.sizes ?? [],
    print_areas: normalized?.print_areas ?? (p.print_areas as DtftaProductBlank["print_areas"]) ?? [],
    color_mockups: normalized?.color_mockups,
  };
}
