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
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { authenticate } from '../shopify.server';
import { createExternalApiHeaders } from '../lib/external-api.server';
import {
  resolveProductKeyFromApiProduct,
  getPlaceholderImageForApiProduct,
  normalizeDtftaProduct,
} from "../lib/dtfta-products.server";
import ProductCard from '../common/ProductCard';
import type { Order, Product, DashboardStats, BrandSettings, SetupStatus, BillingStatus } from '../types';
import {getProductDesignAssetUrl} from "../lib/design-assets";
import {
  brandAccentTint,
  brandColors,
  brandHeroBadgePillStyle,
  brandHeroBannerCtaStyle,
  brandOrange,
  brandPalette,
  brandPrimaryButtonBg,
  brandPrimaryCtaShadow,
} from '../lib/brand-theme';

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
  const statusValue = typeof statusRaw === 'string' ? statusRaw.trim().toLowerCase() : '';
  const status: Order['status'] =
    statusValue === 'billing_pending' || statusValue === 'billing pending'
      ? 'Billing Pending'
      : statusValue === 'in_production' ||
          statusValue === 'in production' ||
          statusValue === 'processing' ||
          statusValue === 'production' ||
          statusValue === 'printing'
        ? 'In Production'
        : statusValue === 'artwork_needed' || statusValue === 'artwork needed'
          ? 'Artwork Needed'
          : statusValue === 'shipped' ||
              statusValue === 'fulfilled' ||
              statusValue === 'completed' ||
              statusValue === 'delivered'
            ? 'Shipped'
            : statusValue === 'exception'
              ? 'Exception'
              : 'New';
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

function readStatNumber(row: Record<string, unknown>, camelKey: string, snakeKey: string): number {
  const raw = row[camelKey] ?? row[snakeKey];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function normalizeDashboardStatsFromApi(raw: unknown): DashboardStats | null {
  if (!raw || typeof raw !== 'object') return null;
  const top = raw as Record<string, unknown>;
  const row =
    top.data && typeof top.data === 'object' && !Array.isArray(top.data)
      ? (top.data as Record<string, unknown>)
      : top;

  return {
    totalOrders: readStatNumber(row, 'totalOrders', 'total_orders'),
    pending: readStatNumber(row, 'pending', 'pending_orders'),
    inProduction: readStatNumber(row, 'inProduction', 'in_production'),
    shipped: readStatNumber(row, 'shipped', 'shipped_orders'),
    exceptions: readStatNumber(row, 'exceptions', 'exceptions_count'),
    fulfillmentRate: readStatNumber(row, 'fulfillmentRate', 'fulfillment_rate'),
  };
}

/** Pipeline buckets aligned with dashboard cards: pre-production → Pending, active print → In Production, done → Shipped. */
function buildDashboardStatsFromOrders(orders: Order[]): DashboardStats {
  let pending = 0;
  let inProduction = 0;
  let shipped = 0;
  let exceptions = 0;

  for (const order of orders) {
    switch (order.status) {
      case 'In Production':
        inProduction += 1;
        break;
      case 'Shipped':
        shipped += 1;
        break;
      case 'Exception':
        exceptions += 1;
        break;
      case 'New':
      case 'Billing Pending':
      case 'Artwork Needed':
        pending += 1;
        break;
    }
  }

  const totalOrders = orders.length;
  const fulfillmentRate = totalOrders > 0 ? (shipped / totalOrders) * 100 : 0;

  return {
    totalOrders,
    pending,
    inProduction,
    shipped,
    exceptions,
    fulfillmentRate,
  };
}

function resolveDashboardStats(apiRaw: unknown, orders: Order[]): DashboardStats {
  if (orders.length > 0) {
    return buildDashboardStatsFromOrders(orders);
  }
  return normalizeDashboardStatsFromApi(apiRaw) ?? buildDashboardStatsFromOrders(orders);
}

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
  const dashboardStatsRaw = statsRes.status === 'fulfilled' ? await safeJson(statsRes.value) : null;
  const dashboardStats = resolveDashboardStats(dashboardStatsRaw, orders);
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
  const [newsActiveIndex, setNewsActiveIndex] = useState(0);
  const [setupStatus] = useState<SetupStatus>(
    loaderData?.fulfillmentStatus || {
      fulfillmentServiceConnected: false,
      locationCreated: false,
    }
  );
  const [billingStatus, setBillingStatus] = useState<BillingStatus>({
    status: 'inactive',
    required: false,
    lineItemId: null,
  });
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingError, setBillingError] = useState('');
  const [isGeneratingBillingLink, setIsGeneratingBillingLink] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    const loadBillingStatus = async () => {
      setBillingLoading(true);
      setBillingError('');
      try {
        const res = await fetch('/app/api/billing-status');
        const payload = await res.json();
        const isOk = Boolean(payload?.ok ?? payload?.success);
        if (!res.ok || !isOk) {
          throw new Error(payload?.error || payload?.message || 'Failed to load billing status.');
        }

        const normalizedStatus =
          payload?.billingStatus ?? payload?.data?.billing_status ?? payload?.billing_status ?? 'inactive';
        const normalizedRequired =
          payload?.isBillingRequired ?? payload?.data?.is_billing_required ?? payload?.is_billing_required ?? false;
        const normalizedLineItemId =
          payload?.lineItemId ?? payload?.data?.line_item_id ?? payload?.line_item_id ?? null;

        if (!cancelled) {
          setBillingStatus({
            status: normalizedStatus,
            required: Boolean(normalizedRequired),
            lineItemId: normalizedLineItemId,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setBillingError(error instanceof Error ? error.message : 'Failed to load billing status.');
        }
      } finally {
        if (!cancelled) setBillingLoading(false);
      }
    };
    loadBillingStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleProductClick = () => {
      navigate(`/app/products`);
  };

  const handleOrderClick = () => {
    navigate(`/app/orders`);
  };

  const handleActivateBilling = async () => {
    setIsGeneratingBillingLink(true);
    setBillingError('');
    try {
      const res = await fetch('/app/api/billing-approve', { method: 'POST' });
      const payload = await res.json();
      if (!res.ok || !payload?.ok || !payload?.confirmationUrl) {
        throw new Error(payload?.error || 'Unable to generate billing approval link.');
      }
      window.open(payload.confirmationUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : 'Unable to generate billing approval link.');
    } finally {
      setIsGeneratingBillingLink(false);
    }
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
      case 'Billing Pending':
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
      tone: brandPalette.orange,
      accent: brandAccentTint,
      highlight: '+12% this week',
    },
    {
      label: 'Pending',
      value: dashboardStats.pending,
      helper: 'Awaiting production start',
      tone: brandPalette.orange,
      accent: brandAccentTint,
      highlight: 'Prioritize these today',
    },
    {
      label: 'In Production',
      value: dashboardStats.inProduction,
      helper: 'Currently being fulfilled',
      tone: brandPalette.orange,
      accent: brandAccentTint,
      highlight: 'Running smoothly',
    },
    {
      label: 'Shipped',
      value: dashboardStats.shipped,
      helper: 'Completed and dispatched',
      tone: brandPalette.orange,
      accent: brandAccentTint,
      highlight: 'Delivery flow healthy',
    },
  ];

  const widgetSurfaceStyle: React.CSSProperties = {
    borderRadius: 14,
    border: '1px solid #dbe3ec',
    padding: 16,
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
    boxShadow: '0 10px 24px rgba(22,22,31,0.08)',
  };

  const panelSurfaceStyle: React.CSSProperties = {
    borderRadius: 14,
    border: '1px solid #dbe3ec',
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
    padding: 18,
    boxShadow: '0 12px 28px rgba(22,22,31,0.08)',
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
    background: brandPrimaryButtonBg,
    color: '#ffffff',
    boxShadow: brandPrimaryCtaShadow,
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    background: brandPrimaryButtonBg,
    color: '#ffffff',
    border: '1px solid transparent',
    boxShadow: brandPrimaryCtaShadow,
  };

  const ghostButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    height: 30,
    padding: '0 10px',
    background: brandPrimaryButtonBg,
    color: '#ffffff',
    border: '1px solid transparent',
    boxShadow: brandPrimaryCtaShadow,
  };

  const getOrderAccentColor = (status: string) => {
    if (status === 'Exception') return brandColors.text;
    return brandOrange;
  };

  const newsSlides = [
    {
      tag: 'New',
      title: '80% of merchants who expand to Etsy increase their sales within 3 months.',
      description:
        "We will help you to connect, optimize and publish your created products to Etsy so you don't lose any opportunities.",
      cta: 'Try Etsy',
      image: '/assets/customizer/product/long-sleeve-tee.jpg',
      leftSurface: '#f8963a',
      buttonBg: '#2f3308',
      icon: '✋',
    },
    {
      tag: 'Trending',
      title: 'Hoodies are performing strongly this month',
      description:
        'Create quick hoodie variants from your existing designs and publish them to capture seasonal demand.',
      cta: 'Launch hoodie collection',
      image: '/assets/customizer/product/heavy-blend-hoodie-front.png',
      leftSurface: '#f7f7f2',
      buttonBg: '#2f3308',
      icon: '↗',
    },
    {
      tag: 'Tip',
      title: 'Improve conversions with lifestyle product previews',
      description:
        'Use polished mockups and clear descriptions to build trust and increase add-to-cart rates.',
      cta: 'Optimize product pages',
      image: '/assets/customizer/product/unisex-tee-front.png',
      leftSurface: '#f7f7f2',
      buttonBg: '#2f3308',
      icon: '✓',
    },
  ] as const;

  return (
    <Page fullWidth>
      <style>
        {`
          .dtfta-news-swiper .swiper {
            width: 100%;
            overflow: hidden;
          }
          .dtfta-news-swiper {
            position: relative;
          }
          .dtfta-news-swiper .swiper-button-prev,
          .dtfta-news-swiper .swiper-button-next {
            display: none !important;
          }
          .dtfta-news-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            z-index: 6;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            border: 1px solid ${brandColors.surfaceBorder};
            background: rgba(255,255,255,0.96);
            color: ${brandColors.textSubtle};
            box-shadow: 0 6px 14px rgba(22,22,31,0.12);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 18px;
            line-height: 1;
            padding: 0;
          }
          .dtfta-news-nav-prev {
            left: 8px;
          }
          .dtfta-news-nav-next {
            right: 8px;
          }
          .dtfta-news-swiper .swiper-wrapper {
            display: flex;
            align-items: stretch;
          }
          .dtfta-news-swiper .swiper-slide {
            flex-shrink: 0;
            height: auto;
          }
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
          /* Polaris overrides; match orange-banner white chip CTAs */
          button.dtfta-hero-cta {
            background: #ffffff !important;
            color: #16161f !important;
            border: 2px solid #ff6a00 !important;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.14) !important;
          }
        `}
      </style>
      <div style={{ maxWidth: 1420, margin: '0 auto', width: '100%' }}>
      <BlockStack gap="500">
        <Card padding="0">
          <div
            style={{
              background: brandPrimaryButtonBg,
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
              `}
            </style>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(circle at 18% 22%, rgba(255,255,255,0.14) 0%, transparent 42%), radial-gradient(circle at 82% 76%, rgba(255,255,255,0.1) 0%, transparent 45%)',
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
                background: 'radial-gradient(circle, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 72%)',
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
                background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)',
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
                  <span style={{ color: '#ffffff', textShadow: '0 1px 10px rgba(22,22,31,0.32)' }}>
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
                  <span style={brandHeroBadgePillStyle}>Live Operations</span>
                  <span style={brandHeroBadgePillStyle}>{`${setupCompletionPercent}% setup complete`}</span>
                </InlineStack>
                <div
                  title={loaderData.shop}
                  style={{
                    ...brandHeroBadgePillStyle,
                    maxWidth: 300,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {loaderData.shop}
                </div>
              </InlineStack>

              <InlineStack gap="200">
                <button
                  className="dtfta-btn dtfta-hero-cta"
                  type="button"
                  style={brandHeroBannerCtaStyle}
                  onClick={handleProductClick}
                >
                  View Products
                </button>
                <button
                  className="dtfta-btn dtfta-hero-cta"
                  type="button"
                  style={brandHeroBannerCtaStyle}
                  onClick={handleOrderClick}
                >
                  View Orders
                </button>
                <span style={brandHeroBadgePillStyle}>
                  {`Billing: ${billingLoading ? 'Loading...' : billingStatus.status}`}
                </span>
                {billingStatus.required && billingStatus.status !== 'active' ? (
                  <button
                    type="button"
                    className="dtfta-btn dtfta-hero-cta"
                    style={{
                      ...brandHeroBannerCtaStyle,
                      opacity: isGeneratingBillingLink ? 0.7 : 1,
                      cursor: isGeneratingBillingLink ? 'not-allowed' : 'pointer',
                    }}
                    onClick={handleActivateBilling}
                    disabled={isGeneratingBillingLink}
                  >
                    {isGeneratingBillingLink ? 'Preparing billing link...' : 'Activate Billing'}
                  </button>
                ) : null}
              </InlineStack>
              {billingError ? (
                <div
                  role="alert"
                  style={{
                    borderRadius: 10,
                    padding: '10px 12px',
                    maxWidth: 520,
                    background: 'rgba(255, 255, 255, 0.95)',
                    border: `1px solid ${brandColors.text}`,
                    color: brandColors.text,
                    fontSize: 13,
                    fontWeight: 600,
                    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)',
                  }}
                >
                  {billingError}
                </div>
              ) : null}
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
                  : '0 6px 14px rgba(22,22,31,0.05)',
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
                  <span style={{ color: brandColors.text }}>Growth Snapshot</span>
                </Text>
                <Text as="p" variant="bodySm">
                  <span style={{ color: brandColors.textMuted }}>
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
                  : '0 6px 14px rgba(22,22,31,0.05)',
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
                  <span style={{ color: brandColors.text }}>Fulfillment Pulse</span>
                </Text>
                <Text as="p" variant="bodySm">
                  <span style={{ color: brandColors.textMuted }}>
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
                  : '0 6px 14px rgba(22,22,31,0.05)',
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
                <span style={{ color: brandColors.text }}>Connection Healthy</span>
              </Text>
              <Text as="p" variant="bodySm">
                <span style={{ color: brandColors.textMuted }}>Access token active for this session</span>
              </Text>
            </BlockStack>
          </div>
        </InlineGrid>

        <div style={{ paddingTop: 28, paddingBottom: 28 }}>
          <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingLg">
                  News, offers, trends and more
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {newsSlides.length} updates
                </Text>
              </InlineStack>
              <div className="dtfta-news-swiper" style={{ marginTop: 10 }}>
                <button type="button" className="dtfta-news-nav dtfta-news-nav-prev" aria-label="Previous">
                  ‹
                </button>
                <button type="button" className="dtfta-news-nav dtfta-news-nav-next" aria-label="Next">
                  ›
                </button>
                <Swiper
                  modules={[Autoplay, Navigation]}
                  slidesPerView={1}
                  spaceBetween={24}
                  loop
                  speed={700}
                  navigation={{ prevEl: '.dtfta-news-nav-prev', nextEl: '.dtfta-news-nav-next' }}
                  autoplay={{ delay: 3200, disableOnInteraction: false, pauseOnMouseEnter: true }}
                  onSlideChange={(swiper) => setNewsActiveIndex(swiper.realIndex)}
                  breakpoints={{
                    1024: {
                      slidesPerView: 1.5,
                      spaceBetween: 24,
                    },
                  }}
                >
                  {newsSlides.map((slide) => (
                    <SwiperSlide key={slide.title}>
                      <div
                        style={{
                          borderRadius: 12,
                          background: '#ffffff',
                          padding: 12,
                        }}
                      >
                        <InlineGrid columns={{ xs: 1, md: '2fr 3fr' }} gap="200">
                          <div
                            style={{
                              borderRadius: 10,
                              overflow: 'hidden',
                              minHeight: 260,
                              background: '#ffffff',
                            }}
                          >
                            <img
                              src={slide.image}
                              alt={slide.title}
                              style={{ width: '100%', height: 260, objectFit: 'cover' }}
                            />
                          </div>
                          <div
                            style={{
                              borderRadius: 10,
                              background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                              padding: 24,
                              minHeight: 260,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              gap: 14,
                            }}
                          >
                            <div>
                              <Badge tone="info">{slide.tag}</Badge>
                            </div>
                            <Text as="h3" variant="headingXl">
                              <span style={{ color: brandColors.text, letterSpacing: '-0.01em' }}>{slide.title}</span>
                            </Text>
                            <Text as="p" variant="bodyMd">
                              <span style={{ color: brandColors.textMuted, fontWeight: 500 }}>{slide.description}</span>
                            </Text>
                            <div>
                              <button
                                className="dtfta-btn"
                                type="button"
                                style={{
                                  ...primaryButtonStyle,
                                  height: 40,
                                  padding: '0 18px',
                                  fontWeight: 700,
                                }}
                                onClick={handleProductClick}
                              >
                                {slide.cta}
                              </button>
                            </div>
                          </div>
                        </InlineGrid>
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
                <div
                  style={{
                    marginTop: 8,
                    marginLeft: 6,
                    width: 92,
                    height: 6,
                    borderRadius: 999,
                    background: '#d1d5db',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${((newsActiveIndex + 1) / newsSlides.length) * 100}%`,
                      height: '100%',
                      borderRadius: 999,
                      background: '#737373',
                      transition: 'width 220ms ease',
                    }}
                  />
                </div>
              </div>
          </BlockStack>
        </div>

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
                          : '0 14px 28px rgba(22,22,31,0.12)',
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
                          <span style={{ color: brandColors.textSubtle }}>{item.label}</span>
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
                          <span style={{ color: brandColors.text }}>{item.value.toString()}</span>
                      </Text>
                      <Text as="p" variant="bodySm">
                        <span style={{ color: brandColors.textMuted }}>{item.helper}</span>
                      </Text>
                      <Text as="p" variant="bodySm">
                        <span style={{ color: item.tone, fontWeight: 700 }}>{item.highlight}</span>
                      </Text>
                      </BlockStack>
                    </div>
                  </div>
                ))}
              </InlineGrid>

              <div style={{ paddingTop: 12, paddingBottom: 12 }}>
                <BlockStack gap="300">
                  <div
                    style={{
                      borderRadius: 14,
                      border: '1px solid #e5e7eb',
                      background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                      boxShadow: '0 8px 18px rgba(22,22,31,0.05)',
                      padding: '12px 14px',
                    }}
                  >
                  <InlineStack align="space-between" blockAlign="center">
                    <div
                      style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        padding: '8px 10px 8px 16px',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 10,
                          bottom: 10,
                          width: 4,
                          borderRadius: 999,
                          background: brandPrimaryButtonBg,
                        }}
                      />
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="h2" variant="headingLg">
                          <span style={{ color: brandColors.text }}>Featured Products</span>
                        </Text>
                        <div
                          style={{
                            borderRadius: 999,
                            border: '1px solid #bae6fd',
                            background: '#e0f2fe',
                            color: brandColors.linkOnLight,
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '2px 10px',
                            lineHeight: '18px',
                          }}
                        >
                          Catalog
                        </div>
                      </InlineStack>
                      <Text as="p" variant="bodyMd">
                        <span style={{ color: brandColors.textSoft }}>
                          Curated top products ready for design customization and publishing.
                        </span>
                      </Text>
                    </div>
                    <button
                      className="dtfta-btn"
                      type="button"
                      style={{
                        ...primaryButtonStyle,
                        height: 40,
                        padding: '0 20px',
                        fontWeight: 700,
                        borderRadius: 12,
                        boxShadow: '0 12px 24px rgba(246,98,110,0.3)',
                      }}
                      onClick={handleProductClick}
                    >
                      View All Products
                    </button>
                  </InlineStack>
                  </div>

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
              </div>

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
                            boxShadow: '0 4px 14px rgba(22,22,31,0.05)',
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
                  background: 'linear-gradient(145deg, #ffffff 0%, rgba(255, 106, 0, 0.1) 100%)',
                  boxShadow: '0 14px 30px rgba(22,22,31,0.1)',
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
                  background: 'linear-gradient(145deg, #ffffff 0%, rgba(255, 106, 0, 0.09) 100%)',
                  boxShadow: '0 14px 30px rgba(22,22,31,0.1)',
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
                    <span style={{ color: brandColors.text }}>{dashboardStats.fulfillmentRate.toFixed(1)}%</span>
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
                        background: brandPrimaryButtonBg,
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
                  background: 'linear-gradient(145deg, #ffffff 0%, rgba(255, 106, 0, 0.08) 100%)',
                  boxShadow: '0 14px 30px rgba(22,22,31,0.1)',
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
                  background: 'linear-gradient(145deg, #ffffff 0%, rgba(255, 106, 0, 0.08) 100%)',
                  boxShadow: '0 14px 30px rgba(22,22,31,0.1)',
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
      </div>
    </Page>
  );
}