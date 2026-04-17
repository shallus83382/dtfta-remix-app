import { useState } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import {
  Page,
  Card,
  BlockStack,
  Text,
  InlineGrid,
  List,
  InlineStack,
  Badge,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { createExternalApiHeaders } from "../lib/external-api.server";
import {
  resolveProductKeyFromApiProduct,
  getPlaceholderImageForApiProduct,
  getPlaceholderProducts,
  normalizeDtftaProduct,
} from "../lib/dtfta-products.server";
import ProductCard from "../common/ProductCard";
import type { Product } from "../types";
import {getProductDesignAssetUrl} from "../lib/design-assets";

export type ProductWithKey = Product & {
  productKey?: string;
  colors?: string[];
  sizes?: string[];
  print_areas?: Array<{
    id: number;
    title: string;
    area_width: string;
    area_height: string;
    unit: string;
    position_x: string;
    position_y: string;
    tshirt_size: string;
    display_order: number;
    is_active: boolean;
    image: string;
  }>;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const API_BASE = process.env.EXTERNAL_API_BASE || "/api";
  const headers = createExternalApiHeaders("", { "X-Shop": shop });

  try {
    const res = await fetch(
      `${API_BASE}/products/get?shop_id=${encodeURIComponent(shop)}`,
      { headers }
    );
    const response = await res.json().catch(() => ({}));

    const rawProducts: Product[] = Array.isArray(response?.data) ? response.data : [];

    if (rawProducts.length === 0) {
      return { products: getPlaceholderProducts() as ProductWithKey[] };
    }

    const products: ProductWithKey[] = rawProducts.map((p) => {
      const apiProductKey = (p as ProductWithKey).productKey?.trim();

      const normalized = normalizeDtftaProduct({
        id: p.id,
        productKey: apiProductKey,
        key: apiProductKey ?? String(p.id ?? ""),
        name: p.name,
        category: p.category,
        brandCode: (p as ProductWithKey & { brandCode?: string }).brandCode ?? "",
        brand: p.brand,
        style: (p as ProductWithKey & { style?: string }).style ?? p.model ?? "",
        model: p.model ?? "",
        image: p.image,
        images: (p as ProductWithKey & { images?: string[] }).images,
        description: (p as ProductWithKey & { description?: string | null }).description ?? null,
        status: (p as ProductWithKey & { status?: string }).status ?? "active",
        price: p.price ?? 0,
        currency: p.currency ?? "USD",
        colors: (p as ProductWithKey).colors,
        sizes: (p as ProductWithKey).sizes,
        variants: ((p as ProductWithKey & { variants?: any[] }).variants ?? []) as any[],
        print_areas: (p as ProductWithKey).print_areas,
        created_at: (p as ProductWithKey & { created_at?: string }).created_at,
        updated_at: (p as ProductWithKey & { updated_at?: string }).updated_at,
      });

      const productKey =
        apiProductKey ||
        normalized?.productKey ||
        normalized?.key ||
        resolveProductKeyFromApiProduct({
          id: p.id,
          model: p.model,
          productKey: apiProductKey,
        });

      const placeholderImage = getPlaceholderImageForApiProduct({
        id: String(p.id ?? ""),
        model: p.model,
        productKey: apiProductKey,
      });

      return {
        ...p,
        productKey: productKey ?? undefined,
        image: p.image?.trim() ? getProductDesignAssetUrl(p.image) : placeholderImage ?? p.image,
        colors: normalized?.colors ?? (p as ProductWithKey).colors ?? [],
        sizes: normalized?.sizes ?? (p as ProductWithKey).sizes ?? [],
        print_areas: normalized?.print_areas ?? (p as ProductWithKey).print_areas ?? [],
      };
    });

    return { products };
  } catch {
    return { products: getPlaceholderProducts() as ProductWithKey[] };
  }
};

export default function ProductsIndex() {
  const loaderData = useLoaderData<typeof loader>();
  const [products, setProducts] = useState<ProductWithKey[]>(loaderData.products || []);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const navigate = useNavigate();

  const selectedProductData = selectedProduct
    ? products.find((p) => String(p.id) === selectedProduct)
    : null;
  const hasProducts = products.length > 0;
  const fillerTileCount = Math.max(0, 4 - products.length);

  const surfaceStyle = {
    borderRadius: 14,
    border: "1px solid #d7e0ea",
    background: "linear-gradient(180deg, rgba(248,250,252,0.92) 0%, #ffffff 100%)",
    padding: 16,
    boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
  };

  const primaryButtonStyle = {
    borderRadius: 10,
    border: "1px solid transparent",
    height: 38,
    width: "100%",
    padding: "0 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms ease",
    background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)",
    color: "#ffffff",
    boxShadow: "0 8px 18px rgba(29,78,216,0.28)",
  } as const;

  const secondaryButtonStyle = {
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    height: 36,
    padding: "0 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms ease",
    backgroundColor: "#f8fafc",
    color: "#0f172a",
  } as const;

  return (
    <Page title="DTFTA Products" fullWidth>
      <BlockStack gap="500">
        <Card>
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(17,24,39,1) 0%, rgba(30,58,138,0.96) 58%, rgba(14,116,144,0.92) 100%)",
              borderRadius: 12,
              padding: 24,
              color: "#ffffff",
            }}
          >
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="start">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingLg" tone="text-inverse">
                    DTFTA Product Catalog
                  </Text>
                  <Text as="p" tone="text-inverse">
                    Browse, shortlist, and customize top print-on-demand products with a clean
                    production-ready workflow.
                  </Text>
                </BlockStack>
                <Badge tone="info">Advanced Catalog</Badge>
              </InlineStack>

              <InlineStack gap="200">
                <button type="button" style={secondaryButtonStyle}>
                  Available: {products.length}
                </button>
                <button type="button" style={secondaryButtonStyle}>
                  Favorites: {products.filter((p) => p.isFavorite).length}
                </button>
              </InlineStack>
            </BlockStack>
          </div>
        </Card>

        <InlineStack align="start" gap="500" blockAlign="start">
        <div style={{ flex: "1", minWidth: 0 }}>
          <Card>
            <BlockStack gap="500">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Available Products
                    </Text>
                    <Badge tone="info">Curated</Badge>
                  </InlineStack>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Click any card to preview details and quickly begin customization.
                  </Text>
                </BlockStack>
              </InlineStack>

              {hasProducts ? (
                <div style={surfaceStyle}>
                  {selectedProductData ? (
                    <div
                      style={{
                        borderRadius: 12,
                        border: "1px solid #dbe7ff",
                        background:
                          "linear-gradient(135deg, rgba(239,246,255,0.9) 0%, rgba(255,255,255,1) 100%)",
                        padding: 12,
                        marginBottom: 16,
                      }}
                    >
                      <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="050">
                          <Text as="p" variant="bodySm" tone="subdued">
                            Selected Product
                          </Text>
                          <Text as="p" fontWeight="semibold">
                            {selectedProductData.name}
                          </Text>
                        </BlockStack>
                        <Badge tone="info">Ready to customize</Badge>
                      </InlineStack>
                    </div>
                  ) : null}

                  <InlineGrid columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} gap="400">
                    {products.map((product) => (
                      <ProductCard
                        key={String(product.id)}
                        product={product}
                        onToggleFavorite={(pid) => {
                          setProducts((prev) =>
                            prev.map((p) =>
                              String(p.id) === String(pid)
                                ? { ...p, isFavorite: !p.isFavorite }
                                : p
                            )
                          );
                        }}
                        onClick={(productId) => setSelectedProduct(String(productId))}
                        isSelected={selectedProduct === String(product.id)}
                        showFavorite={true}
                        variant="default"
                      />
                    ))}

                    {Array.from({ length: fillerTileCount }).map((_, index) => (
                      <div
                        key={`filler-${index}`}
                        style={{
                          borderRadius: 12,
                          border: "1px dashed #cbd5e1",
                          backgroundColor: "#f8fafc",
                          minHeight: 220,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 16,
                        }}
                      >
                        <BlockStack gap="100" inlineAlign="center">
                          <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                            More styles coming soon
                          </Text>
                          <Badge tone="attention">Catalog expanding</Badge>
                        </BlockStack>
                      </div>
                    ))}
                  </InlineGrid>
                </div>
              ) : (
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px dashed #cbd5e1",
                    backgroundColor: "#f8fafc",
                    padding: 22,
                  }}
                >
                  <BlockStack gap="100" align="center">
                    <Text as="p" variant="bodyMd" alignment="center">
                      No products available at the moment.
                    </Text>
                    <Text as="p" tone="subdued" alignment="center">
                      Products will appear here after catalog sync completes.
                    </Text>
                  </BlockStack>
                </div>
              )}
            </BlockStack>
          </Card>
        </div>

        <div style={{ minWidth: "280px", maxWidth: "320px", flexShrink: 0 }}>
          <Card>
            <div style={surfaceStyle}>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Product Information
                  </Text>
                  <Badge tone="success">On-demand</Badge>
                </InlineStack>

                <Text as="p" variant="bodyMd">
                  Products are made-to-order after purchase, so there is no inventory overhead.
                </Text>

                <List type="bullet">
                  <List.Item>Full customization support</List.Item>
                  <List.Item>White-label fulfillment</List.Item>
                  <List.Item>US-based shipping</List.Item>
                  <List.Item>Quality guaranteed</List.Item>
                </List>

                {selectedProductData ? (
                  <div
                    style={{
                      borderRadius: 10,
                      border: "1px solid #dbe7ff",
                      background:
                        "linear-gradient(135deg, rgba(239,246,255,0.95) 0%, rgba(255,255,255,1) 100%)",
                      padding: "10px 12px",
                    }}
                  >
                    <Text as="p" variant="bodySm" tone="subdued">
                      Selected product
                    </Text>
                    <Text as="p" fontWeight="semibold">
                      {selectedProductData.name}
                    </Text>
                  </div>
                ) : (
                  <Text as="p" variant="bodySm" tone="subdued">
                    Select a product card to enable quick customization.
                  </Text>
                )}

                {selectedProductData ? (
                  <button
                    type="button"
                    style={primaryButtonStyle}
                    onClick={() => {
                      const productKey =
                        selectedProductData.productKey ?? String(selectedProductData.id);

                      navigate(
                        `/app/products/customize?productId=${encodeURIComponent(
                          String(selectedProductData.id)
                        )}&productKey=${encodeURIComponent(productKey)}`
                      );
                    }}
                  >
                    Customize and Add to Store
                  </button>
                ) : (
                  <button type="button" style={secondaryButtonStyle} disabled>
                    Choose a Product to Continue
                  </button>
                )}
              </BlockStack>
            </div>
          </Card>
        </div>
        </InlineStack>
        <div style={{ marginBottom: 32 }} />
      </BlockStack>
    </Page>
  );
}