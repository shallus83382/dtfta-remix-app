import { useEffect, useState } from 'react';
import type { LoaderFunctionArgs } from 'react-router';
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Button,
  Badge,
  InlineGrid,
} from '@shopify/polaris';
import { authenticate } from '../shopify.server';
import { useAppStore, OrderStatus } from '../store/useAppStore';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Orders() {
  const {
    orders,
    selectedOrderFilter,
    setSelectedOrderFilter,
    fetchOrders,
  } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

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

  return (
    <Page title="Orders">
      <InlineStack align="start" gap="500" blockAlign="start">
        <div style={{ flex: '1', minWidth: 0 }}>
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Order Management
                </Text>
                
                {/* Search */}
                <TextField
                  label="Search Orders"
                  placeholder="Search by order number, customer, or email"
                  value={searchQuery}
                  onChange={(value) => setSearchQuery(value)}
                  autoComplete="off"
                />

                {/* Filters */}
                <InlineStack gap="200">
                  {filters.map((filter) => (
                    <Button
                      key={filter}
                      variant={selectedOrderFilter === filter ? 'primary' : 'secondary'}
                      onClick={() => setSelectedOrderFilter(filter)}
                    >
                      {filter}
                    </Button>
                  ))}
                </InlineStack>

                {/* Order List */}
                <BlockStack gap="300">
                  {filteredOrders.length === 0 ? (
                    <Card>
                      <BlockStack gap="200" align="center">
                        <Text as="p" variant="bodyMd" alignment="center">
                          No orders found matching your criteria.
                        </Text>
                      </BlockStack>
                    </Card>
                  ) : (
                    filteredOrders.map((order) => (
                      <Card key={order.id}>
                        <BlockStack gap="300">
                          <InlineStack align="space-between" blockAlign="start">
                            <BlockStack gap="200">
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
                            <Button>View Details</Button>
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
                      </Card>
                    ))
                  )}
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </div>

        <div style={{ minWidth: '280px', maxWidth: '320px', flexShrink: 0 }}>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Order Status Guide
              </Text>
              <BlockStack gap="300">
                <BlockStack gap="100">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    New:
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Order received, awaiting processing.
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    In Production:
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Currently being printed.
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    Shipped:
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Order has been shipped with tracking.
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    Artwork Needed:
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Missing design files.
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    Exception:
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Issue with order that needs attention.
                  </Text>
                </BlockStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </div>
      </InlineStack>
    </Page>
  );
}
