import { useEffect, useMemo, useState } from 'react';
import type { LoaderFunctionArgs } from 'react-router';
import { useNavigate, useLoaderData } from 'react-router';
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
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
  const [hoveredTopBox, setHoveredTopBox] = useState<string | null>(null);
  const [hoveredStatCard, setHoveredStatCard] = useState<string | null>(null);
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

  const brandPalette = {
    blue: '#3498db',
    green: '#2ecc71',
    pink: '#ff4da6',
    orange: '#ff7a00',
    teal: '#47b0a1',
    coral: '#f6626e',
    violet: '#7f73ef',
    magenta: '#ee5499',
    sky: '#1f97dd',
  } as const;

  const heroParticles = [
    { left: '6%', top: '16%', size: 7, delay: '0s', duration: '3.2s', dx: 12, dy: -14 },
    { left: '14%', top: '72%', size: 5, delay: '0.3s', duration: '3.8s', dx: -10, dy: -12 },
    { left: '24%', top: '36%', size: 6, delay: '0.7s', duration: '3.5s', dx: 14, dy: -9 },
    { left: '34%', top: '20%', size: 8, delay: '0.5s', duration: '4.1s', dx: -12, dy: -16 },
    { left: '42%', top: '74%', size: 6, delay: '1.1s', duration: '3.6s', dx: 11, dy: -10 },
    { left: '53%', top: '28%', size: 7, delay: '0.2s', duration: '3.4s', dx: -14, dy: -8 },
    { left: '62%', top: '64%', size: 5, delay: '1.3s', duration: '3.1s', dx: 9, dy: -12 },
    { left: '70%', top: '22%', size: 6, delay: '0.6s', duration: '4s', dx: -10, dy: -11 },
    { left: '78%', top: '58%', size: 7, delay: '0.9s', duration: '3.3s', dx: 12, dy: -13 },
    { left: '86%', top: '30%', size: 6, delay: '0.4s', duration: '3.7s', dx: -12, dy: -9 },
    { left: '92%', top: '70%', size: 5, delay: '1s', duration: '3.2s', dx: 8, dy: -11 },
  ] as const;

  const statsCards = [
    {
      label: 'Total Orders',
      value: dashboardStats.totalOrders,
      helper: 'All-time tracked orders',
      tone: brandPalette.blue,
      accent: `linear-gradient(135deg, ${brandPalette.blue}20 0%, ${brandPalette.sky}1f 100%)`,
      highlight: '+12% this week',
    },
    {
      label: 'Pending',
      value: dashboardStats.pending,
      helper: 'Awaiting production start',
      tone: brandPalette.orange,
      accent: `linear-gradient(135deg, ${brandPalette.orange}20 0%, ${brandPalette.coral}1f 100%)`,
      highlight: 'Prioritize these today',
    },
    {
      label: 'In Production',
      value: dashboardStats.inProduction,
      helper: 'Currently being fulfilled',
      tone: brandPalette.violet,
      accent: `linear-gradient(135deg, ${brandPalette.violet}20 0%, ${brandPalette.sky}1f 100%)`,
      highlight: 'Running smoothly',
    },
    {
      label: 'Shipped',
      value: dashboardStats.shipped,
      helper: 'Completed and dispatched',
      tone: brandPalette.green,
      accent: `linear-gradient(135deg, ${brandPalette.green}20 0%, ${brandPalette.teal}1f 100%)`,
      highlight: 'Delivery flow healthy',
    },
  ];

  const widgetSurfaceStyle: React.CSSProperties = {
    borderRadius: 14,
    border: '1px solid #dbe3ec',
    padding: 16,
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
    boxShadow: '0 10px 24px rgba(15,23,42,0.08)',
  };

  const panelSurfaceStyle: React.CSSProperties = {
    borderRadius: 14,
    border: '1px solid #dbe3ec',
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
    padding: 18,
    boxShadow: '0 12px 28px rgba(15,23,42,0.08)',
  };

  const buttonBaseStyle: React.CSSProperties = {
    borderRadius: 10,
    border: '1px solid transparent',
    height: 36,
    padding: '0 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 200ms ease',
    transform: 'translateY(0)',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    background: `linear-gradient(135deg, ${brandPalette.orange} 0%, ${brandPalette.pink} 100%)`,
    color: '#ffffff',
    boxShadow: '0 10px 20px rgba(246,98,110,0.32)',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    background: `linear-gradient(135deg, ${brandPalette.orange} 0%, ${brandPalette.pink} 100%)`,
    color: '#ffffff',
    border: '1px solid transparent',
    boxShadow: '0 10px 20px rgba(246,98,110,0.28)',
  };

  const ghostButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    height: 30,
    padding: '0 10px',
    background: `linear-gradient(135deg, ${brandPalette.orange} 0%, ${brandPalette.pink} 100%)`,
    color: '#ffffff',
    border: '1px solid transparent',
    boxShadow: '0 8px 16px rgba(246,98,110,0.24)',
  };

  const inverseButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    background: `linear-gradient(135deg, ${brandPalette.sky}66 0%, ${brandPalette.violet}66 100%)`,
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
      <style>
        {`
          .dtfta-btn {
            position: relative;
            overflow: hidden;
          }
          .dtfta-btn::after {
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
          .dtfta-btn:hover {
            transform: translateY(-2px);
            filter: saturate(1.08) brightness(1.03);
          }
          .dtfta-btn:hover::after {
            transform: translateX(420%) skewX(-18deg);
          }
        `}
      </style>
      <BlockStack gap="500">
        <Card padding="0">
          <div
            style={{
              background:
                `linear-gradient(122deg, ${brandPalette.blue} 0%, ${brandPalette.pink} 100%)`,
              backgroundSize: '170% 170%',
              animation: 'dtftaHeroGradient 10s ease-in-out infinite',
              borderRadius: 14,
              padding: 30,
              color: '#ffffff',
              position: 'relative',
              overflow: 'hidden',
              minHeight: 170,
            }}
          >
            <style>
              {`
                @keyframes dtftaHeroFloat {
                  0% { transform: translate3d(0, 0, 0) scale(0.85); opacity: 0.24; }
                  25% { transform: translate3d(var(--dx), calc(var(--dy) * 0.65), 0) scale(1.08); opacity: 0.72; }
                  50% { transform: translate3d(calc(var(--dx) * -0.55), var(--dy), 0) scale(1.2); opacity: 1; }
                  75% { transform: translate3d(calc(var(--dx) * 0.4), calc(var(--dy) * -0.45), 0) scale(1.04); opacity: 0.6; }
                  100% { transform: translate3d(0, 0, 0) scale(0.85); opacity: 0.24; }
                }
                @keyframes dtftaHeroSweep {
                  0% { transform: translateX(-18%); opacity: 0; }
                  35% { opacity: 0.26; }
                  100% { transform: translateX(118%); opacity: 0; }
                }
                @keyframes dtftaHeroNebula {
                  0% { transform: scale(1) rotate(0deg); opacity: 0.18; }
                  50% { transform: scale(1.08) rotate(10deg); opacity: 0.3; }
                  100% { transform: scale(1) rotate(0deg); opacity: 0.18; }
                }
                @keyframes dtftaHeroGradient {
                  0% { background-position: 0% 50%; }
                  50% { background-position: 100% 50%; }
                  100% { background-position: 0% 50%; }
                }
              `}
            </style>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  `radial-gradient(circle at 18% 22%, ${brandPalette.sky}33 0%, transparent 38%), radial-gradient(circle at 82% 76%, ${brandPalette.pink}2b 0%, transparent 42%)`,
                animation: 'dtftaHeroNebula 9.6s ease-in-out infinite',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '-20%',
                width: '40%',
                height: '100%',
                background:
                  'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0) 100%)',
                animation: 'dtftaHeroSweep 3.1s ease-in-out infinite',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: -90,
                right: -70,
                width: 280,
                height: 280,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${brandPalette.sky}66 0%, ${brandPalette.sky}00 72%)`,
                animation: 'dtftaHeroNebula 4.3s ease-in-out infinite',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: -110,
                left: -60,
                width: 320,
                height: 320,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${brandPalette.pink}66 0%, ${brandPalette.pink}00 70%)`,
                animation: 'dtftaHeroNebula 4.9s ease-in-out infinite',
              }}
            />
            {heroParticles.map((particle, index) => (
              <div
                key={`${particle.left}-${particle.top}-${index}`}
                style={{
                  ['--dx' as string]: `${particle.dx}px`,
                  ['--dy' as string]: `${particle.dy}px`,
                  position: 'absolute',
                  left: particle.left,
                  top: particle.top,
                  width: particle.size,
                  height: particle.size,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.35) 68%, rgba(255,255,255,0.08) 100%)',
                  boxShadow: '0 0 20px rgba(255,255,255,0.95), 0 0 36px rgba(255,255,255,0.4)',
                  animation: `dtftaHeroFloat ${particle.duration} ease-in-out ${particle.delay} infinite`,
                  pointerEvents: 'none',
                }}
              />
            ))}
            <BlockStack gap="400">
              <BlockStack gap="200">
                <Text as="h1" variant="headingXl" tone="text-inverse">
                  <span style={{ color: '#ffffff', textShadow: '0 1px 10px rgba(15,23,42,0.32)' }}>
                    DTFTA Operations Dashboard
                  </span>
                </Text>
                <Text as="p" tone="text-inverse" variant="bodyMd">
                  <span style={{ color: '#ffffff', fontWeight: 500 }}>
                    Manage fulfillment, products, and order flow from one professional control
                    center.
                  </span>
                </Text>
              </BlockStack>

              <InlineStack align="space-between" blockAlign="center" gap="300">
                <InlineStack gap="200" blockAlign="center">
                  <Badge tone="attention">Live Operations</Badge>
                  <Badge tone="success">{`${setupCompletionPercent}% setup complete`}</Badge>
                </InlineStack>
                <div
                  style={{
                    borderRadius: 999,
                    padding: '6px 12px',
                    backgroundColor: 'rgba(255,255,255,0.16)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    backdropFilter: 'blur(2px)',
                  }}
                >
                  <Text as="p" variant="bodySm" fontWeight="semibold" tone="text-inverse">
                    {loaderData.shop}
                  </Text>
                </div>
              </InlineStack>

              <InlineStack gap="200">
                <button
                  className="dtfta-btn"
                  type="button"
                  style={{
                    ...primaryButtonStyle,
                    height: 38,
                    padding: '0 16px',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                  onClick={handleProductClick}
                >
                  View Products
                </button>
                <button
                  className="dtfta-btn"
                  type="button"
                  style={{
                    ...inverseButtonStyle,
                    height: 38,
                    padding: '0 16px',
                    fontSize: 14,
                    fontWeight: 700,
                    border: '1px solid rgba(255,255,255,0.48)',
                  }}
                  onClick={handleOrderClick}
                >
                  View Orders
                </button>
              </InlineStack>
            </BlockStack>
          </div>
        </Card>

        <InlineGrid columns={{ xs: 1, md: 3 }} gap="300">
          <div
            onMouseEnter={() => setHoveredTopBox('growth')}
            onMouseLeave={() => setHoveredTopBox(null)}
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 14,
              border: '1px solid #dbe7f3',
              background: '#ffffff',
              padding: 14,
              boxShadow:
                hoveredTopBox === 'growth'
                  ? '0 14px 30px rgba(59,130,246,0.2)'
                  : '0 6px 14px rgba(15,23,42,0.05)',
              transform: hoveredTopBox === 'growth' ? 'translateY(-3px)' : 'translateY(0)',
              backdropFilter: hoveredTopBox === 'growth' ? 'blur(2px)' : 'blur(0px)',
              transition: 'all 180ms ease',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '-30%',
                width: '28%',
                height: '100%',
                background:
                  'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 100%)',
                transform:
                  hoveredTopBox === 'growth' ? 'translateX(420%) skewX(-18deg)' : 'translateX(0) skewX(-18deg)',
                transition: 'transform 520ms ease',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: -30,
                right: -24,
                width: 92,
                height: 92,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(52,152,219,0.14) 0%, rgba(52,152,219,0) 72%)',
                pointerEvents: 'none',
              }}
            />
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="050">
                <Text as="h3" variant="headingSm">
                  <span style={{ color: '#0f172a' }}>Growth Snapshot</span>
                </Text>
                <Text as="p" variant="bodySm">
                  <span style={{ color: '#475569' }}>
                    Orders and production are synced and ready for scaling.
                  </span>
                </Text>
              </BlockStack>
              <Text as="p" fontWeight="semibold">
                <span style={{ color: brandPalette.blue }}>{dashboardStats.totalOrders} orders</span>
              </Text>
            </InlineStack>
          </div>
          <div
            onMouseEnter={() => setHoveredTopBox('pulse')}
            onMouseLeave={() => setHoveredTopBox(null)}
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 14,
              border: '1px solid #dbe7e4',
              background: '#ffffff',
              padding: 14,
              boxShadow:
                hoveredTopBox === 'pulse'
                  ? '0 14px 30px rgba(71,176,161,0.22)'
                  : '0 6px 14px rgba(15,23,42,0.05)',
              transform: hoveredTopBox === 'pulse' ? 'translateY(-3px)' : 'translateY(0)',
              backdropFilter: hoveredTopBox === 'pulse' ? 'blur(2px)' : 'blur(0px)',
              transition: 'all 180ms ease',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '-30%',
                width: '28%',
                height: '100%',
                background:
                  'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 100%)',
                transform:
                  hoveredTopBox === 'pulse' ? 'translateX(420%) skewX(-18deg)' : 'translateX(0) skewX(-18deg)',
                transition: 'transform 520ms ease',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: -28,
                right: -20,
                width: 88,
                height: 88,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(71,176,161,0.14) 0%, rgba(71,176,161,0) 72%)',
                pointerEvents: 'none',
              }}
            />
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="050">
                <Text as="h3" variant="headingSm">
                  <span style={{ color: '#0f172a' }}>Fulfillment Pulse</span>
                </Text>
                <Text as="p" variant="bodySm">
                  <span style={{ color: '#475569' }}>
                    Monitor production and shipment consistency across active orders.
                  </span>
                </Text>
              </BlockStack>
              <Text as="p" fontWeight="semibold">
                <span style={{ color: brandPalette.teal }}>{dashboardStats.fulfillmentRate.toFixed(1)}%</span>
              </Text>
            </InlineStack>
          </div>
          <div
            onMouseEnter={() => setHoveredTopBox('connection')}
            onMouseLeave={() => setHoveredTopBox(null)}
            style={{
              borderRadius: 14,
              padding: '14px 14px',
              border: '1px solid #dbe7e4',
              background: '#ffffff',
              boxShadow:
                hoveredTopBox === 'connection'
                  ? '0 14px 30px rgba(71,176,161,0.2)'
                  : '0 6px 14px rgba(15,23,42,0.05)',
              transform: hoveredTopBox === 'connection' ? 'translateY(-3px)' : 'translateY(0)',
              backdropFilter: hoveredTopBox === 'connection' ? 'blur(2px)' : 'blur(0px)',
              transition: 'all 180ms ease',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '-30%',
                width: '28%',
                height: '100%',
                background:
                  'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.48) 50%, rgba(255,255,255,0) 100%)',
                transform:
                  hoveredTopBox === 'connection'
                    ? 'translateX(420%) skewX(-18deg)'
                    : 'translateX(0) skewX(-18deg)',
                transition: 'transform 520ms ease',
                pointerEvents: 'none',
              }}
            />
            <BlockStack gap="050">
              <Text as="h3" variant="headingSm">
                <span style={{ color: '#0f172a' }}>Connection Healthy</span>
              </Text>
              <Text as="p" variant="bodySm">
                <span style={{ color: '#475569' }}>Access token active for this session</span>
              </Text>
            </BlockStack>
          </div>
        </InlineGrid>

        <InlineStack align="start" gap="500" blockAlign="start">
          <div style={{ flex: '1', minWidth: 0 }}>
            <BlockStack gap="500">
              <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
                {statsCards.map((item) => (
                  <div
                    key={item.label}
                    onMouseEnter={() => setHoveredStatCard(item.label)}
                    onMouseLeave={() => setHoveredStatCard(null)}
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      borderRadius: 16,
                      padding: 18,
                      minHeight: 150,
                      background: item.accent,
                      border: `1px solid ${item.tone}55`,
                      boxShadow:
                        hoveredStatCard === item.label
                          ? `0 18px 36px ${item.tone}33`
                          : '0 14px 28px rgba(15,23,42,0.12)',
                      transform: hoveredStatCard === item.label ? 'translateY(-4px)' : 'translateY(0)',
                      transition: 'all 200ms ease',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: '-34%',
                        width: '30%',
                        height: '100%',
                        background:
                          'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 100%)',
                        transform:
                          hoveredStatCard === item.label
                            ? 'translateX(430%) skewX(-16deg)'
                            : 'translateX(0) skewX(-16deg)',
                        transition: 'transform 560ms ease',
                        pointerEvents: 'none',
                        zIndex: 0,
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: -30,
                        right: -28,
                        width: 108,
                        height: 108,
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${item.tone}45 0%, ${item.tone}00 72%)`,
                        zIndex: 0,
                        pointerEvents: 'none',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: -40,
                        top: 14,
                        width: 120,
                        height: 120,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 70%)',
                        zIndex: 0,
                        pointerEvents: 'none',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 4,
                        background: `linear-gradient(90deg, ${item.tone} 0%, rgba(255,255,255,0.95) 100%)`,
                        zIndex: 0,
                      }}
                    />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <BlockStack gap="150">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="p" variant="bodySm" fontWeight="medium">
                          <span style={{ color: '#334155' }}>{item.label}</span>
                        </Text>
                        <div
                          style={{
                            minWidth: 26,
                            height: 26,
                            borderRadius: 999,
                            background: `${item.tone}20`,
                            border: `1px solid ${item.tone}55`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 8px',
                          }}
                        >
                          <Text as="p" variant="bodySm" fontWeight="semibold">
                            {item.value.toString()}
                          </Text>
                        </div>
                      </InlineStack>
                      <Text as="h2" variant="heading2xl" fontWeight="bold">
                          <span style={{ color: '#0f172a' }}>{item.value.toString()}</span>
                      </Text>
                      <Text as="p" variant="bodySm">
                        <span style={{ color: '#475569' }}>{item.helper}</span>
                      </Text>
                      <Text as="p" variant="bodySm">
                        <span style={{ color: item.tone, fontWeight: 700 }}>{item.highlight}</span>
                      </Text>
                      </BlockStack>
                    </div>
                  </div>
                ))}
              </InlineGrid>

              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <div
                      style={{
                        display: 'inline-flex',
                        flexDirection: 'column',
                        gap: 8,
                        borderLeft: `4px solid ${brandPalette.pink}`,
                        paddingLeft: 10,
                      }}
                    >
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="h2" variant="headingMd">
                          Featured Products
                        </Text>
                        <Badge tone="info">Catalog</Badge>
                      </InlineStack>
                      <Text as="p" tone="subdued">
                        Curated top products ready for design customization and publishing.
                      </Text>
                    </div>
                    <button
                      className="dtfta-btn"
                      type="button"
                      style={{
                        ...primaryButtonStyle,
                        height: 36,
                        padding: '0 14px',
                        fontWeight: 700,
                      }}
                      onClick={handleProductClick}
                    >
                      View All Products
                    </button>
                  </InlineStack>

                  {hasFeaturedProducts ? (
                    <div style={{ marginTop: 10 }}>
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
                        border: '1px dashed #d5dee8',
                        backgroundColor: '#f8fafc',
                        padding: 24,
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
                  <InlineStack align="space-between" blockAlign="center">
                    <div
                      style={{
                        display: 'inline-flex',
                        flexDirection: 'column',
                        gap: 6,
                        borderLeft: `4px solid ${brandPalette.orange}`,
                        paddingLeft: 10,
                      }}
                    >
                      <Text as="h2" variant="headingMd">
                        Recent Orders
                      </Text>
                      <Text as="p" tone="subdued" variant="bodySm">
                        Latest customer activity and fulfillment status.
                      </Text>
                    </div>
                    <button
                      className="dtfta-btn"
                      type="button"
                      style={{
                        ...primaryButtonStyle,
                        height: 36,
                        padding: '0 14px',
                        fontWeight: 700,
                      }}
                      onClick={handleOrderClick}
                    >
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
                              <button className="dtfta-btn" type="button" style={ghostButtonStyle} onClick={handleOrderClick}>
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
                        border: '1px dashed #d5dee8',
                        backgroundColor: '#f8fafc',
                        padding: 24,
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
              <div
                style={{
                  ...widgetSurfaceStyle,
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 16,
                  border: `1px solid ${brandPalette.teal}50`,
                  background: `linear-gradient(145deg, #ffffff 0%, ${brandPalette.teal}1a 100%)`,
                  boxShadow: '0 14px 30px rgba(15,23,42,0.1)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: -30,
                    right: -22,
                    width: 96,
                    height: 96,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${brandPalette.teal}36 0%, ${brandPalette.teal}00 72%)`,
                    pointerEvents: 'none',
                  }}
                />
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

              <div
                style={{
                  ...widgetSurfaceStyle,
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 16,
                  border: `1px solid ${brandPalette.violet}4f`,
                  background: `linear-gradient(145deg, #ffffff 0%, ${brandPalette.violet}16 48%, ${brandPalette.blue}12 100%)`,
                  boxShadow: '0 14px 30px rgba(15,23,42,0.1)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: -26,
                    left: -20,
                    width: 88,
                    height: 88,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${brandPalette.violet}33 0%, ${brandPalette.violet}00 72%)`,
                    pointerEvents: 'none',
                  }}
                />
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
                    <span style={{ color: '#1e293b' }}>{dashboardStats.fulfillmentRate.toFixed(1)}%</span>
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
                        background: `linear-gradient(90deg, ${brandPalette.blue} 0%, ${brandPalette.violet} 100%)`,
                      }}
                    />
                  </div>
                </BlockStack>
              </div>

              <div
                style={{
                  ...widgetSurfaceStyle,
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 16,
                  border: `1px solid ${brandPalette.green}54`,
                  background: `linear-gradient(145deg, #ffffff 0%, ${brandPalette.green}14 100%)`,
                  boxShadow: '0 14px 30px rgba(15,23,42,0.1)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: -18,
                    right: -12,
                    width: 78,
                    height: 78,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${brandPalette.green}30 0%, ${brandPalette.green}00 72%)`,
                    pointerEvents: 'none',
                  }}
                />
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
                      className="dtfta-btn"
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

              <div
                style={{
                  ...widgetSurfaceStyle,
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 16,
                  border: `1px solid ${brandPalette.pink}55`,
                  background: `linear-gradient(145deg, #ffffff 0%, ${brandPalette.pink}12 50%, ${brandPalette.orange}12 100%)`,
                  boxShadow: '0 14px 30px rgba(15,23,42,0.1)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    bottom: -20,
                    right: -10,
                    width: 76,
                    height: 76,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${brandPalette.pink}2d 0%, ${brandPalette.pink}00 72%)`,
                    pointerEvents: 'none',
                  }}
                />
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
                  <button className="dtfta-btn" type="button" style={secondaryButtonStyle} onClick={handleProductClick}>
                    Manage catalog
                  </button>
                  <button className="dtfta-btn" type="button" style={secondaryButtonStyle} onClick={handleOrderClick}>
                    Review order queue
                  </button>
                </BlockStack>
              </div>
            </BlockStack>
          </div>
        </InlineStack>
      </BlockStack>
    </Page>
  );
}