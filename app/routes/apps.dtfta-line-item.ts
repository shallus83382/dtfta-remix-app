import { authenticate } from "../shopify.server";
import { buildDtftaLineItem } from "../lib/build-dtfta-line-item";
import { createExternalApiHeaders } from "../lib/external-api.server";
import type { ActionFunctionArgs } from "react-router";

type TemplateVariant = {
  shopify_variant_id?: string;
  option_values?: Array<{ optionName?: string; name?: string }>;
};

function extractNumericVariantId(id: string) {
  return id.includes("/") ? id.split("/").pop() || id : id;
}

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function matchVariant(
  variants: TemplateVariant[],
  color: string,
  size: string,
) {
  return (
    variants.find((variant) => {
      const values = variant.option_values || [];

      const colorMatch = color
        ? values.some(
            (v) =>
              normalize(v.optionName) === "color" &&
              normalize(v.name) === normalize(color),
          )
        : true;

      const sizeMatch = size
        ? values.some(
            (v) =>
              normalize(v.optionName) === "size" &&
              normalize(v.name) === normalize(size),
          )
        : true;

      return colorMatch && sizeMatch;
    }) || null
  );
}

export async function action({ request }: ActionFunctionArgs) {
  await authenticate.public.appProxy(request);

  const body = await request.json();
  const { customProductId, color, size } = body ?? {};

  if (!customProductId || !color || !size) {
    return Response.json(
      { ok: false, error: "Missing customProductId, color, or size" },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const shop =
    url.searchParams.get("shop") ||
    url.searchParams.get("logged_in_customer_shop_domain") ||
    "";

  if (!shop) {
    return Response.json({ ok: false, error: "Missing shop" }, { status: 400 });
  }

  const API_BASE = process.env.EXTERNAL_API_BASE || "/api";
  const headers = createExternalApiHeaders("", { "X-Shop": shop });

  const res = await fetch(
    `${API_BASE}/custom-products/${encodeURIComponent(String(customProductId))}?shop=${encodeURIComponent(shop)}`,
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

  const matchedVariant = matchVariant(template.variants || [], color, size);

  if (!matchedVariant?.shopify_variant_id) {
    return Response.json(
      { ok: false, error: "No matching Shopify variant found" },
      { status: 404 },
    );
  }

  const properties = buildDtftaLineItem({
    templateId: template.id,
    productKey: template.product_key || "",
    garmentBrand: template.garment_brand || "",
    garmentStyle: template.garment_style || "",
    color,
    size,
    printPlan: template.print_plan || "",
  });

  return Response.json({
    ok: true,
    ajaxVariantId: extractNumericVariantId(
      String(matchedVariant.shopify_variant_id),
    ),
    properties,
  });
}