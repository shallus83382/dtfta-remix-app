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
  await authenticate.public.appProxy(request);

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
    return Response.json({ ok: false, error: "Missing shop" }, { status: 400 });
  }

  const API_BASE = process.env.EXTERNAL_API_BASE || "/api";
  const headers = createExternalApiHeaders("", { "X-Shop": shop });

  const res = await fetch(
    `${API_BASE}/custom-products/${encodeURIComponent(
      String(customProductId),
    )}?shop=${encodeURIComponent(shop)}`,
    { headers },
  );

  const apiData = await res.json().catch(() => ({}));
  const template = apiData?.data;

  if (!res.ok || !template) {
    return Response.json(
      { ok: false, error: apiData?.message || "Custom product not found" },
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
    return Response.json(
      {
        ok: false,
        error: "No matching Shopify variant found for provided SKU",
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
  //    dtfta_template_id: String(variantDtfta.templateId || template.id || ""),
  //    dtfta_sku: String(matchedVariant.sku || sku || ""),
    },
  });
}