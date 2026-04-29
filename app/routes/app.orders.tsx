import { useEffect, useState } from 'react';
import type { LoaderFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Badge,
} from '@shopify/polaris';
import { authenticate } from '../shopify.server';
import type { BillingStatus, Order, OrderStatus } from '../types';
import { createExternalApiHeaders } from '../lib/external-api.server';
import AppHeroBanner from '../common/AppHeroBanner';

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
  const status = typeof statusRaw === 'string' ? (statusRaw as OrderStatus) : 'New';
  const customerName = typeof customerRaw.name === 'string' ? customerRaw.name : 'Unknown';
  const customerEmail = typeof customerRaw.email === 'string' ? customerRaw.email : '';
  const date = typeof dateRaw === 'string' ? dateRaw : '';

  if (!id) return null;

  return {
    id,
    orderNumber,
    status,
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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const API_BASE = process.env.EXTERNAL_API_BASE || '/api';
  const headers = createExternalApiHeaders('', { 'X-Shop': shop });

  try {
    const candidates = [
      `${API_BASE}/orders-signed?shop=${encodeURIComponent(shop)}`,
      `${API_BASE}/orders?shop=${encodeURIComponent(shop)}`,
    ];

    let raw: unknown = [];
    for (const url of candidates) {
      const res = await fetch(url, { headers });
      if (!res.ok) continue;
      raw = await res.json();
      break;
    }

    const rows = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as { data?: unknown[] })?.data)
        ? (raw as { data: unknown[] }).data
        : [];

    const orders = rows
      .map(normalizeOrder)
      .filter((order): order is Order => order !== null);

    return { orders };
  } catch {
    return { orders: [] };
  }
};

export default function Orders() {
  const loaderData = useLoaderData<typeof loader>() as { orders?: Order[] } | undefined;
  const [orders] = useState<Order[]>((loaderData && loaderData.orders) || []);
  const [selectedOrderFilter, setSelectedOrderFilter] = useState<OrderStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const getBadgeTone = (status: OrderStatus): 'success' | 'attention' | 'info' | 'critical' | 'warning' => {
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

  const filteredOrders = orders.filter((order) => {
    const matchesFilter = selectedOrderFilter === 'All' || order.status === selectedOrderFilter;
    const matchesSearch =
      searchQuery === '' ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.email.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const filters: (OrderStatus | 'All')[] = [
    'All',
    'New',
    'In Production',
    'Shipped',
    'Artwork Needed',
  ];

  const surfaceStyle = {
    borderRadius: 14,
    border: '1px solid #dbe3ec',
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
    padding: 16,
    boxShadow: '0 10px 24px rgba(15,23,42,0.07)',
  } as const;

  const searchFiltersPanelStyle = {
    borderRadius: 14,
    border: '1px solid #dbe3ec',
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
    padding: 16,
    boxShadow: '0 10px 24px rgba(15,23,42,0.07)',
  } as const;

  const searchPanelAccentBar = {
    height: 3,
    marginTop: -16,
    marginLeft: -16,
    marginRight: -16,
    marginBottom: 14,
    borderRadius: '14px 14px 0 0',
    background: 'linear-gradient(90deg, #ff7a00 0%, #ff4da6 55%, #47b0a1 100%)',
  } as const;

  const primaryButtonStyle = {
    borderRadius: 10,
    border: '1px solid transparent',
    height: 36,
    padding: '0 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 200ms ease',
    transform: 'translateY(0)',
    background: 'linear-gradient(135deg, #ff7a00 0%, #ff4da6 100%)',
    color: '#ffffff',
    boxShadow: '0 10px 20px rgba(246,98,110,0.32)',
  } as const;

  const secondaryButtonStyle = {
    borderRadius: 10,
    border: '1px solid #cbd5e1',
    height: 34,
    padding: '0 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 200ms ease',
    transform: 'translateY(0)',
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
    color: '#0f172a',
    boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
  } as const;

  const getOrderAccentColor = (status: OrderStatus) => {
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

  const orderGuideRows: { status: OrderStatus; detail: string }[] = [
    { status: 'New', detail: 'Order received, awaiting processing.' },
    { status: 'In Production', detail: 'Currently being printed.' },
    { status: 'Shipped', detail: 'Order has been shipped with tracking.' },
    { status: 'Artwork Needed', detail: 'Missing design files.' },
    { status: 'Exception', detail: 'Issue with order that needs attention.' },
  ];

  return (
    <Page fullWidth>
      <style>
        {`
          @keyframes orders-accent-flow {
            0%, 100% { opacity: 1; filter: brightness(1); }
            50% { opacity: 0.92; filter: brightness(1.06); }
          }
          @keyframes orders-orb-drift {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(6px, -4px) scale(1.04); }
          }
          @keyframes orders-empty-shimmer {
            0% { background-position: 0% 50%; }
            100% { background-position: 200% 50%; }
          }
          .orders-search-panel {
            position: relative;
            overflow: hidden;
          }
          .orders-search-panel::before {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: 14px;
            opacity: 0.22;
            background-image: radial-gradient(circle at center, #94a3b8 0.85px, transparent 1px);
            background-size: 20px 20px;
            pointer-events: none;
            mask-image: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.12) 45%, rgba(0,0,0,0.35) 100%);
          }
          .orders-search-accent {
            animation: orders-accent-flow 5s ease-in-out infinite;
          }
          .orders-search-glow {
            position: absolute;
            width: 120px;
            height: 120px;
            border-radius: 50%;
            right: -40px;
            bottom: -50px;
            background: radial-gradient(circle, rgba(255, 122, 0, 0.12) 0%, transparent 70%);
            pointer-events: none;
            animation: orders-orb-drift 12s ease-in-out infinite;
          }
          .orders-filter-chip {
            transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
          }
          .orders-filter-chip:hover {
            transform: translateY(-2px);
            border-color: rgba(255, 122, 0, 0.35);
            box-shadow: 0 8px 18px rgba(15, 23, 42, 0.1);
          }
          .orders-filter-active {
            animation: orders-accent-flow 4s ease-in-out infinite;
          }
          .orders-order-card {
            position: relative;
            overflow: hidden;
            transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 240ms ease;
          }
          .orders-order-card::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, rgba(255,122,0,0.2) 0%, rgba(255,77,166,0.2) 50%, rgba(71,176,161,0.2) 100%);
            opacity: 0;
            transition: opacity 240ms ease;
            pointer-events: none;
          }
          .orders-order-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 16px 36px rgba(15, 23, 42, 0.1);
          }
          .orders-order-card:hover::before {
            opacity: 1;
          }
          .orders-empty-canvas {
            position: relative;
            overflow: hidden;
          }
          .orders-empty-canvas::after {
            content: "";
            position: absolute;
            inset: -1px;
            border-radius: 14px;
            background: linear-gradient(
              120deg,
              rgba(255, 122, 0, 0.06),
              rgba(255, 77, 166, 0.05),
              rgba(71, 176, 161, 0.06),
              rgba(255, 122, 0, 0.06)
            );
            background-size: 200% 200%;
            animation: orders-empty-shimmer 14s linear infinite;
            opacity: 0.45;
            pointer-events: none;
            z-index: 0;
          }
          .orders-empty-inner {
            position: relative;
            z-index: 1;
          }
          .orders-sidebar-orb {
            animation: orders-orb-drift 14s ease-in-out infinite;
          }
          .orders-sidebar-orb-2 {
            animation: orders-orb-drift 16s ease-in-out infinite reverse;
          }
          .orders-hero-stat {
            backdrop-filter: blur(6px);
          }
          @media (prefers-reduced-motion: reduce) {
            .orders-search-accent,
            .orders-search-glow,
            .orders-filter-active,
            .orders-empty-canvas::after,
            .orders-sidebar-orb,
            .orders-sidebar-orb-2 {
              animation: none !important;
            }
            .orders-order-card:hover {
              transform: none;
            }
          }
        `}
      </style>
      <div style={{ maxWidth: 1420, margin: '0 auto', width: '100%' }}>
      <BlockStack gap="500">
        <AppHeroBanner
          title="Order Operations"
          subtitle="Track production status, search customer orders, and prioritize fulfillment in one place."
          badges={<Badge tone="info">Live Queue</Badge>}
          actions={
            <>
              <button type="button" className="orders-hero-stat" style={secondaryButtonStyle}>
                Total: {orders.length}
              </button>
              <button type="button" className="orders-hero-stat" style={secondaryButtonStyle}>
                Filter: {selectedOrderFilter}
              </button>
            </>
          }
        />

          <InlineStack align="start" gap="500" blockAlign="start">
            <div style={{ flex: '1', minWidth: 0 }}>
              <BlockStack gap="500">
                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="h2" variant="headingMd">
                          Order Management
                        </Text>
                        <Badge tone="info">Advanced</Badge>
                      </InlineStack>
                    </InlineStack>

                  <div className="orders-search-panel" style={searchFiltersPanelStyle}>
                    <div
                      className="orders-search-accent"
                      style={searchPanelAccentBar}
                      aria-hidden
                    />
                    <div className="orders-search-glow" aria-hidden />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                    <BlockStack gap="300">
                      <TextField
                        label="Search Orders"
                        placeholder="Search by order number, customer, or email"
                        value={searchQuery}
                        onChange={(value) => setSearchQuery(value)}
                        autoComplete="off"
                      />
                      <InlineStack gap="200">
                        {filters.map((filter) => (
                          <button
                            type="button"
                            key={filter}
                            className={
                              selectedOrderFilter === filter
                                ? 'orders-filter-active'
                                : 'orders-filter-chip'
                            }
                            style={
                              selectedOrderFilter === filter ? primaryButtonStyle : secondaryButtonStyle
                            }
                            onClick={() => setSelectedOrderFilter(filter)}
                          >
                            {filter}
                          </button>
                        ))}
                      </InlineStack>
                    </BlockStack>
                    </div>
                  </div>

                  <BlockStack gap="300">
                    {filteredOrders.length === 0 ? (
                      <div
                        className="orders-empty-canvas"
                        style={{
                          borderRadius: 14,
                          border: '1px solid #e2e8f0',
                          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                          padding: '32px 24px',
                          boxShadow: '0 10px 28px rgba(15,23,42,0.06)',
                        }}
                      >
                        <div className="orders-empty-inner">
                        <BlockStack gap="200" align="center">
                          <Text as="p" variant="bodyMd" alignment="center">
                            No orders found matching your criteria.
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                            Try changing filter or search by order number and customer email.
                          </Text>
                        </BlockStack>
                        </div>
                      </div>
                    ) : (
                      filteredOrders.map((order) => (
                        <div
                          key={order.id}
                          className="orders-order-card"
                          style={{
                            ...surfaceStyle,
                            borderLeft: `4px solid ${getOrderAccentColor(order.status)}`,
                          }}
                        >
                          <BlockStack gap="300">
                            <InlineStack align="space-between" blockAlign="start">
                              <BlockStack gap="100">
                                <InlineStack gap="200" blockAlign="center">
                                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                                    Order #{order.orderNumber}
                                  </Text>
                                  <Badge tone={getBadgeTone(order.status)}>
                                    {order.status}
                                  </Badge>
                                </InlineStack>
                                <Text as="p" variant="bodySm">
                                  {order.customer.name}, {order.customer.email}
                                </Text>
                                <Text as="p" variant="bodySm" tone="subdued">
                                  Date: {order.date}
                                </Text>
                              </BlockStack>
                              {/* <button type="button" style={secondaryButtonStyle}>
                                View Details
                              </button> */}
                            </InlineStack>

                              <BlockStack gap="100">
                                {order.items.map((item, index) => (
                                  <Text key={index} as="p" variant="bodySm">
                                    {item.quantity}x {item.name}
                                  </Text>
                                ))}
                              </BlockStack>

                              {order.tracking && (
                                <Text as="p" variant="bodySm">
                                  Tracking: {order.tracking}
                                </Text>
                              )}
                            </BlockStack>
                          </div>
                        ))
                      )}
                    </BlockStack>
                  </BlockStack>
                </Card>
              </BlockStack>
            </div>

          <div style={{ minWidth: '280px', maxWidth: '320px', flexShrink: 0 }}>
              <div
                style={{
                  ...surfaceStyle,
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 16,
                  border: '1px solid rgba(71,176,161,0.31)',
                  background: 'linear-gradient(145deg, #ffffff 0%, rgba(71,176,161,0.10) 100%)',
                  boxShadow: '0 14px 30px rgba(15,23,42,0.1)',
                }}
              >
                <div
                  className="orders-sidebar-orb"
                  style={{
                    position: 'absolute',
                    top: -30,
                    right: -22,
                    width: 96,
                    height: 96,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(71,176,161,0.21) 0%, rgba(71,176,161,0) 72%)',
                    pointerEvents: 'none',
                  }}
                />
                <div
                  className="orders-sidebar-orb-2"
                  style={{
                    position: 'absolute',
                    bottom: -24,
                    left: -20,
                    width: 88,
                    height: 88,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,122,0,0.12) 0%, rgba(255,122,0,0) 72%)',
                    pointerEvents: 'none',
                  }}
                />
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Order Status Guide
                    </Text>
                    <Badge tone="success">Reference</Badge>
                  </InlineStack>
                  <div
                    style={{
                      borderRadius: 10,
                      backgroundColor: '#f8fafc',
                      padding: 12,
                    }}
                  >
                    <BlockStack gap="300">
                      {orderGuideRows.map((row) => (
                        <InlineStack key={row.status} gap="200" blockAlign="start" wrap={false}>
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 999,
                              marginTop: 5,
                              flexShrink: 0,
                              background: getOrderAccentColor(row.status),
                              boxShadow: '0 0 0 2px rgba(255,255,255,0.95)',
                            }}
                          />
                          <BlockStack gap="050">
                            <Text as="p" variant="bodyMd" fontWeight="semibold">
                              {row.status}
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              {row.detail}
                            </Text>
                          </BlockStack>
                        </InlineStack>
                      ))}
                    </BlockStack>
                  </div>
                </BlockStack>
              </div>
          </div>
        </InlineStack>
        <div style={{ marginBottom: 32 }} />
      </BlockStack>
      </div>
    </Page>
  );
}