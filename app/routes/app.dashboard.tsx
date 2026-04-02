import { useEffect, useMemo, useState } from 'react';
import type { LoaderFunctionArgs } from 'react-router';
import { useNavigate, useLoaderData } from 'react-router';
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Link,
  Badge,
  InlineGrid,
} from '@shopify/polaris';
import { authenticate } from '../shopify.server';
import { createExternalApiHeaders } from '../lib/external-api.server';
import {
  resolveProductKeyFromApiProduct,
  getPlaceholderImageForApiProduct,
  getPlaceholderProducts,
  normalizeDtftaProduct,
} from "../lib/dtfta-products.server";
import ProductCard from '../common/ProductCard';
import type { Order, Product, DashboardStats, BrandSettings, SetupStatus } from '../types';
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

  const API_BASE = process.env.EXTERNAL_API_BASE || '/api';
  const headers = createExternalApiHeaders('', { 'X-Shop': shop });

  const [ordersRes, productsRes, statsRes, fulfillmentRes, brandRes] = await Promise.allSettled([
    fetch(`${API_BASE}/orders?shop=${encodeURIComponent(shop)}`, { headers }),
    fetch(`${API_BASE}/products/get?shop=${encodeURIComponent(shop)}`, { headers }),
    fetch(`${API_BASE}/dashboard-stats?shop=${encodeURIComponent(shop)}`, { headers }),
    fetch(`${API_BASE}/fulfillment-status?shop=${encodeURIComponent(shop)}`, { headers }),
    fetch(`${API_BASE}/brand-settings?shop=${encodeURIComponent(shop)}`, { headers }),
  ]);

  const safeJson = async (r: Response | null) => {
    try {
      if (r?.ok) return await r.json();
      return null;
    } catch {
      return null;
    }
  };

  const orders = ordersRes.status === 'fulfilled' ? await safeJson(ordersRes.value) : [];
  const rawProductsRes = productsRes.status === 'fulfilled' ? await safeJson(productsRes.value) : [];
  const dashboardStats = statsRes.status === 'fulfilled' ? await safeJson(statsRes.value) : null;
  const fulfillmentStatus =
    fulfillmentRes.status === 'fulfilled' ? await safeJson(fulfillmentRes.value) : null;
  const brandSetting = brandRes.status === 'fulfilled' ? await safeJson(brandRes.value) : null;

    const rawProducts: Product[] = Array.isArray(rawProductsRes)
    ? rawProductsRes
    : Array.isArray(rawProductsRes?.data)
      ? rawProductsRes.data
      : [];
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


  return {
    isConnected: true,
    shop,
    shopDomain: shop,
    hasAccessToken: !!session.accessToken,
    scopes: session.scope,
    fulfillmentStatus: fulfillmentStatus || null,
    orders: orders || [],
    products: products || [],
    dashboardStats: dashboardStats || null,
    brandSetting: brandSetting || null,
  };
};

export default function Dashboard() {
  const navigate = useNavigate();
  const loaderData = useLoaderData<typeof loader>();

  const [orders, setOrders] = useState<Order[]>(loaderData?.orders || []);
  const [products, setProducts] = useState<Product[]>(loaderData?.products || []);
  const [dashboardStats] = useState<DashboardStats>(
    loaderData?.dashboardStats || {
      totalOrders: 0,
      pending: 0,
      inProduction: 0,
      shipped: 0,
      exceptions: 0,
      fulfillmentRate: 0,
    }
  );
  const [brandSettings] = useState<BrandSettings | null>(loaderData?.brandSetting || null);
  const [setupStatus] = useState<SetupStatus>(
    loaderData?.fulfillmentStatus || {
      fulfillmentServiceConnected: false,
      locationCreated: false,
    }
  );

  const toggleFavorite = (productId: string) => {
    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        product.id === productId ? { ...product, isFavorite: !product.isFavorite } : product
      )
    );
  };

  const isBrandSettingsComplete = useMemo(() => {
    if (!brandSettings) return false;

    return !!(
      brandSettings.brandName &&
      brandSettings.returnAddress?.street &&
      brandSettings.returnAddress?.city &&
      brandSettings.returnAddress?.state &&
      brandSettings.returnAddress?.zipCode &&
      brandSettings.supportContact?.email
    );
  }, [brandSettings]);

  useEffect(() => {
    if (!isBrandSettingsComplete) {
      navigate('/app/onboarding');
    }
  }, [isBrandSettingsComplete, navigate]);

  const handleProductClick = () => {
      navigate(`/app/products`);
  };

  const handleOrderClick = () => {
    navigate(`/app/orders`);
  };

  const recentOrders = orders.slice(0, 3);
  //const featuredProducts = products.filter((p) => p.isBestseller).slice(0, 4);
  const featuredProducts = products.slice(0, 4);

  const getBadgeTone = (
    status: string
  ): 'success' | 'attention' | 'info' | 'critical' | 'warning' => {
    switch (status) {
      case 'Shipped':
        return 'success';
      case 'In Production':
        return 'warning';
      case 'New':
        return 'info';
      case 'Artwork Needed':
        return 'attention';
      case 'Exception':
        return 'critical';
      default:
        return 'info';
    }
  };

  return (
    <Page title="Dashboard" fullWidth>
      <BlockStack gap="500">
        {loaderData?.isConnected && (
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingSm" tone="success">
                ✓ Connected to Shopify
              </Text>
              <Text as="p" tone="subdued">
                Shop: {loaderData.shop}
              </Text>
            </BlockStack>
          </Card>
        )}

        <InlineStack align="start" gap="500" blockAlign="start">
          <div style={{ flex: '1', minWidth: 0 }}>
            <BlockStack gap="500">
              <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
                {[
                  { label: 'Total Orders', value: dashboardStats.totalOrders },
                  { label: 'Pending', value: dashboardStats.pending },
                  { label: 'In Production', value: dashboardStats.inProduction },
                  { label: 'Shipped', value: dashboardStats.shipped },
                ].map((item) => (
                  <Card key={item.label}>
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" tone="subdued">
                        {item.label}
                      </Text>
                      <Text as="h2" variant="heading2xl">
                        {item.value}
                      </Text>
                    </BlockStack>
                  </Card>
                ))}
              </InlineGrid>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Featured Products
                  </Text>

                  <Text as="p" tone="subdued">
                    Browse our best-selling print-on-demand products. Click on any product to
                    customize and add it to your store.
                  </Text>

                  <InlineGrid columns={{ xs: 1, sm: 4 }} gap="400">
                    {featuredProducts.map((product) => (
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
                        showFavorite={true}
                        variant="default"
                      />
                    ))}
                  </InlineGrid>

                  <Link onClick={handleProductClick} >View All Products →</Link>
                </BlockStack>
              </Card>
            </BlockStack>
          </div>

          <div style={{ minWidth: '280px', maxWidth: '320px', flexShrink: 0 }}>
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Connection Status
                  </Text>

                  <InlineStack align="space-between">
                    <Text as="span">Shopify Account</Text>
                    <Text as="span" tone="success" fontWeight="semibold">
                      ✓ Connected
                    </Text>
                  </InlineStack>

                  <InlineStack align="space-between">
                    <Text as="span">Fulfillment Service</Text>
                    <Text
                      as="span"
                      tone={setupStatus.fulfillmentServiceConnected ? 'success' : 'critical'}
                      fontWeight="semibold"
                    >
                      {setupStatus.fulfillmentServiceConnected ? '✓ Connected' : '✗ Not Connected'}
                    </Text>
                  </InlineStack>

                  <InlineStack align="space-between">
                    <Text as="span">Location Created</Text>
                    <Text
                      as="span"
                      tone={setupStatus.locationCreated ? 'success' : 'critical'}
                      fontWeight="semibold"
                    >
                      {setupStatus.locationCreated ? '✓ Created' : '✗ Not Created'}
                    </Text>
                  </InlineStack>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Fulfillment Status
                  </Text>
                  <Text as="h2" variant="headingLg">
                    Fulfillment Rate: {dashboardStats.fulfillmentRate.toFixed(1)}%
                  </Text>
                  <Text as="p" tone="subdued">
                    Your orders are being processed efficiently. All shipments are handled with
                    white-label branding as configured in your settings.
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Recent Orders
                  </Text>

                  {recentOrders.map((order) => (
                    <Card key={order.id} padding="300">
                      <BlockStack gap="200">
                        <InlineStack align="space-between">
                          <Text as="span" fontWeight="semibold">
                            #{order.orderNumber}
                          </Text>
                          <Badge tone={getBadgeTone(order.status)}>{order.status}</Badge>
                        </InlineStack>

                        <Text as="p">{order.customer.name}</Text>
                        <Text as="p" tone="subdued">
                          {order.date}
                        </Text>
                      </BlockStack>
                    </Card>
                  ))}

                  <Link onClick={handleOrderClick}>View All Orders</Link>
                </BlockStack>
              </Card>
            </BlockStack>
          </div>
        </InlineStack>
      </BlockStack>
    </Page>
  );
}