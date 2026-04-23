import { useState } from 'react';
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
import type { Order, OrderStatus } from '../types';
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
  const headers = createExternalApiHeaders("", { "X-Shop": shop });
  
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

    const rows = Array.isArray(raw) ? raw : Array.isArray((raw as { data?: unknown[] })?.data) ? (raw as { data: unknown[] }).data : [];
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
    const matchesFilter =
      selectedOrderFilter === 'All' || order.status === selectedOrderFilter;
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
    border: '1px solid #d7e0ea',
    background: 'linear-gradient(180deg, rgba(248,250,252,0.92) 0%, #ffffff 100%)',
    padding: 16,
    boxShadow: '0 10px 24px rgba(15,23,42,0.06)',
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

  return (
    <Page title="Orders" fullWidth>
      <BlockStack gap="500">
        <AppHeroBanner
          title="Order Operations"
          subtitle="Track production status, search customer orders, and prioritize fulfillment in one place."
          badges={<Badge tone="info">Live Queue</Badge>}
          actions={
            <>
              <button type="button" style={secondaryButtonStyle}>
                Total: {orders.length}
              </button>
              <button type="button" style={secondaryButtonStyle}>
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
                        style={selectedOrderFilter === filter ? primaryButtonStyle : secondaryButtonStyle}
                        onClick={() => setSelectedOrderFilter(filter)}
                      >
                        {filter}
                      </button>
                    ))}
                  </InlineStack>

                  <BlockStack gap="300">
                    {filteredOrders.length === 0 ? (
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
                            No orders found matching your criteria.
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                            Try changing filter or search by order number and customer email.
                          </Text>
                        </BlockStack>
                      </div>
                    ) : (
                      filteredOrders.map((order) => (
                        <div
                          key={order.id}
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

          <div style={{ minWidth: '320px', maxWidth: '360px', flexShrink: 0 }}>
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
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Order Status Guide
                    </Text>
                    <Badge tone="success">Reference</Badge>
                  </InlineStack>
                  <BlockStack gap="300">
                    <BlockStack gap="050">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        New
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Order received, awaiting processing.
                      </Text>
                    </BlockStack>
                    <BlockStack gap="050">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        In Production
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Currently being printed.
                      </Text>
                    </BlockStack>
                    <BlockStack gap="050">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        Shipped
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Order has been shipped with tracking.
                      </Text>
                    </BlockStack>
                    <BlockStack gap="050">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        Artwork Needed
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Missing design files.
                      </Text>
                    </BlockStack>
                    <BlockStack gap="050">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        Exception
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Issue with order that needs attention.
                      </Text>
                    </BlockStack>
                  </BlockStack>
                </BlockStack>
              </div>
          </div>
        </InlineStack>
      </BlockStack>
    </Page>
  );
}
