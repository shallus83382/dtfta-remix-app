import { useMemo, useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useSearchParams } from "react-router";
import {
  Page,
  Card,
  BlockStack,
  Badge,
  InlineStack,
  List,
  Text,
} from "@shopify/polaris";
import CustomizeCanvasSection from "../components/product-customize/CustomizeCanvasSection";
import ColorSelector from "../components/product-customize/ColorSelector";
import ProductMeta from "../components/product-customize/ProductMeta";
import { useProductCustomize } from "../lib/product-customize/useProductCustomize";
import {
  loadCustomizeProduct,
  publishCustomizeProduct,
} from "../lib/product-customize/customize-product.server";
import { normalizePlacementKey } from "../lib/product-customize/helpers";

export const loader = async (args: LoaderFunctionArgs) => {
  return loadCustomizeProduct(args);
};

export const action = async (args: ActionFunctionArgs) => {
  return publishCustomizeProduct(args);
};

type LoaderData = Awaited<ReturnType<typeof loader>>;

export default function ProductCustomize() {
  const [canvasActions, setCanvasActions] = useState<{
    addText: () => void;
    addImage: (file: File) => Promise<void>;
    deleteSelected: () => void;
    clear: () => void;
  } | null>(null);

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
                <Badge tone="info">Advanced Editor</Badge>
              </InlineStack>
              <Text as="p" tone="text-inverse">
                Fine-tune print placement, color variants, and composition before publishing to
                your storefront.
              </Text>
            </BlockStack>
          </div>
        </Card>

        <InlineStack align="start" gap="400" blockAlign="start">
          <div style={{ minWidth: 260, maxWidth: 300, flexShrink: 0 }}>
            <div
              style={{
                borderRadius: 10,
                backgroundColor: "#ffffff",
                padding: 12,
              }}
            >
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingSm">
                    Important product info
                  </Text>
                  <Badge tone="info">Details</Badge>
                </InlineStack>

                <Text as="p" fontWeight="semibold">
                  {productName}
                </Text>
                <Text as="p" tone="subdued">
                  {product.brand} {product.model ? `・${product.model}` : ""}
                </Text>

                <List type="bullet">
                  <List.Item>{availableColors.length} colors available</List.Item>
                  <List.Item>{printAreas.length} print placements</List.Item>
                  <List.Item>Use right panel to configure variants</List.Item>
                </List>
              </BlockStack>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
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
              onRegisterActions={setCanvasActions}
            />
            <div style={{ marginTop: 10 }}>
              <InlineStack align="center" gap="200" blockAlign="center">
                {printAreas.map((area) => {
                  const key = normalizePlacementKey(area.title);
                  const isActive = placement === key;
                  return (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => handlePlacementChange(key)}
                      style={{
                        borderRadius: 999,
                        border: isActive ? "1px solid transparent" : "1px solid #cbd5e1",
                        height: 32,
                        padding: "0 14px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        background: isActive
                          ? "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)"
                          : "#f8fafc",
                        color: isActive ? "#ffffff" : "#0f172a",
                        boxShadow: isActive ? "0 8px 18px rgba(29,78,216,0.28)" : "none",
                        transition: "all 150ms ease",
                      }}
                    >
                      {area.title}
                    </button>
                  );
                })}
              </InlineStack>
            </div>
          </div>

          <div style={{ minWidth: 300, maxWidth: 340, flexShrink: 0 }}>
              <div
                style={{
                  borderRadius: 10,
                  backgroundColor: "#ffffff",
                  padding: 12,
                }}
              >
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h3" variant="headingSm">
                      Variants & options
                    </Text>
                    <Badge tone="success">Step Flow</Badge>
                  </InlineStack>
                  <Text as="p" tone="subdued">
                    {product.brand} {product.model ? `・${product.model}` : ""}
                  </Text>

                  <ProductMeta product={product} />

                  <div>
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="p" fontWeight="semibold">Choose Color</Text>
                      <Badge tone="info">Step 1</Badge>
                    </InlineStack>
                    <div style={{ marginTop: 8 }}>
                      <ColorSelector
                        colors={availableColors}
                        selectedColor={selectedColor}
                        onChange={handleColorChange}
                      />
                    </div>
                  </div>

                  <div>
                    <Text as="p" fontWeight="semibold">
                      Canvas Actions
                    </Text>
                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => canvasActions?.addText()}
                        disabled={!canvasActions}
                        style={{
                          borderRadius: 10,
                          border: "1px solid #cbd5e1",
                          height: 34,
                          padding: "0 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: !canvasActions ? "not-allowed" : "pointer",
                          background: "#ffffff",
                          color: "#0f172a",
                          opacity: !canvasActions ? 0.6 : 1,
                        }}
                      >
                        Add text
                      </button>

                      <label
                        style={{
                          borderRadius: 10,
                          border: "1px solid #cbd5e1",
                          height: 34,
                          padding: "0 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: !canvasActions ? "not-allowed" : "pointer",
                          background: "#ffffff",
                          color: "#0f172a",
                          opacity: !canvasActions ? 0.6 : 1,
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        Add image
                        <input
                          type="file"
                          accept="image/*"
                          disabled={!canvasActions}
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              void canvasActions?.addImage(f);
                            }
                            e.target.value = "";
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => canvasActions?.deleteSelected()}
                        disabled={!canvasActions}
                        style={{
                          borderRadius: 10,
                          border: "1px solid #cbd5e1",
                          height: 34,
                          padding: "0 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: !canvasActions ? "not-allowed" : "pointer",
                          background: "#ffffff",
                          color: "#0f172a",
                          opacity: !canvasActions ? 0.6 : 1,
                        }}
                      >
                        Delete selected
                      </button>

                      <button
                        type="button"
                        onClick={() => canvasActions?.clear()}
                        disabled={!canvasActions}
                        style={{
                          borderRadius: 10,
                          border: "1px solid #cbd5e1",
                          height: 34,
                          padding: "0 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: !canvasActions ? "not-allowed" : "pointer",
                          background: "#ffffff",
                          color: "#0f172a",
                          opacity: !canvasActions ? 0.6 : 1,
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToStore}
                    disabled={fetcher.state !== "idle"}
                    style={{
                      borderRadius: 10,
                      border: "1px solid transparent",
                      height: 38,
                      width: "100%",
                      padding: "0 14px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: fetcher.state !== "idle" ? "not-allowed" : "pointer",
                      transition: "all 180ms ease",
                      background:
                        fetcher.state !== "idle"
                          ? "#cbd5e1"
                          : "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)",
                      color: "#ffffff",
                      boxShadow:
                        fetcher.state !== "idle"
                          ? "none"
                          : "0 8px 18px rgba(29,78,216,0.28)",
                    }}
                  >
                    {fetcher.state !== "idle" ? "Adding..." : "Add to Store"}
                  </button>
                </BlockStack>
              </div>
          </div>
        </InlineStack>
        <div style={{ marginBottom: 36 }} />
      </BlockStack>
    </Page>
  );
}