import { useMemo } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useSearchParams } from "react-router";
import { Page, Card, BlockStack, Banner } from "@shopify/polaris";
import ProductMeta from "../components/product-customize/ProductMeta";
import PlacementSelector from "../components/product-customize/PlacementSelector";
import CustomizeCanvasSection from "../components/product-customize/CustomizeCanvasSection";
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
          <Banner tone="critical">{fetcher.data.error}</Banner>
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