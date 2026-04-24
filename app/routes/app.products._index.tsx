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
import AppHeroBanner from "../common/AppHeroBanner";
import type { Product } from "../types";
import {getProductDesignAssetUrl} from "../lib/design-assets";
import { brandPalette } from "../lib/brand-theme";

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
    height: 36,
    padding: "0 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 200ms ease",
    transform: "translateY(0)",
    background: "linear-gradient(135deg, #ff7a00 0%, #ff4da6 100%)",
    color: "#ffffff",
    boxShadow: "0 10px 20px rgba(246,98,110,0.32)",
  } as const;

  const secondaryButtonStyle = {
    borderRadius: 10,
    border: "1px solid transparent",
    height: 36,
    padding: "0 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 200ms ease",
    transform: "translateY(0)",
    background: "linear-gradient(135deg, #ff7a00 0%, #ff4da6 100%)",
    color: "#ffffff",
    boxShadow: "0 10px 20px rgba(246,98,110,0.28)",
  } as const;

  const sidebarSurfaceStyle = {
    position: "relative" as const,
    overflow: "hidden" as const,
    borderRadius: 14,
    border: "1px solid rgba(71,176,161,0.31)",
    background: "linear-gradient(145deg, #ffffff 0%, rgba(71,176,161,0.10) 100%)",
    padding: 16,
    boxShadow: "0 14px 30px rgba(15,23,42,0.1)",
  };

  return (
    <Page fullWidth>
      <style>
        {`
          .products-sidebar-btn {
            position: relative;
            overflow: hidden;
          }
          .products-sidebar-btn::after {
            content: "";
            position: absolute;
            top: 0;
            left: -38%;
            width: 30%;
            height: 100%;
            background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.42) 50%, rgba(255,255,255,0) 100%);
            transform: skewX(-18deg);
            transition: transform 520ms ease;
            pointer-events: none;
          }
          .products-sidebar-btn:hover {
            transform: translateY(-2px);
            filter: saturate(1.08) brightness(1.03);
          }
          .products-sidebar-btn:hover::after {
            transform: translateX(420%) skewX(-18deg);
          }

          @keyframes dtfta-filler-aurora {
            0%, 100% { transform: translate(-4%, -3%) scale(1); opacity: 0.55; }
            50% { transform: translate(5%, 4%) scale(1.06); opacity: 0.82; }
          }
          .dtfta-filler-card {
            position: relative;
            isolation: isolate;
            transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1),
              box-shadow 280ms ease,
              border-color 280ms ease;
          }
          .dtfta-filler-card:hover {
            transform: translateY(-3px);
            border-color: rgba(71, 176, 161, 0.35);
            box-shadow: 0 16px 32px rgba(15, 23, 42, 0.09);
          }
          .dtfta-filler-aurora {
            position: absolute;
            inset: -45%;
            background:
              radial-gradient(ellipse 55% 45% at 28% 22%, rgba(255, 122, 0, 0.16) 0%, transparent 55%),
              radial-gradient(ellipse 50% 48% at 72% 78%, rgba(255, 77, 166, 0.14) 0%, transparent 52%),
              radial-gradient(ellipse 45% 40% at 82% 28%, rgba(71, 176, 161, 0.13) 0%, transparent 50%);
            animation: dtfta-filler-aurora 10s ease-in-out infinite;
            pointer-events: none;
            z-index: 0;
          }
          .dtfta-filler-mesh {
            position: absolute;
            inset: 0;
            border-radius: 14px;
            opacity: 0.18;
            background-image: radial-gradient(circle at center, #94a3b8 0.9px, transparent 1px);
            background-size: 18px 18px;
            pointer-events: none;
            z-index: 0;
            mask-image: linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 55%, rgba(0,0,0,0.45) 100%);
          }
          .dtfta-filler-body {
            position: relative;
            z-index: 2;
            width: 100%;
          }
        `}
      </style>
      <div style={{ maxWidth: 1420, margin: "0 auto", width: "100%" }}>
      <BlockStack gap="500">
        <AppHeroBanner
          title="DTFTA Product Catalog"
          subtitle="Browse, shortlist, and customize top print-on-demand products with a clean production-ready workflow."
          badges={<Badge tone="info">Advanced Catalog</Badge>}
          actions={
            <>
              <button type="button" style={secondaryButtonStyle}>
                Available: {products.length}
              </button>
              <button type="button" style={secondaryButtonStyle}>
                Favorites: {products.filter((p) => p.isFavorite).length}
              </button>
            </>
          }
        />

        <InlineStack align="start" gap="500" blockAlign="start">
        <div style={{ flex: "1", minWidth: 0 }}>
          <BlockStack gap="500">
              <InlineStack align="space-between" blockAlign="center">
                <div
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    width: "100%",
                    borderRadius: 14,
                    border: "1px solid #dbe4f4",
                    background: "#ffffff",
                    padding: "12px 14px",
                    boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: -24,
                      right: -12,
                      width: 90,
                      height: 90,
                      borderRadius: "50%",
                      background: "radial-gradient(circle, rgba(127,115,239,0.24) 0%, rgba(127,115,239,0) 72%)",
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: -28,
                      left: -14,
                      width: 96,
                      height: 96,
                      borderRadius: "50%",
                      background: "radial-gradient(circle, rgba(31,151,221,0.2) 0%, rgba(31,151,221,0) 72%)",
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      position: "relative",
                      display: "inline-flex",
                      flexDirection: "column",
                      gap: 8,
                      borderLeft: "4px solid #7f73ef",
                      paddingLeft: 10,
                    }}
                  >
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="h2" variant="headingMd">
                        Available Products
                      </Text>
                      <Badge tone="info">Curated</Badge>
                    </InlineStack>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Click any card to preview details and quickly begin customization.
                    </Text>
                  </div>
                </div>
              </InlineStack>

              {hasProducts ? (
                <>
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

                  <div style={{ marginTop: 10 }}>
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
                          className="dtfta-filler-card"
                          style={{
                            overflow: "hidden",
                            borderRadius: 14,
                            border: "1px solid #dbe3ec",
                            background: `linear-gradient(165deg, #ffffff 0%, #f8fbff 50%, rgba(255, 122, 0, 0.03) 100%)`,
                            minHeight: 220,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "28px 22px",
                            boxShadow: "0 10px 24px rgba(15,23,42,0.07)",
                          }}
                        >
                          <div
                            className="dtfta-filler-aurora"
                            style={{ animationDelay: `${index * 0.35}s` }}
                          />
                          <div className="dtfta-filler-mesh" />
                          <div className="dtfta-filler-body">
                            <BlockStack gap="400" inlineAlign="center">
                              <div
                                style={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: "50%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: "#ffffff",
                                  border: `1px solid ${brandPalette.teal}35`,
                                  boxShadow: "0 6px 16px rgba(15,23,42,0.06)",
                                }}
                              >
                                <Text as="span" variant="headingMd" fontWeight="bold">
                                  <span
                                    style={{
                                      background: `linear-gradient(135deg, ${brandPalette.orange} 0%, ${brandPalette.pink} 100%)`,
                                      WebkitBackgroundClip: "text",
                                      backgroundClip: "text",
                                      color: "transparent",
                                      lineHeight: 1,
                                    }}
                                  >
                                    +
                                  </span>
                                </Text>
                              </div>

                              <BlockStack gap="150" inlineAlign="center">
                                <Text as="p" variant="bodyMd" alignment="center" fontWeight="semibold">
                                  <span style={{ color: "#0f172a", letterSpacing: "-0.02em" }}>
                                    More styles coming soon
                                  </span>
                                </Text>
                                <Text as="p" variant="bodySm" alignment="center" tone="subdued">
                                  <span style={{ maxWidth: 200, display: "inline-block", lineHeight: 1.45 }}>
                                    New catalog items will appear here when available.
                                  </span>
                                </Text>
                              </BlockStack>

                              <div
                                style={{
                                  width: 48,
                                  height: 3,
                                  borderRadius: 999,
                                  background: `linear-gradient(90deg, ${brandPalette.orange} 0%, ${brandPalette.pink} 100%)`,
                                  opacity: 0.9,
                                }}
                              />
                            </BlockStack>
                          </div>
                        </div>
                      ))}
                    </InlineGrid>
                  </div>
                </>
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
        </div>

        <div style={{ minWidth: "280px", maxWidth: "320px", flexShrink: 0 }}>
          <div style={sidebarSurfaceStyle}>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  Product Information
                </Text>
                <Badge tone="success">On-demand</Badge>
              </InlineStack>

              <Text as="p" variant="bodyMd" style={{ color: "#334155" }}>
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
                    borderRadius: 12,
                    border: "1px solid #cfe0ff",
                    background:
                      "linear-gradient(135deg, rgba(239,246,255,0.96) 0%, rgba(245,243,255,0.92) 100%)",
                    padding: "12px 12px",
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
                className="products-sidebar-btn"
                  type="button"
                  style={{
                    ...primaryButtonStyle,
                    height: 38,
                    width: "100%",
                    fontWeight: 700,
                  }}
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
                <button
                className="products-sidebar-btn"
                  type="button"
                  style={{
                    ...secondaryButtonStyle,
                    width: "100%",
                    fontWeight: 700,
                    border: "1px solid transparent",
                    background: "linear-gradient(135deg, #ff7a00 0%, #ff4da6 100%)",
                    color: "#ffffff",
                    boxShadow: "0 8px 18px rgba(246,98,110,0.24)",
                  opacity: 1,
                  }}
                  disabled
                >
                  Choose a Product to Continue
                </button>
              )}
            </BlockStack>
            <div
              style={{
                position: "absolute",
                top: -30,
                right: -22,
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(71,176,161,0.21) 0%, rgba(71,176,161,0) 72%)",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
        </InlineStack>
        <div style={{ marginBottom: 32 }} />
      </BlockStack>
      </div>
    </Page>
  );
}