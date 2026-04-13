import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../../shopify.server";
import { createExternalApiHeaders } from "../external-api.server";
import {
  getDtftaBlankByKey,
  normalizeDtftaProduct,
  resolveProductKeyFromApiProduct,
} from "../dtfta-products.server";
import { normalizeApiVariants } from "./helpers";
import type {
  CustomizeSubmitResult,
  PrintableAreaPayload,
  ProductWithApiFields,
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

  const fallbackBlank = productKeyParam
    ? getDtftaBlankByKey(productKeyParam)
    : undefined;

  const normalizedSource = apiProduct
    ? {
        ...apiProduct,
        variants: normalizeApiVariants(apiProduct.variants),
      }
    : fallbackBlank;

  const product = normalizeDtftaProduct(normalizedSource);

  return {
    productKey: product?.productKey ?? productKeyParam ?? product?.key ?? "",
    productId: String(product?.id ?? productIdParam ?? productKeyParam ?? ""),
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

function parsePrintableAreas(raw: string): PrintableAreaPayload[] {
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid printableAreas payload");
  }

  return parsed;
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

  const selectedColor = String(formData.get("selectedColor") || "");
  const selectedColorName = String(formData.get("selectedColorName") || "");
  const selectedVariantId = String(formData.get("selectedVariantId") || "");
  const selectedVariantSku = String(formData.get("selectedVariantSku") || "");

  if (!productKey.trim()) {
    return { ok: false, error: "Missing product key" };
  }

  const artworkUrls = collectArtworkUrls(formData);

  let printableAreas: PrintableAreaPayload[] = [];
  try {
    printableAreas = parsePrintableAreas(printableAreasRaw);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid printableAreas payload",
    };
  }

  const API_BASE = process.env.EXTERNAL_API_BASE || "/api";
  const payload = {
    shop,
    productKey,
    productId,
    title,
    printPlan,
    artworkUrls,
    printableAreas,
    selectedColor,
    selectedColorName,
    selectedVariantId,
    selectedVariantSku,
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

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        ok: false,
        error: data.message || data.error || `Request failed: ${res.status}`,
      };
    }

    return {
      ok: true,
      productId: data?.data?.shopify?.product?.id ?? "",
      handle: data?.handle,
    };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}