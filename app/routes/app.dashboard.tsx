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
  normalizeDtftaProduct,
} from "../lib/dtfta-products.server";
import ProductCard from '../common/ProductCard';
import type { Order, Product, DashboardStats, BrandSettings, SetupStatus } from '../types';
import {getProductDesignAssetUrl} from "../lib/design-assets";

function normalizeOrder(input: unknown): Order | null {
  if (!input || typeof input !== 'object') return null;
  const row = input as Record<string, unknown>;

  const idRaw = row.id ?? row.order_id ?? row.shopify_order_id;
  const orderNumberRaw = row.orderNumber ?? row.order_number ?? row.name;
  const statusRaw = row.status;
  const customerRaw =
    row.customer && typeof row.customer === 'object'
      ? (row.customer as Record<string, unknown>)
      : {};
  const itemsRaw = Array.isArray(row.items) ? row.items : [];
  const dateRaw = row.date ?? row.created_at ?? row.createdAt;

  const id = typeof idRaw === 'string' || typeof idRaw === 'number' ? String(idRaw) : '';
  const orderNumber =
    typeof orderNumberRaw === 'string' || typeof orderNumberRaw === 'number'
      ? String(orderNumberRaw)
      : typeof idRaw === 'string' || typeof idRaw === 'number'
        ? String(idRaw)
        : '';
  const status = typeof statusRaw === 'string' ? statusRaw : 'New';
  const customerName = typeof customerRaw.name === 'string' ? customerRaw.name : 'Unknown';
  const customerEmail = typeof customerRaw.email === 'string' ? customerRaw.email : '';
  const date = typeof dateRaw === 'string' ? dateRaw : '';

  if (!id) return null;

  return {
    id,
    orderNumber,
    status: status as Order['status'],
    customer: {
      name: customerName,
      email: customerEmail,
    },
    date,
    items: itemsRaw.map((item) => {
      const rowItem = (item ?? {}) as Record<string, unknown>;
      return {
        quantity: typeof rowItem.quantity === 'number' ? rowItem.quantity : Number(rowItem.quantity ?? 1) || 1,
        name:
          typeof rowItem.name === 'string'
            ? rowItem.name
            : typeof rowItem.title === 'string'
              ? rowItem.title
              : 'Item',
        sku: typeof rowItem.sku === 'string' ? rowItem.sku : undefined,
      };
    }),
    tracking: typeof row.tracking === 'string' ? row.tracking : undefined,
  };
}

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

  const fetchOrders = async () => {
    const candidates = [
      `${API_BASE}/orders-signed?shop=${encodeURIComponent(shop)}`,
      `${API_BASE}/orders?shop=${encodeURIComponent(shop)}`,
    ];

    for (const url of candidates) {
      try {
        const res = await fetch(url, { headers });
        if (!res.ok) continue;
        return await res.json();
      } catch {
        // Try next candidate endpoint.
      }
    }

    return [];
  };

  const [ordersRes, productsRes, statsRes, fulfillmentRes, brandRes] = await Promise.allSettled([
    fetchOrders(),
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

  const rawOrdersRes = ordersRes.status === 'fulfilled' ? ordersRes.value : [];
  const rawOrders: unknown[] = Array.isArray(rawOrdersRes)
    ? rawOrdersRes
    : Array.isArray(rawOrdersRes?.data)
      ? rawOrdersRes.data
      : [];
  const orders = rawOrders
    .map(normalizeOrder)
    .filter((order): order is Order => order !== null);
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

  const [orders] = useState<Order[]>(loaderData?.orders || []);
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

  const recentOrders = orders.slice(0, 4);
  const featuredProducts = products.slice(0, 4);
  const hasOrders = recentOrders.length > 0;
  const hasFeaturedProducts = featuredProducts.length > 0;
  const completedSetupCount = [
    true,
    setupStatus.fulfillmentServiceConnected,
    setupStatus.locationCreated,
    isBrandSettingsComplete,
  ].filter(Boolean).length;
  const setupCompletionPercent = Math.round((completedSetupCount / 4) * 100);

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

  const statsCards = [
    {
      label: 'Total Orders',
      value: dashboardStats.totalOrders,
      helper: 'All-time tracked orders',
      tone: '#1f2937',
      accent: '#dbeafe',
    },
    {
      label: 'Pending',
      value: dashboardStats.pending,
      helper: 'Awaiting production start',
      tone: '#92400e',
      accent: '#fef3c7',
    },
    {
      label: 'In Production',
      value: dashboardStats.inProduction,
      helper: 'Currently being fulfilled',
      tone: '#1e3a8a',
      accent: '#dbeafe',
    },
    {
      label: 'Shipped',
      value: dashboardStats.shipped,
      helper: 'Completed and dispatched',
      tone: '#065f46',
      accent: '#d1fae5',
    },
  ];

  const widgetSurfaceStyle: React.CSSProperties = {
    borderRadius: 14,
    border: '1px solid #d7e0ea',
    padding: 16,
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafd 100%)',
    boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
  };

  const panelSurfaceStyle: React.CSSProperties = {
    borderRadius: 14,
    border: '1px solid #d7e0ea',
    background: 'linear-gradient(180deg, rgba(248,250,252,0.9) 0%, #ffffff 100%)',
    padding: 16,
    boxShadow: '0 10px 28px rgba(15,23,42,0.06)',
  };

  const buttonBaseStyle: React.CSSProperties = {
    borderRadius: 10,
    border: '1px solid transparent',
    height: 36,
    padding: '0 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 180ms ease',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
    color: '#ffffff',
    boxShadow: '0 8px 18px rgba(29,78,216,0.28)',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
  };

  const ghostButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    height: 30,
    padding: '0 10px',
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    border: '1px solid #bfdbfe',
  };

  const inverseButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: 'rgba(255,255,255,0.12)',
    color: '#ffffff',
    border: '1px solid rgba(255,255,255,0.28)',
    backdropFilter: 'blur(2px)',
  };

  const getOrderAccentColor = (status: string) => {
    switch (status) {
      case 'Shipped':
        return '#10b981';
      case 'In Production':
        return '#f59e0b';
      case 'Artwork Needed':
        return '#f97316';
      case 'Exception':
        return '#ef4444';
      default:
        return '#3b82f6';
    }
  };

  return (
    <Page title="Dashboard" fullWidth>
      <BlockStack gap="500">
        <Card>
          <div
            style={{
              background:
                'linear-gradient(135deg, rgba(17,24,39,1) 0%, rgba(30,58,138,0.96) 58%, rgba(14,116,144,0.92) 100%)',
              borderRadius: 12,
              padding: 24,
              color: '#ffffff',
            }}
          >
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="start" gap="400">
                <BlockStack gap="100">
                  <Text as="h1" variant="heading2xl" tone="text-inverse">
                    DTFTA Operations Dashboard
                  </Text>
                  <Text as="p" tone="text-inverse">
                    Manage fulfillment, products, and order flow from one professional control
                    center.
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="text-inverse">
                    Active shop
                  </Text>
                  <Text as="p" fontWeight="semibold" tone="text-inverse">
                    {loaderData.shop}
                  </Text>
                </BlockStack>
              </InlineStack>

              <InlineStack gap="200">
                <button type="button" style={inverseButtonStyle} onClick={handleProductClick}>
                  View Products
                </button>
                <button type="button" style={inverseButtonStyle} onClick={handleOrderClick}>
                  View Orders
                </button>
              </InlineStack>
            </BlockStack>
          </div>
        </Card>

        {loaderData?.isConnected ? (
          <Card>
            <InlineStack align="space-between">
              <Text as="p" fontWeight="semibold" tone="success">
                Shopify connection healthy
              </Text>
              <Text as="p" tone="subdued">
                Access token active for this session
              </Text>
            </InlineStack>
          </Card>
        ) : null}

        <InlineStack align="start" gap="500" blockAlign="start">
          <div style={{ flex: '1', minWidth: 0 }}>
            <BlockStack gap="500">
              <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
                {statsCards.map((item) => (
                  <Card key={item.label}>
                    <div
                      style={{
                        borderRadius: 10,
                        padding: 16,
                        background: `linear-gradient(145deg, #ffffff 0%, ${item.accent} 100%)`,
                      }}
                    >
                      <BlockStack gap="150">
                        <Text as="p" variant="bodySm" tone="subdued">
                          {item.label}
                        </Text>
                        <Text as="h2" variant="heading2xl" fontWeight="bold">
                          {item.value}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {item.helper}
                        </Text>
                        <div
                          style={{
                            width: 40,
                            height: 4,
                            borderRadius: 4,
                            backgroundColor: item.tone,
                          }}
                        />
                      </BlockStack>
                    </div>
                  </Card>
                ))}
              </InlineGrid>

              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="100">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="h2" variant="headingMd">
                          Featured Products
                        </Text>
                        <Badge tone="info">Catalog</Badge>
                      </InlineStack>
                      <Text as="p" tone="subdued">
                        Curated top products ready for design customization and publishing.
                      </Text>
                    </BlockStack>
                    <button type="button" style={primaryButtonStyle} onClick={handleProductClick}>
                      View All Products
                    </button>
                  </InlineStack>

                  {hasFeaturedProducts ? (
                    <div style={panelSurfaceStyle}>
                      <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
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
                    </div>
                  ) : (
                    <div
                      style={{
                        borderRadius: 12,
                        border: '1px dashed #cbd5e1',
                        backgroundColor: '#f8fafc',
                        padding: 20,
                      }}
                    >
                      <BlockStack gap="200" align="center">
                        <Text as="p" variant="bodyMd" alignment="center">
                          No featured products are available yet.
                        </Text>
                        <Text as="p" tone="subdued" alignment="center">
                          Products will appear here after your catalog sync completes.
                        </Text>
                      </BlockStack>
                    </div>
                  )}
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between">
                    <Text as="h2" variant="headingMd">
                      Recent Orders
                    </Text>
                    <button type="button" style={secondaryButtonStyle} onClick={handleOrderClick}>
                      View All Orders
                    </button>
                  </InlineStack>

                  {hasOrders ? (
                    <BlockStack gap="200">
                      {recentOrders.map((order) => (
                        <div
                          key={order.id}
                          style={{
                            border: '1px solid #dbe2ea',
                            borderRadius: 12,
                            padding: 16,
                            boxShadow: '0 4px 14px rgba(15,23,42,0.05)',
                            backgroundColor: '#ffffff',
                            borderLeft: `4px solid ${getOrderAccentColor(order.status)}`,
                          }}
                        >
                          <InlineStack align="space-between" blockAlign="start">
                            <BlockStack gap="050">
                              <Text as="p" fontWeight="semibold">
                                #{order.orderNumber}
                              </Text>
                              <Text as="p">{order.customer.name}</Text>
                              <Text as="p" tone="subdued" variant="bodySm">
                                {order.customer.email}
                              </Text>
                            </BlockStack>
                            <BlockStack gap="100" inlineAlign="end">
                              <Badge tone={getBadgeTone(order.status)}>{order.status}</Badge>
                              <Text as="p" tone="subdued" variant="bodySm">
                                {order.date}
                              </Text>
                              <button type="button" style={ghostButtonStyle} onClick={handleOrderClick}>
                                Open
                              </button>
                            </BlockStack>
                          </InlineStack>
                        </div>
                      ))}
                    </BlockStack>
                  ) : (
                    <div
                      style={{
                        borderRadius: 12,
                        border: '1px dashed #cbd5e1',
                        backgroundColor: '#f8fafc',
                        padding: 20,
                      }}
                    >
                      <BlockStack gap="200" align="center">
                        <Text as="p" variant="bodyMd" alignment="center">
                          No recent orders found.
                        </Text>
                        <Text as="p" tone="subdued" alignment="center">
                          New orders will appear here as soon as they are synced.
                        </Text>
                      </BlockStack>
                    </div>
                  )}
                </BlockStack>
              </Card>
            </BlockStack>
          </div>

          <div style={{ minWidth: '280px', maxWidth: '320px', flexShrink: 0, marginBottom: 24 }}>
            <BlockStack gap="500">
              <Card>
                <div style={widgetSurfaceStyle}>
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingMd">
                        Connection Health
                      </Text>
                      <Badge tone="success">Live</Badge>
                    </InlineStack>

                  <InlineStack align="space-between">
                    <Text as="span">Shopify Account</Text>
                    <Text as="span" tone="success" fontWeight="semibold">
                      Connected
                    </Text>
                  </InlineStack>

                  <InlineStack align="space-between">
                    <Text as="span">Fulfillment Service</Text>
                    <Text
                      as="span"
                      tone={setupStatus.fulfillmentServiceConnected ? 'success' : 'critical'}
                      fontWeight="semibold"
                    >
                      {setupStatus.fulfillmentServiceConnected ? 'Connected' : 'Not Connected'}
                    </Text>
                  </InlineStack>

                  <InlineStack align="space-between">
                    <Text as="span">Location Created</Text>
                    <Text
                      as="span"
                      tone={setupStatus.locationCreated ? 'success' : 'critical'}
                      fontWeight="semibold"
                    >
                      {setupStatus.locationCreated ? 'Created' : 'Not Created'}
                    </Text>
                  </InlineStack>
                  </BlockStack>
                </div>
              </Card>

              <Card>
                <div style={widgetSurfaceStyle}>
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingMd">
                        Fulfillment Performance
                      </Text>
                      <Badge tone={dashboardStats.fulfillmentRate >= 80 ? 'success' : 'warning'}>
                        {dashboardStats.fulfillmentRate >= 80 ? 'Healthy' : 'Needs attention'}
                      </Badge>
                    </InlineStack>
                  <Text as="h2" variant="headingLg">
                    {dashboardStats.fulfillmentRate.toFixed(1)}%
                  </Text>
                  <Text as="p" tone="subdued">
                    Fulfillment rate across current operational orders.
                  </Text>
                  <div
                    style={{
                      width: '100%',
                      height: 8,
                      borderRadius: 999,
                      backgroundColor: '#e5e7eb',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(0, Math.min(100, dashboardStats.fulfillmentRate))}%`,
                        height: '100%',
                        backgroundColor: '#2563eb',
                      }}
                    />
                  </div>
                  </BlockStack>
                </div>
              </Card>

              <Card>
                <div style={widgetSurfaceStyle}>
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingMd">
                        Setup Checklist
                      </Text>
                      <Badge tone={setupCompletionPercent === 100 ? 'success' : 'warning'}>
                        {setupCompletionPercent === 100 ? 'Complete' : 'In Progress'}
                      </Badge>
                    </InlineStack>
                  <Text as="p" tone="subdued">
                    {setupCompletionPercent}% complete
                  </Text>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span">Shop connected</Text>
                      <Badge tone="success">Done</Badge>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span">Fulfillment service</Text>
                      <Badge tone={setupStatus.fulfillmentServiceConnected ? 'success' : 'critical'}>
                        {setupStatus.fulfillmentServiceConnected ? 'Done' : 'Pending'}
                      </Badge>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span">Location configured</Text>
                      <Badge tone={setupStatus.locationCreated ? 'success' : 'critical'}>
                        {setupStatus.locationCreated ? 'Done' : 'Pending'}
                      </Badge>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span">Brand profile completed</Text>
                      <Badge tone={isBrandSettingsComplete ? 'success' : 'critical'}>
                        {isBrandSettingsComplete ? 'Done' : 'Pending'}
                      </Badge>
                    </InlineStack>
                  </BlockStack>
                  {!isBrandSettingsComplete ? (
                    <button
                      type="button"
                      style={secondaryButtonStyle}
                      onClick={() => navigate('/app/onboarding')}
                    >
                      Complete onboarding
                    </button>
                  ) : (
                    <Text as="p" tone="success">
                      Brand settings are fully configured.
                    </Text>
                  )}
                  </BlockStack>
                </div>
              </Card>

              <Card>
                <div style={widgetSurfaceStyle}>
                  <BlockStack gap="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingMd">
                        Quick Tips
                      </Text>
                      <Badge tone="info">Ops</Badge>
                    </InlineStack>
                  <Text as="p" tone="subdued">
                    Keep top products updated and monitor pending orders daily for better delivery
                    consistency.
                  </Text>
                  <button type="button" style={secondaryButtonStyle} onClick={handleProductClick}>
                    Manage catalog
                  </button>
                  <button type="button" style={secondaryButtonStyle} onClick={handleOrderClick}>
                    Review order queue
                  </button>
                  </BlockStack>
                </div>
              </Card>
            </BlockStack>
          </div>
        </InlineStack>
      </BlockStack>
    </Page>
  );
}