import { useMemo } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useSearchParams } from "react-router";
import { Page, Card, BlockStack, Banner } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { createExternalApiHeaders } from "../lib/external-api.server";
import {
  getDtftaBlankByKey,
  normalizeDtftaProduct,
  resolveProductKeyFromApiProduct,
} from "../lib/dtfta-products.server";
import { normalizeApiVariants } from "../lib/product-customize/helpers";
import type {
  ProductWithApiFields,
  PrintableAreaPayload,
} from "../lib/product-customize/types";
import { useProductCustomize } from "../lib/product-customize/useProductCustomize";
import ProductMeta from "../components/product-customize/ProductMeta";
import PlacementSelector from "../components/product-customize/PlacementSelector";
import CustomizeCanvasSection from "../components/product-customize/CustomizeCanvasSection";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const productKeyParam =
    url.searchParams.get("productKey") ?? url.searchParams.get("productId") ?? "";
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
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return { ok: false, error: "Method not allowed" };
  }

  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const shop = session.shop;

  const productKey = formData.get("productKey") as string;
  const title = (formData.get("title") as string) || undefined;
  const productId = formData.get("productId") as string;
  const printPlan = (formData.get("printPlan") as string) || "";
  const printableAreasRaw = (formData.get("printableAreas") as string) || "[]";

  if (!productKey?.trim()) {
    return { ok: false, error: "Missing product key" };
  }

  const artworkUrls: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("artwork_")) continue;
    const placement = key.replace("artwork_", "");
    if (typeof value === "string" && value.trim()) {
      artworkUrls[placement] = value;
    }
  }

  let printableAreas: PrintableAreaPayload[] = [];

  try {
    const parsed = JSON.parse(printableAreasRaw);
    if (Array.isArray(parsed)) {
      printableAreas = parsed;
    }
  } catch {
    return { ok: false, error: "Invalid printableAreas payload" };
  }

  const API_BASE = process.env.EXTERNAL_API_BASE || "/api";
  const payload = {
    shop,
    productKey,
    productId,
    title,
    printPlan,
    artworkUrls,
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
    
    //console.log(data.data.shopify.product.id);

    return {
      ok: true,
      productId: data.data.shopify.product.id,
      handle: data.handle,
    };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
};

type LoaderData = Awaited<ReturnType<typeof loader>>;

export default function ProductCustomize() {
  const loaderData = useLoaderData<LoaderData>();
  const [searchParams] = useSearchParams();

  const productKey =
    loaderData.productKey ||
    searchParams.get("productKey") ||
    searchParams.get("productId") ||
    "";

  const product = loaderData.product;
  const productName = loaderData.productName;

  const printAreas = useMemo(
    () =>
      (product?.print_areas ?? [])
        .filter((area) => area.is_active)
        .sort((a, b) => a.display_order - b.display_order),
    [product]
  );

  const {
    fetcher,
    placement,
    selectedPrintArea,
    selectedRegion,
    selectedPrintSize,
    canvasStateByPlacement,
    handleCanvasReady,
    handlePrintSizeChange,
    handleRegionChange,
    handlePlacementChange,
    handleAddToStore,
  } = useProductCustomize({
    productKey,
    productName,
    productId: loaderData.productId,
    printAreas,
  });

  if (!productKey || !product) {
    return (
      <Page title="Customize product" backAction={{ url: "/app/products", content: "Products" }}>
        <Banner tone="critical" title="Product required">
          Select a valid product from the Products page and click Customize.
        </Banner>
      </Page>
    );
  }

  return (
    <Page
      fullWidth
      title={`Customize: ${productName}`}
      subtitle={`${product.brand ?? ""} ${product.model ?? ""}`.trim()}
      backAction={{ url: "/app/products", content: "Products" }}
      primaryAction={{
        content: "Add to store",
        loading: fetcher.state !== "idle",
        onAction: handleAddToStore,
      }}
    >
      <BlockStack gap="400">
        {fetcher.data && !fetcher.data.ok && (
          <Banner tone="critical" onDismiss={() => {}}>
            {fetcher.data.error}
          </Banner>
        )}

        <Card>
          <BlockStack gap="400">
            <ProductMeta product={product} />

            <PlacementSelector
              printAreas={printAreas}
              placement={placement}
              onChange={handlePlacementChange}
            />

            <CustomizeCanvasSection
              placement={placement}
              selectedPrintArea={selectedPrintArea}
              selectedRegion={selectedRegion}
              selectedPrintSize={selectedPrintSize}
              initialCanvasState={canvasStateByPlacement[placement]}
              onCanvasReady={handleCanvasReady}
              onPrintSizeChange={handlePrintSizeChange}
              onRegionChange={handleRegionChange}
            />
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}