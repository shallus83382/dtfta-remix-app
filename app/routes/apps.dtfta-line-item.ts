import { authenticate } from "../shopify.server";
import { buildDtftaLineItem } from "../lib/build-dtfta-line-item";
import { createExternalApiHeaders } from "../lib/external-api.server";
import type { ActionFunctionArgs } from "react-router";

type VariantOption = {
  optionName?: string;
  name?: string;
};

type VariantDtfta = {
  templateId?: string;
  productKey?: string;
  garmentBrand?: string;
  garmentStyle?: string;
  color?: string;
  size?: string;
  printPlan?: string;
};

type TemplateVariant = {
  id?: string | number;
  sku?: string;
  shopify_variant_id?: string;
  option_values?: VariantOption[];
  dtfta?: VariantDtfta;
};

function extractNumericVariantId(id: string) {
  return id.includes("/") ? id.split("/").pop() || id : id;
}

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function matchVariantBySku(variants: TemplateVariant[], sku: string) {
  const normalizedSku = normalize(sku);
  if (!normalizedSku) return null;

  return variants.find((variant) => normalize(variant.sku) === normalizedSku) || null;
}

function matchVariantByShopifyVariantId(
  variants: TemplateVariant[],
  ajaxVariantId: string,
) {
  const normalizedVariantId = normalize(ajaxVariantId);
  if (!normalizedVariantId) return null;

  return (
    variants.find((variant) => {
      const shopifyVariantId = extractNumericVariantId(
        String(variant.shopify_variant_id || ""),
      );

      return normalize(shopifyVariantId) === normalizedVariantId;
    }) || null
  );
}

function getOptionValue(
  optionValues: VariantOption[] | undefined,
  optionName: string,
) {
  return (
    optionValues?.find(
      (option) => normalize(option.optionName) === normalize(optionName),
    )?.name || ""
  );
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    try {
      await authenticate.public.appProxy(request);
    } catch (authError) {
      console.error("[dtfta-line-item] App proxy auth failed", authError);
      return Response.json(
        {
          ok: false,
          error:
            "App proxy authentication failed. Make sure the storefront request is being signed by Shopify (open the storefront via the dev preview URL, not directly).",
        },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { customProductId, sku, ajaxVariantId } = body ?? {};

    if (!customProductId || !sku) {
      return Response.json(
        { ok: false, error: "Missing customProductId or sku" },
        { status: 400 },
      );
    }

    const url = new URL(request.url);
    const shop =
      url.searchParams.get("shop") ||
      url.searchParams.get("logged_in_customer_shop_domain") ||
      body?.shop ||
      "";

    if (!shop) {
      return Response.json(
        { ok: false, error: "Missing shop" },
        { status: 400 },
      );
    }

    const API_BASE = process.env.EXTERNAL_API_BASE || "/api";
    const headers = createExternalApiHeaders("", { "X-Shop": shop });
    const apiUrl = `${API_BASE}/custom-products/${encodeURIComponent(
      String(customProductId),
    )}?shop=${encodeURIComponent(shop)}`;

    console.log("[dtfta-line-item] Fetching custom product", {
      shop,
      customProductId,
      sku,
      ajaxVariantId,
      apiUrl,
    });

    let res: Response;
    try {
      res = await fetch(apiUrl, { headers });
    } catch (fetchError) {
      console.error(
        "[dtfta-line-item] Failed to reach external API",
        fetchError,
      );
      return Response.json(
        {
          ok: false,
          error: `Unable to reach external API at ${API_BASE}. ${
            fetchError instanceof Error ? fetchError.message : String(fetchError)
          }`,
        },
        { status: 502 },
      );
    }

    const rawText = await res.text();
    let apiData: { data?: unknown; message?: string } = {};
    try {
      apiData = rawText ? JSON.parse(rawText) : {};
    } catch {
      console.error(
        "[dtfta-line-item] External API returned non-JSON",
        res.status,
        rawText.slice(0, 500),
      );
    }
    const template = (apiData as { data?: any })?.data;

    if (!res.ok || !template) {
      console.error("[dtfta-line-item] External API error", {
        status: res.status,
        body: rawText.slice(0, 500),
      });
      return Response.json(
        {
          ok: false,
          error:
            apiData?.message ||
            `Custom product not found (external API responded ${res.status}).`,
        },
        { status: 404 },
      );
    }

    const variants: TemplateVariant[] = Array.isArray(template.variants)
      ? template.variants
      : [];

    let matchedVariant = matchVariantBySku(variants, String(sku));

    if (!matchedVariant && ajaxVariantId) {
      matchedVariant = matchVariantByShopifyVariantId(
        variants,
        String(ajaxVariantId),
      );
    }

    if (!matchedVariant?.shopify_variant_id) {
      console.error("[dtfta-line-item] No matching variant", {
        sku,
        ajaxVariantId,
        variantSkus: variants.map((v) => v.sku),
      });
      return Response.json(
        {
          ok: false,
          error: `No matching Shopify variant found for SKU "${sku}".`,
        },
        { status: 404 },
      );
    }

    const variantDtfta = matchedVariant.dtfta || {};
    const optionValues = matchedVariant.option_values || [];

    const color =
      variantDtfta.color || getOptionValue(optionValues, "Color");

    const size =
      variantDtfta.size || getOptionValue(optionValues, "Size");

    const properties = buildDtftaLineItem({
      templateId: variantDtfta.templateId || String(template.id || ""),
      productKey: variantDtfta.productKey || template.product_key || "",
      garmentBrand: variantDtfta.garmentBrand || template.garment_brand || "",
      garmentStyle: variantDtfta.garmentStyle || template.garment_style || "",
      color,
      size,
      printPlan: variantDtfta.printPlan || template.print_plan || "",
      artworksByPlacement: template.artworks_by_placement || {},
    });

    return Response.json({
      ok: true,
      ajaxVariantId: extractNumericVariantId(
        String(matchedVariant.shopify_variant_id),
      ),
      matchedVariant,
      properties: {
        ...properties,
      },
    });
  } catch (error) {
    console.error("[dtfta-line-item] Unhandled error", error);
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? `Server error: ${error.message}`
            : "Unknown server error while building POD cart data.",
      },
      { status: 500 },
    );
  }
}