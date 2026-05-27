/**
 * Static DTFTA product/variant config derived from Developer Guide.
 * Extended to support both legacy blank format and API product response format.
 */

export interface DtftaColorMockupEntry {
  name?: string;
  hex?: string;
  front?: string;
  back?: string;
}

export type DtftaColorMockups = Record<string, DtftaColorMockupEntry>;

export interface DtftaVariant {
  id?: number;
  colorCode: string;
  colorName: string;
  size: string;
  sku: string;
  is_active?: boolean;
  price?: number;
}

export interface DtftaPrintArea {
  id: number;
  title: string;
  area_width: string;
  area_height: string;
  unit: string;
  position_x: string;
  position_y: string;
  tshirt_size: string;
  display_order: number;
  is_active: boolean;
  image: string;
  price?: number;
  /** Optional explicit physical print width in `unit` (when set, overrides heuristic / DPI derivation). */
  physical_print_width?: string;
  physical_print_height?: string;
  /** Design pixels per inch when deriving inches from large coordinate-style `area_width`/`area_height`. Default 150 in code. */
  print_area_dpi?: number;
  /** Mockup/clipping rectangle in design coordinates (0–500 scale). Use when `area_width`/`area_height` hold physical sizes (e.g. 12×16 in). */
  design_area_width?: string;
  design_area_height?: string;
  design_position_x?: string;
  design_position_y?: string;
  /**
   * Width/height of the **full mockup coordinate system** in the print-area `unit` (e.g. usable chest
   * width × height the placement is measured against). When set, `position_x`/`position_y` map as
   * `(value / reference) * 500` on each axis. Omit only if defaults from the app are acceptable.
   */
  position_reference_width?: string;
  position_reference_height?: string;
}

export interface DtftaProductBlank {
  id?: number | string;
  key: string;
  productKey?: string;
  name: string;
  category: string;
  brandCode: string;
  brand?: string;
  style: string;
  model: string;
  image: string;
  images?: string[];
  description?: string | null;
  status?: string;
  price: number;
  currency: string;
  colors?: string[];
  sizes?: string[];
  variants: DtftaVariant[];
  print_areas?: DtftaPrintArea[];
  color_mockups?: DtftaColorMockups;
  created_at?: string;
  updated_at?: string;
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
  { code: "clay", name: "Clay" },
  { code: "antique_gold", name: "Antique Gold" },
  { code: "banana_cream", name: "Banana Cream" },
  { code: "blue_jean", name: "Blue Jean" },
  { code: "bone", name: "Bone" },
  { code: "cardinal", name: "Cardinal" },
  { code: "classic_orange", name: "Classic Orange" },
  { code: "cool_blue", name: "Cool Blue" },
  { code: "cream", name: "Cream" },
  { code: "dark_chocolate", name: "Dark Chocolate" },
  { code: "desert_pink", name: "Desert Pink" },
  { code: "forest_green", name: "Forest Green" },
  { code: "gold", name: "Gold" },
  { code: "graphite_black", name: "Graphite Black" },
  { code: "heather_gray", name: "Heather Gray" },
  { code: "heavy_metal", name: "Heavy Metal" },
  { code: "indigo", name: "Indigo" },
  { code: "kelly_green", name: "Kelly Green" },
  { code: "light_blue", name: "Light Blue" },
  { code: "light_grey", name: "Light Grey" },
  { code: "light_olive", name: "Light Olive" },
  { code: "light_pink", name: "Light Pink" },
  { code: "maroon", name: "Maroon" },
  { code: "mauve", name: "Mauve" },
  { code: "midnight_navy", name: "Midnight Navy" },
  { code: "military_green", name: "Military Green" },
  { code: "natural", name: "Natural" },
  { code: "oatmeal", name: "Oatmeal" },
  { code: "oxblood", name: "Oxblood" },
  { code: "periblue", name: "Periblue" },
  { code: "purple_rush", name: "Purple Rush" },
  { code: "royal", name: "Royal" },
  { code: "royal_pine", name: "Royal Pine" },
  { code: "sand", name: "Sand" },
  { code: "shiitake", name: "Shiitake" },
  { code: "stonewash_denim", name: "Stonewash Denim" },
  { code: "tahiti_blue", name: "Tahiti Blue" },
  { code: "tan", name: "Tan" },
  { code: "teal", name: "Teal" },
  { code: "turquoise", name: "Turquoise" },
  { code: "watermelon", name: "Watermelon" },
  { code: "hot_pink", name: "Hot Pink" }
];

const BRAND_NAMES: Record<string, string> = {
  NL: "Next Level",
  GD: "Gildan",
  CH: "Cotton Heritage",
};

function buildSku(
  category: string,
  brandCode: string,
  style: string,
  colorCode: string,
  size: string
): string {
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
        is_active: true,
      });
    }
  }

  return variants;
}

function buildDefaultPrintAreas(image: string, sizes: string[]): DtftaPrintArea[] {
  return [
    {
      id: 1,
      title: "Front",
      area_width: "250.00",
      area_height: "250.00",
      unit: "px",
      position_x: "0.00",
      position_y: "0.00",
      tshirt_size: sizes.join(", "),
      display_order: 1,
      is_active: true,
      image,
    },
    {
      id: 2,
      title: "Back",
      area_width: "250.00",
      area_height: "250.00",
      unit: "px",
      position_x: "0.00",
      position_y: "0.00",
      tshirt_size: sizes.join(", "),
      display_order: 2,
      is_active: true,
      image,
    },
  ];
}

export const DTFTA_PLACEHOLDER_IMAGES = {
  unisexTee: "/assets/unisex-tee.jpg",
  longSleeveTee: "/assets/long-sleeve-tee.jpg",
  heavyBlendHoodie: "/assets/heavy-blend-hoodie.jpg",
  heavyweightHoodie: "/assets/heavyweight-hoodie.jpg",
} as const;

export const DTFTA_PRODUCT_BLANKS: DtftaProductBlank[] = [
  {
    key: "nl-6210",
    productKey: "nl-6210",
    name: "Unisex Tee",
    category: "TEE",
    brandCode: "NL",
    brand: "Next Level",
    style: "6210",
    model: "6210",
    image: DTFTA_PLACEHOLDER_IMAGES.unisexTee,
    images: [DTFTA_PLACEHOLDER_IMAGES.unisexTee],
    description: null,
    status: "active",
    price: 0,
    currency: "USD",
    colors: COLORS_COMMON.map((c) => c.name),
    sizes: SIZES_TEE,
    variants: buildVariants("TEE", "NL", "6210", SIZES_TEE),
    print_areas: buildDefaultPrintAreas(DTFTA_PLACEHOLDER_IMAGES.unisexTee, SIZES_TEE),
  },
  {
    key: "nl-3601",
    productKey: "nl-3601",
    name: "Long Sleeve Tee",
    category: "LS",
    brandCode: "NL",
    brand: "Next Level",
    style: "3601",
    model: "3601",
    image: DTFTA_PLACEHOLDER_IMAGES.longSleeveTee,
    images: [DTFTA_PLACEHOLDER_IMAGES.longSleeveTee],
    description: null,
    status: "active",
    price: 0,
    currency: "USD",
    colors: COLORS_COMMON.map((c) => c.name),
    sizes: SIZES_TEE,
    variants: buildVariants("LS", "NL", "3601", SIZES_TEE),
    print_areas: buildDefaultPrintAreas(DTFTA_PLACEHOLDER_IMAGES.longSleeveTee, SIZES_TEE),
  },
  {
    key: "gd-18500",
    productKey: "gd-18500",
    name: "Heavy Blend Hoodie",
    category: "HOODIE",
    brandCode: "GD",
    brand: "Gildan",
    style: "18500",
    model: "18500",
    image: DTFTA_PLACEHOLDER_IMAGES.heavyBlendHoodie,
    images: [DTFTA_PLACEHOLDER_IMAGES.heavyBlendHoodie],
    description: null,
    status: "active",
    price: 0,
    currency: "USD",
    colors: COLORS_COMMON.map((c) => c.name),
    sizes: SIZES_HOODIE,
    variants: buildVariants("HOODIE", "GD", "18500", SIZES_HOODIE),
    print_areas: buildDefaultPrintAreas(DTFTA_PLACEHOLDER_IMAGES.heavyBlendHoodie, SIZES_HOODIE),
  },
  {
    key: "ch-m2650ch",
    productKey: "ch-m2650ch",
    name: "Heavyweight Hoodie",
    category: "HOODIE",
    brandCode: "CH",
    brand: "Cotton Heritage",
    style: "M2650CH",
    model: "M2650CH",
    image: DTFTA_PLACEHOLDER_IMAGES.heavyweightHoodie,
    images: [DTFTA_PLACEHOLDER_IMAGES.heavyweightHoodie],
    description: null,
    status: "active",
    price: 0,
    currency: "USD",
    colors: COLORS_COMMON.map((c) => c.name),
    sizes: SIZES_HOODIE,
    variants: buildVariants("HOODIE", "CH", "M2650CH", SIZES_HOODIE),
    print_areas: buildDefaultPrintAreas(DTFTA_PLACEHOLDER_IMAGES.heavyweightHoodie, SIZES_HOODIE),
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeColorMockups(input: unknown): DtftaColorMockups | undefined {
  if (!isRecord(input)) {
    return undefined;
  }

  const result: DtftaColorMockups = {};

  for (const [key, value] of Object.entries(input)) {
    if (!isRecord(value)) {
      continue;
    }

    const entry: DtftaColorMockupEntry = {};

    if (typeof value.name === "string" && value.name.trim()) {
      entry.name = value.name.trim();
    }
    if (typeof value.hex === "string" && value.hex.trim()) {
      entry.hex = value.hex.trim();
    }
    if (typeof value.front === "string" && value.front.trim()) {
      entry.front = value.front.trim().replace(/^\/+/, "");
    }
    if (typeof value.back === "string" && value.back.trim()) {
      entry.back = value.back.trim().replace(/^\/+/, "");
    }

    if (entry.front || entry.back || entry.hex || entry.name) {
      result[key] = entry;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

export function normalizeDtftaVariant(input: unknown): DtftaVariant | null {
  if (!isRecord(input)) return null;

  const colorCode =
    typeof input.colorCode === "string"
      ? input.colorCode
      : typeof input.color_code === "string"
        ? input.color_code
        : "";

  const colorName =
    typeof input.colorName === "string"
      ? input.colorName
      : typeof input.color_name === "string"
        ? input.color_name
        : "";

  const size = typeof input.size === "string" ? input.size : "";
  const sku = typeof input.sku === "string" ? input.sku : "";

  if (!colorCode || !colorName || !size || !sku) return null;

  const variant: DtftaVariant = {
    colorCode,
    colorName,
    size,
    sku,
    is_active:
      typeof input.is_active === "boolean"
        ? input.is_active
        : typeof input.isActive === "boolean"
          ? input.isActive
          : true,
  };

  if (typeof input.id === "number") {
    variant.id = input.id;
  }

  const price =
    typeof input.price === "number"
      ? input.price
      : typeof input.price === "string"
        ? Number.parseFloat(input.price)
        : undefined;
  if (price !== undefined && !Number.isNaN(price)) {
    variant.price = price;
  }

  return variant;
}

export function normalizeDtftaPrintArea(input: unknown): DtftaPrintArea | null {
  if (!isRecord(input)) return null;

  const title = typeof input.title === "string" ? input.title : "";
  const image = typeof input.image === "string" ? input.image : "";

  if (!title) return null;

  return {
    id: typeof input.id === "number" ? input.id : 0,
    title,
    area_width:
      typeof input.area_width === "string"
        ? input.area_width
        : typeof input.areaWidth === "string"
          ? input.areaWidth
          : "250.00",
    area_height:
      typeof input.area_height === "string"
        ? input.area_height
        : typeof input.areaHeight === "string"
          ? input.areaHeight
          : "250.00",
    unit: typeof input.unit === "string" ? input.unit : "px",
    position_x:
      typeof input.position_x === "string"
        ? input.position_x
        : typeof input.positionX === "string"
          ? input.positionX
          : "0.00",
    position_y:
      typeof input.position_y === "string"
        ? input.position_y
        : typeof input.positionY === "string"
          ? input.positionY
          : "0.00",
    tshirt_size:
      typeof input.tshirt_size === "string"
        ? input.tshirt_size
        : typeof input.tshirtSize === "string"
          ? input.tshirtSize
          : "",
    display_order:
      typeof input.display_order === "number"
        ? input.display_order
        : typeof input.displayOrder === "number"
          ? input.displayOrder
          : 0,
    is_active:
      typeof input.is_active === "boolean"
        ? input.is_active
        : typeof input.isActive === "boolean"
          ? input.isActive
          : true,
    image,
    ...((): { price?: number } => {
      const rawPrice = input.price;
      const price =
        typeof rawPrice === "number"
          ? rawPrice
          : typeof rawPrice === "string"
            ? Number.parseFloat(rawPrice)
            : undefined;
      return price !== undefined && !Number.isNaN(price) ? { price } : {};
    })(),
    ...(typeof input.physical_print_width === "string"
      ? { physical_print_width: input.physical_print_width }
      : typeof input.physicalPrintWidth === "string"
        ? { physical_print_width: input.physicalPrintWidth }
        : {}),
    ...(typeof input.physical_print_height === "string"
      ? { physical_print_height: input.physical_print_height }
      : typeof input.physicalPrintHeight === "string"
        ? { physical_print_height: input.physicalPrintHeight }
        : {}),
    ...(typeof input.print_area_dpi === "number"
      ? { print_area_dpi: input.print_area_dpi }
      : typeof input.printAreaDpi === "number"
        ? { print_area_dpi: input.printAreaDpi }
        : {}),
    ...(typeof input.design_area_width === "string"
      ? { design_area_width: input.design_area_width }
      : typeof input.designAreaWidth === "string"
        ? { design_area_width: input.designAreaWidth }
        : {}),
    ...(typeof input.design_area_height === "string"
      ? { design_area_height: input.design_area_height }
      : typeof input.designAreaHeight === "string"
        ? { design_area_height: input.designAreaHeight }
        : {}),
    ...(typeof input.design_position_x === "string"
      ? { design_position_x: input.design_position_x }
      : typeof input.designPositionX === "string"
        ? { design_position_x: input.designPositionX }
        : {}),
    ...(typeof input.design_position_y === "string"
      ? { design_position_y: input.design_position_y }
      : typeof input.designPositionY === "string"
        ? { design_position_y: input.designPositionY }
        : {}),
    ...(typeof input.position_reference_width === "string"
      ? { position_reference_width: input.position_reference_width }
      : typeof input.positionReferenceWidth === "string"
        ? { position_reference_width: input.positionReferenceWidth }
        : {}),
    ...(typeof input.position_reference_height === "string"
      ? { position_reference_height: input.position_reference_height }
      : typeof input.positionReferenceHeight === "string"
        ? { position_reference_height: input.positionReferenceHeight }
        : {}),
  };
}

export function normalizeDtftaProduct(
  product: Partial<DtftaProductBlank> | null | undefined
): DtftaProductBlank | null {
  if (!product) return null;

  const rawVariants = Array.isArray(product.variants) ? product.variants : [];
  const variants: DtftaVariant[] = rawVariants.reduce<DtftaVariant[]>((acc, variant) => {
    const normalized = normalizeDtftaVariant(variant);
    if (normalized) acc.push(normalized);
    return acc;
  }, []);

  const colors =
    Array.isArray(product.colors) && product.colors.length > 0
      ? product.colors.filter(
          (color): color is string => typeof color === "string" && color.trim().length > 0
        )
      : Array.from(new Set(variants.map((v) => v.colorName).filter(Boolean)));

  const sizes =
    Array.isArray(product.sizes) && product.sizes.length > 0
      ? product.sizes.filter(
          (size): size is string => typeof size === "string" && size.trim().length > 0
        )
      : Array.from(new Set(variants.map((v) => v.size).filter(Boolean)));

  const rawPrintAreas = Array.isArray(product.print_areas) ? product.print_areas : [];
  const normalizedPrintAreas: DtftaPrintArea[] = rawPrintAreas.reduce<DtftaPrintArea[]>((acc, area) => {
    const normalized = normalizeDtftaPrintArea(area);
    if (normalized) acc.push(normalized);
    return acc;
  }, []);

  const key =
    product.key ||
    product.productKey ||
    (product.brandCode && product.style
      ? `${String(product.brandCode).toLowerCase()}-${String(product.style).toLowerCase()}`
      : "");

  const brand =
    product.brand ||
    (product.brandCode ? BRAND_NAMES[product.brandCode] : undefined) ||
    product.brandCode ||
    "";

  const image =
    product.image ||
    (Array.isArray(product.images) && typeof product.images[0] === "string" ? product.images[0] : "") ||
    normalizedPrintAreas.find((area) => area.image)?.image ||
    "";

  const printAreas =
    normalizedPrintAreas.length > 0
      ? normalizedPrintAreas
      : buildDefaultPrintAreas(image, sizes);

  return {
    id: product.id,
    key,
    productKey: product.productKey || key,
    name: product.name || "Product",
    category: product.category || "",
    brandCode: product.brandCode || "",
    brand,
    style: product.style || product.model || "",
    model: product.model || product.style || "",
    image,
    images:
      Array.isArray(product.images) && product.images.length > 0
        ? product.images.filter(
            (img): img is string => typeof img === "string" && img.trim().length > 0
          )
        : image
          ? [image]
          : [],
    description: product.description ?? null,
    status: product.status || "active",
    price: product.price ?? 0,
    currency: product.currency || "USD",
    colors,
    sizes,
    variants,
    print_areas: printAreas,
    color_mockups: normalizeColorMockups(product.color_mockups),
    created_at: product.created_at,
    updated_at: product.updated_at,
  };
}

export function getDtftaBlankByKey(key: string): DtftaProductBlank | undefined {
  const found = DTFTA_PRODUCT_BLANKS.find((b) => b.key === key || b.productKey === key);
  return found ? normalizeDtftaProduct(found) ?? undefined : undefined;
}

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
  colors: string[];
  sizes: string[];
  print_areas: DtftaPrintArea[];
}> {
  return DTFTA_PRODUCT_BLANKS.map((blank) => {
    const product = normalizeDtftaProduct(blank)!;

    return {
      id: String(product.id ?? product.key),
      name: product.name,
      brand: product.brand || BRAND_NAMES[product.brandCode] || product.brandCode,
      model: product.model,
      price: product.price,
      currency: product.currency,
      image: product.image,
      category: product.category,
      productKey: product.productKey || product.key,
      colors: product.colors ?? [],
      sizes: product.sizes ?? [],
      print_areas: product.print_areas ?? [],
    };
  });
}

export function resolveProductKeyFromApiProduct(apiProduct: {
  id?: string | number;
  model?: string;
  productKey?: string;
}): string | undefined {
  if (!apiProduct) return undefined;

  if (apiProduct.productKey) {
    const byProductKey = DTFTA_PRODUCT_BLANKS.find(
      (b) => b.productKey === apiProduct.productKey || b.key === apiProduct.productKey
    );
    if (byProductKey) return byProductKey.key;
  }

  if (apiProduct.model) {
    const byModel = DTFTA_PRODUCT_BLANKS.find(
      (b) => b.model.toLowerCase() === String(apiProduct.model).toLowerCase()
    );
    if (byModel) return byModel.key;
  }

  if (apiProduct.id != null) {
    const byId = DTFTA_PRODUCT_BLANKS.find(
      (b) => String(b.id) === String(apiProduct.id) || b.key === String(apiProduct.id)
    );
    if (byId) return byId.key;
  }

  return undefined;
}

export {
  getDesignAssetUrl,
  PRODUCT_KEY_TO_DESIGN_ASSET_BASE,
  type DesignPlacement,
} from "./design-assets";

export function getPlaceholderImageForApiProduct(apiProduct: {
  id?: string | number;
  model?: string;
  productKey?: string;
}): string | undefined {
  const blank = apiProduct.productKey
    ? DTFTA_PRODUCT_BLANKS.find(
        (b) => b.productKey === apiProduct.productKey || b.key === apiProduct.productKey
      )
    : apiProduct.model
      ? DTFTA_PRODUCT_BLANKS.find(
          (b) => b.model.toLowerCase() === String(apiProduct.model).toLowerCase()
        )
      : apiProduct.id != null
        ? DTFTA_PRODUCT_BLANKS.find(
            (b) => b.key === String(apiProduct.id) || String(b.id) === String(apiProduct.id)
          )
        : undefined;

  return blank?.image;
}