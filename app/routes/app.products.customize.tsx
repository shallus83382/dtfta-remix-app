import { useMemo } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useSearchParams } from "react-router";
import { Page, Card, BlockStack, Badge, InlineStack, InlineGrid, Text } from "@shopify/polaris";
import ProductMeta from "../components/product-customize/ProductMeta";
import PlacementSelector from "../components/product-customize/PlacementSelector";
import CustomizeCanvasSection from "../components/product-customize/CustomizeCanvasSection";
import ColorSelector from "../components/product-customize/ColorSelector";
import { useProductCustomize } from "../lib/product-customize/useProductCustomize";
import {
  loadCustomizeProduct,
  publishCustomizeProduct,
} from "../lib/product-customize/customize-product.server";

export const loader = async (args: LoaderFunctionArgs) => {
  return loadCustomizeProduct(args);
};

export const action = async (args: ActionFunctionArgs) => {
  return publishCustomizeProduct(args);
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
    selectedColor,
    availableColors,
    selectedPrintArea,
    selectedRegion,
    selectedPrintSize,
    getCanvasStateForPlacement,
    handleCanvasReady,
    handlePrintSizeChange,
    handleRegionChange,
    handlePlacementChange,
    handleColorChange,
    handleAddToStore,
  } = useProductCustomize({
    productKey,
    productName,
    productId: loaderData.productId,
    printAreas,
    variants: product?.variants ?? [],
    defaultColor: product?.variants?.[0]?.colorCode ?? "",
  });

  if (!productKey || !product) {
    return (
      <Page title="Customize product" backAction={{ url: "/app/products", content: "Products" }}>
        <Card>
          <div
            style={{
              borderRadius: 12,
              border: "1px solid #fecaca",
              backgroundColor: "#fff1f2",
              padding: 14,
            }}
          >
            <Text as="p" variant="bodyMd" fontWeight="semibold" tone="critical">
              Product required
            </Text>
            <Text as="p" tone="critical">
              Select a valid product from the Products page and click Customize.
            </Text>
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      fullWidth
      title={`Customize: ${productName}`}
      subtitle={`${product.brand ?? ""} ${product.model ?? ""}`.trim()}
      backAction={{ url: "/app/products", content: "Products" }}
    >
      <BlockStack gap="400">
        {fetcher.data && !fetcher.data.ok ? (
          <Card>
            <div
              style={{
                borderRadius: 12,
                border: "1px solid #fecaca",
                backgroundColor: "#fff1f2",
                padding: 14,
              }}
            >
              <Text as="p" tone="critical">
                {fetcher.data.error}
              </Text>
            </div>
          </Card>
        ) : null}

        <Card>
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(30,41,59,0.96) 0%, rgba(37,99,235,0.9) 55%, rgba(14,116,144,0.88) 100%)",
              borderRadius: 12,
              padding: 20,
              color: "#ffffff",
            }}
          >
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd" tone="text-inverse">
                  Product Customizer Studio
                </Text>
                <InlineStack gap="200" blockAlign="center">
                  <Badge tone="info">Advanced Editor</Badge>
                  <button
                    type="button"
                    onClick={handleAddToStore}
                    disabled={fetcher.state !== "idle"}
                    style={{
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.28)",
                      height: 34,
                      padding: "0 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: fetcher.state !== "idle" ? "not-allowed" : "pointer",
                      transition: "all 180ms ease",
                      backgroundColor: "rgba(255,255,255,0.12)",
                      color: "#ffffff",
                      opacity: fetcher.state !== "idle" ? 0.7 : 1,
                      backdropFilter: "blur(2px)",
                    }}
                  >
                    {fetcher.state !== "idle" ? "Adding..." : "Add to Store"}
                  </button>
                </InlineStack>
              </InlineStack>
              <Text as="p" tone="text-inverse">
                Fine-tune print placement, color variants, and composition before publishing to
                your storefront.
              </Text>
            </BlockStack>
          </div>
        </Card>

        <Card>
          <BlockStack gap="400">
            <ProductMeta product={product} />

            <InlineGrid columns={{ xs: 1, md: 2 }} gap="300">
              <div
                style={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#fcfdff",
                  padding: 12,
                }}
              >
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="p" fontWeight="semibold">Choose Color</Text>
                    <Badge tone="info">Step 1</Badge>
                  </InlineStack>
                  <ColorSelector
                    colors={availableColors}
                    selectedColor={selectedColor}
                    onChange={handleColorChange}
                  />
                </BlockStack>
              </div>

              <div
                style={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#fcfdff",
                  padding: 12,
                }}
              >
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="p" fontWeight="semibold">Choose Placement</Text>
                    <Badge tone="warning">Step 2</Badge>
                  </InlineStack>
                  <PlacementSelector
                    printAreas={printAreas}
                    placement={placement}
                    onChange={handlePlacementChange}
                  />
                </BlockStack>
              </div>
            </InlineGrid>

            <CustomizeCanvasSection
              placement={placement}
              selectedColor={selectedColor}
              selectedPrintArea={selectedPrintArea}
              selectedRegion={selectedRegion}
              selectedPrintSize={selectedPrintSize}
              initialCanvasState={getCanvasStateForPlacement(placement)}
              onCanvasReady={handleCanvasReady}
              onPrintSizeChange={handlePrintSizeChange}
              onRegionChange={handleRegionChange}
            />
          </BlockStack>
        </Card>
        <div style={{ marginBottom: 36 }} />
      </BlockStack>
    </Page>
  );
}