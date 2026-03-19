import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useSearchParams, useFetcher } from "react-router";
import {
  Page,
  Card,
  BlockStack,
  Text,
  InlineStack,
  Banner,
  Button,
  Badge,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { createExternalApiHeaders } from "../lib/external-api.server";
import {
  getDtftaBlankByKey,
  normalizeDtftaProduct,
  resolveProductKeyFromApiProduct,
  type DtftaPrintArea,
  type DtftaVariant,
} from "../lib/dtfta-products.server";
import { buildPrintPlan } from "../lib/dtfta-design";
import DesignCanvas, {
  exportCanvasToDataUrl,
  type DesignableRegion,
} from "../components/DesignCanvas";
import type { Canvas } from "fabric";
import type { Product } from "../types";

type ProductWithApiFields = Product & {
  productKey?: string;
  colors?: string[];
  sizes?: string[];
  print_areas?: DtftaPrintArea[];
  variants?: DtftaVariant[];
  status?: string;
  description?: string | null;
  images?: string[];
  brandCode?: string;
  style?: string;
  created_at?: string;
  updated_at?: string;
};

const DEFAULT_DESIGN_REGION: DesignableRegion = {
  left: 125,
  top: 125,
  width: 250,
  height: 250,
};

function normalizePlacementKey(value: string): string {
  return value.trim().toLowerCase();
}

function getRegionFromPrintArea(area?: DtftaPrintArea): DesignableRegion {
  if (!area) return DEFAULT_DESIGN_REGION;

  return {
    left: Number(area.position_x || 0),
    top: Number(area.position_y || 0),
    width: Number(area.area_width || 250),
    height: Number(area.area_height || 250),
  };
}

function normalizeApiVariants(input: unknown): DtftaVariant[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item): DtftaVariant | null => {
      if (!item || typeof item !== "object") return null;

      const variant = item as Record<string, unknown>;

      const colorCode =
        typeof variant.colorCode === "string" ? variant.colorCode : "";
      const colorName =
        typeof variant.colorName === "string" ? variant.colorName : "";
      const size = typeof variant.size === "string" ? variant.size : "";
      const sku = typeof variant.sku === "string" ? variant.sku : "";

      if (!colorCode || !colorName || !size || !sku) return null;

      const normalized: DtftaVariant = {
        colorCode,
        colorName,
        size,
        sku,
        is_active:
          typeof variant.is_active === "boolean" ? variant.is_active : true,
      };

      if (typeof variant.id === "number") {
        normalized.id = variant.id;
      }

      return normalized;
    })
    .filter((item): item is DtftaVariant => item !== null);
}

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

  const fallbackBlank = productKeyParam ? getDtftaBlankByKey(productKeyParam) : undefined;

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
  if (request.method !== "POST") return { ok: false, error: "Method not allowed" };

  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const shop = session.shop;

  const productKey = formData.get("productKey") as string;
  const title = (formData.get("title") as string) || undefined;
  const printPlan = (formData.get("printPlan") as string) || "";

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

  const API_BASE = process.env.EXTERNAL_API_BASE || "/api";
  const payload = {
    shop,
    productKey,
    title,
    printPlan,
    artworkUrls,
  };
  const headers = createExternalApiHeaders(payload, { "X-Shop": shop });

  try {
    const res = await fetch(`${API_BASE.replace(/\/$/, "")}/products/create-in-shopify-signed`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        ok: false,
        error: data.message || data.error || `Request failed: ${res.status}`,
      };
    }

    return {
      ok: true,
      productId: data.productId,
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
  const fetcher = useFetcher<{
    ok: boolean;
    error?: string;
    productId?: string;
    handle?: string;
  }>();
  const shopify = useAppBridge();

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

  const defaultPlacement = normalizePlacementKey(printAreas[0]?.title ?? "front");
  const [placement, setPlacement] = useState<string>(defaultPlacement);
  const [canvases, setCanvases] = useState<Record<string, Canvas | null>>({});
  const [printSizes, setPrintSizes] = useState<Record<string, { width: number; height: number }>>(
    {}
  );
  const [regions, setRegions] = useState<Record<string, DesignableRegion>>({});

  useEffect(() => {
    if (!printAreas.length) return;

    const nextPrintSizes: Record<string, { width: number; height: number }> = {};
    const nextRegions: Record<string, DesignableRegion> = {};

    for (const area of printAreas) {
      const key = normalizePlacementKey(area.title);
      nextPrintSizes[key] = {
        width: Number(area.area_width || 250),
        height: Number(area.area_height || 250),
      };
      nextRegions[key] = getRegionFromPrintArea(area);
    }

    setPrintSizes(nextPrintSizes);
    setRegions(nextRegions);
    setPlacement((prev) => prev || normalizePlacementKey(printAreas[0].title));
  }, [printAreas]);

  const selectedPrintArea = useMemo(
    () => printAreas.find((area) => normalizePlacementKey(area.title) === placement),
    [printAreas, placement]
  );

  const selectedRegion = selectedPrintArea
    ? regions[placement] ?? getRegionFromPrintArea(selectedPrintArea)
    : DEFAULT_DESIGN_REGION;

  const selectedPrintSize = selectedPrintArea
    ? printSizes[placement] ?? {
        width: Number(selectedPrintArea.area_width || 250),
        height: Number(selectedPrintArea.area_height || 250),
      }
    : { width: 12, height: 16 };

  const handleCanvasReady = useCallback((placementKey: string, canvas: Canvas) => {
    setCanvases((prev) => {
      if (prev[placementKey] === canvas) return prev;
      return {
        ...prev,
        [placementKey]: canvas,
      };
    });
  }, []);

  const handlePrintSizeChange = useCallback((placementKey: string, w: number, h: number) => {
    setPrintSizes((prev) => {
      const current = prev[placementKey];
      if (current && current.width === w && current.height === h) return prev;
      return {
        ...prev,
        [placementKey]: { width: w, height: h },
      };
    });
  }, []);

  const handleRegionChange = useCallback((placementKey: string, region: DesignableRegion) => {
    setRegions((prev) => {
      const current = prev[placementKey];
      if (
        current &&
        current.left === region.left &&
        current.top === region.top &&
        current.width === region.width &&
        current.height === region.height
      ) {
        return prev;
      }

      return {
        ...prev,
        [placementKey]: region,
      };
    });
  }, []);

  const handleAddToStore = useCallback(() => {
    const printPlan = buildPrintPlan(printSizes);

    const artworkByPlacement = Object.fromEntries(
      Object.entries(canvases)
        .map(([key, canvas]) => [key, exportCanvasToDataUrl(canvas)])
        .filter(([, value]) => Boolean(value))
    ) as Record<string, string>;

    if (!printPlan && Object.keys(artworkByPlacement).length === 0) {
      shopify.toast.show("Add at least one placement (print size or artwork).");
      return;
    }

    const formData = new FormData();
    formData.set("productKey", productKey);
    formData.set("title", `${productName} Custom`);
    formData.set("printPlan", printPlan);

    for (const [key, value] of Object.entries(artworkByPlacement)) {
      formData.set(`artwork_${key}`, value);
    }

    fetcher.submit(formData, { method: "POST" });
  }, [canvases, printSizes, productKey, productName, fetcher, shopify]);

  const successHandled = useRef(false);

  useEffect(() => {
    if (fetcher.data?.ok && fetcher.data.productId && !successHandled.current) {
      successHandled.current = true;
      shopify.toast.show("Product created");
      try {
        shopify.intents.invoke?.("edit:shopify/Product", {
          value: fetcher.data.productId,
        });
      } catch {
        // ignore
      }
    }
  }, [fetcher.data?.ok, fetcher.data?.productId, shopify]);

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
            <InlineStack gap="200" blockAlign="center">
              {product.brand ? <Badge>{product.brand}</Badge> : null}
              {product.colors?.length ? (
                <Text as="span" variant="bodyMd">
                  Colors: {product.colors.join(", ")}
                </Text>
              ) : null}
              {product.sizes?.length ? (
                <Text as="span" variant="bodyMd">
                  Sizes: {product.sizes.join(", ")}
                </Text>
              ) : null}
            </InlineStack>

            <Text as="p" variant="bodyMd">
              Choose a print area below. Each print area uses its own background image from the API.
            </Text>

            <InlineStack gap="200" blockAlign="center">
              {printAreas.map((area) => {
                const key = normalizePlacementKey(area.title);
                return (
                  <Button
                    key={area.id}
                    variant={placement === key ? "primary" : "secondary"}
                    onClick={() => setPlacement(key)}
                  >
                    {area.title}
                  </Button>
                );
              })}
            </InlineStack>

            {selectedPrintArea ? (
              <div
                style={{
                  width: "100%",
                  minWidth: 0,
                  height: "min(75vw, calc(100vh - 220px))",
                  minHeight: 280,
                }}
              >
                {selectedPrintArea.image ? (
                  <DesignCanvas
                    key={placement}
                    label={selectedPrintArea.title}
                    fillWidth
                    onCanvasReady={(canvas) => handleCanvasReady(placement, canvas)}
                    printWidth={selectedPrintSize.width}
                    printHeight={selectedPrintSize.height}
                    onPrintDimensionsChange={(w, h) => handlePrintSizeChange(placement, w, h)}
                    backgroundImageUrl={selectedPrintArea.image}
                    designableRegion={selectedRegion}
                    onDesignableRegionChange={(region) => handleRegionChange(placement, region)}
                  />
                ) : (
                  <Banner tone="warning">
                    No background image found for the selected print area.
                  </Banner>
                )}
              </div>
            ) : (
              <Banner tone="warning">No active print areas found for this product.</Banner>
            )}

            {selectedPrintArea ? (
              <Text as="p" variant="bodySm" tone="subdued">
                Active print area: {selectedPrintArea.title} · {selectedPrintArea.area_width} ×{" "}
                {selectedPrintArea.area_height} {selectedPrintArea.unit}
              </Text>
            ) : null}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}