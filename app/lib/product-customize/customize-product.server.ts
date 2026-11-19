import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../../shopify.server";
import { createExternalApiHeaders } from "../external-api.server";
import { normalizeDtftaProduct, resolveProductKeyFromApiProduct } from "../dtfta-products.server";
import { buildNormalizeInputFromApiProduct } from "../catalog-product";
import { normalizeApiVariants } from "./helpers";
import type {
  CustomizeSubmitResult,
  PrintableAreaPayload,
  ProductWithApiFields,
  ArtworkUrlPayload,
  VariantRetailPrice,
} from "./types";

export async function loadCustomizeProduct({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const productKeyParam = url.searchParams.get("productKey") ?? "";
  const productIdParam = url.searchParams.get("productId") ?? "";

  const API_BASE = process.env.EXTERNAL_API_BASE || "/api";
  const headers = createExternalApiHeaders("", { "X-Shop": shop });

  let apiProduct: ProductWithApiFields | null = null;

  try {
    const res = await fetch(
      `${API_BASE}/products/get?shop_id=${encodeURIComponent(shop)}`,
      { headers }
    );

    const response = await res.json().catch(() => ({}));
    const rawProducts: ProductWithApiFields[] = Array.isArray(response?.data)
      ? response.data
      : [];

    if (rawProducts.length > 0) {
      apiProduct =
        rawProducts.find((p) => String(p.id) === String(productIdParam)) ??
        rawProducts.find((p) => p.productKey === productKeyParam) ??
        rawProducts.find((p) => {
          const resolved = resolveProductKeyFromApiProduct({
            id: p.id,
            model: p.model,
            productKey: p.productKey,
          });
          return resolved === productKeyParam;
        }) ??
        null;
    }
  } catch {
    apiProduct = null;
  }

  const normalizedSource = apiProduct
    ? normalizeDtftaProduct({
        ...buildNormalizeInputFromApiProduct(apiProduct),
        variants: normalizeApiVariants(apiProduct.variants),
      })
    : null;

  const product = normalizedSource;

  return {
    productKey: apiProduct?.productKey ?? productKeyParam ?? product?.productKey ?? product?.key ?? "",
    productId: String(apiProduct?.id ?? productIdParam ?? productKeyParam ?? ""),
    product,
    productName: product?.name ?? "Product",
  };
}

function collectArtworkUrls(formData: FormData) {
  const artworkUrls: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("artwork_")) continue;
    const placement = key.replace("artwork_", "");

    if (typeof value === "string" && value.trim()) {
      artworkUrls[placement] = value;
    }
  }

  return artworkUrls;
}

function parseArtworkUrlsPayload(raw: string): Record<string, ArtworkUrlPayload> {
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid artworkUrls payload");
  }
  return parsed as Record<string, ArtworkUrlPayload>;
}

function parsePrintableAreas(raw: string): PrintableAreaPayload[] {
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid printableAreas payload");
  }

  return parsed;
}

function parseVariantRetailPrices(raw: string): VariantRetailPrice[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid variantPrices payload");
  }

  return parsed.map((item): VariantRetailPrice => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("Invalid variantPrices entry");
    }

    const entry = item as Record<string, unknown>;
    if (typeof entry.sku !== "string" || typeof entry.price !== "string") {
      throw new Error("Each variant price requires a SKU and price");
    }

    return { sku: entry.sku, price: entry.price };
  });
}

function attachArtworkToPrintableAreas({
  printableAreas,
  flatArtworkUrls,
  artworkUrlsPayload,
  selectedColor,
}: {
  printableAreas: PrintableAreaPayload[];
  flatArtworkUrls: Record<string, string>;
  artworkUrlsPayload: Record<string, ArtworkUrlPayload>;
  selectedColor: string;
}): PrintableAreaPayload[] {
  return printableAreas.map((area) => {
    const colorPlacementKey = `${selectedColor}_${area.placement}`;
    const fallbackPlacementKey = area.placement;
    const payloadArtwork = artworkUrlsPayload[colorPlacementKey]?.artworkUrl ?? "";
    const artwork =
      payloadArtwork ||
      (flatArtworkUrls[colorPlacementKey] ??
        flatArtworkUrls[fallbackPlacementKey] ??
        area.artwork ??
        "");

    const payloadRegion = artworkUrlsPayload[colorPlacementKey]?.designableRegion;
    const payloadPrintSize = artworkUrlsPayload[colorPlacementKey]?.printSize;

    return {
      ...area,
      artwork,
      designableRegion: payloadRegion ?? area.designableRegion,
      printSize: payloadPrintSize ?? area.printSize,
    };
  });
}

function stripPrintableAreaArtwork(printableAreas: PrintableAreaPayload[]): PrintableAreaPayload[] {
  return printableAreas.map((area) => ({
    ...area,
    artwork: "",
  }));
}

export async function publishCustomizeProduct({
  request,
}: ActionFunctionArgs): Promise<CustomizeSubmitResult> {
  if (request.method !== "POST") {
    return { ok: false, error: "Method not allowed" };
  }

  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const shop = session.shop;

  const productKey = String(formData.get("productKey") || "");
  const title = String(formData.get("title") || "") || undefined;
  const productId = String(formData.get("productId") || "");
  const printPlan = String(formData.get("printPlan") || "");
  const printableAreasRaw = String(formData.get("printableAreas") || "[]");
  const artworkUrlsRaw = String(formData.get("artworkUrls") || "{}");
  const variantPricesRaw = formData.get("variantPrices");

  const selectedColor = String(formData.get("selectedColor") || "");

  if (!productKey.trim()) {
    return { ok: false, error: "Missing product key" };
  }

  const flatArtworkUrls = collectArtworkUrls(formData);

  let printableAreas: PrintableAreaPayload[] = [];
  let artworkUrlsPayload: Record<string, ArtworkUrlPayload> = {};
  let variantPrices: VariantRetailPrice[] | undefined;
  try {
    printableAreas = parsePrintableAreas(printableAreasRaw);
    artworkUrlsPayload = parseArtworkUrlsPayload(artworkUrlsRaw);
    if (typeof variantPricesRaw === "string") {
      variantPrices = parseVariantRetailPrices(variantPricesRaw);
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid customize payload",
    };
  }

  const printableAreasWithArtwork = attachArtworkToPrintableAreas({
    printableAreas,
    flatArtworkUrls,
    artworkUrlsPayload,
    selectedColor,
  });
  const printableAreasWithoutArtwork = stripPrintableAreaArtwork(printableAreasWithArtwork);

  const API_BASE = process.env.EXTERNAL_API_BASE || "/api";
  const payload = {
    shop,
    productKey,
    productId,
    title,
    printPlan,
    artworkUrls: artworkUrlsPayload,
    printableAreas: printableAreasWithoutArtwork,
    selectedColor,
    selectedColorName: "",
    ...(variantPrices !== undefined ? { variantPrices } : {}),
    selectedVariantId: "",
    selectedVariantSku: "",
  };

  const headers = createExternalApiHeaders(payload, { "X-Shop": shop });

  try {
    const res = await fetch(
      `${API_BASE.replace(/\/$/, "")}/products/create-in-shopify-signed`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      }
    );

    const rawBody = await res.text();
    let data: Record<string, unknown> | null = null;
    try {
      data = rawBody.trim() ? (JSON.parse(rawBody) as Record<string, unknown>) : null;
    } catch {
      data = null;
    }

    if (!res.ok || !data || data.success !== true) {
      const message = typeof data?.message === "string" ? data.message.trim() : "";
      const detail = typeof data?.error === "string" ? data.error.trim() : "";
      let errorMessage =
        [message, detail].filter((part, index, parts) => part && parts.indexOf(part) === index).join("\n") ||
        (!data
          ? "The product was not created. The upload was rejected because the design images were too large."
          : `Request failed: ${res.status}`);
      const errors = data?.errors;
      if (errors && typeof errors === "object" && !Array.isArray(errors)) {
        const parts = Object.entries(errors as Record<string, unknown>).map(([key, val]) => {
          const msg = Array.isArray(val) ? val.join(" ") : String(val);
          return `${key}: ${msg}`;
        });
        if (parts.length) {
          errorMessage = `${errorMessage} — ${parts.join("; ")}`;
        }
      }
      return {
        ok: false,
        error: errorMessage,
      };
    }

    const responseData = data.data;
    const shopifyData =
      responseData && typeof responseData === "object"
        ? (responseData as { shopify?: { product?: { id?: string } }; product?: { id?: string } })
        : undefined;

    return {
      ok: true,
      productId:
        shopifyData?.shopify?.product?.id ??
        shopifyData?.product?.id ??
        "",
      productKey,
      handle: typeof data.handle === "string" ? data.handle : undefined,
    };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}
