import { useEffect } from 'react';
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
  Box,
} from '@shopify/polaris';
import { authenticate } from '../shopify.server';
import { useAppStore } from '../store/useAppStore';
import ProductCard from '../common/ProductCard';
import { getFulfillmentStatus } from '../lib/fulfillment.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  const fulfillmentStatus = await getFulfillmentStatus(session.shop);

  // If authenticate.admin() succeeds without error, app IS connected
  return {
    isConnected: true,
    shop: session.shop,
    shopDomain: session.shop,
    hasAccessToken: !!session.accessToken,
    scopes: session.scope,
    fulfillmentStatus,
  };
};

export default function Dashboard() {
  const navigate = useNavigate();
  const loaderData = useLoaderData<typeof loader>();
  const { 
    dashboardStats, 
    orders, 
    fetchOrders, 
    fetchDashboardStats,
    products,
    fetchProducts,
    toggleFavorite,
    isOnboardingComplete,
    isBrandSettingsComplete,
    setupStatus,
    updateSetupStatus
  } = useAppStore();

  // Sync fulfillment status from loader into the client store
  useEffect(() => {
    if (loaderData?.fulfillmentStatus) {
      updateSetupStatus({
        fulfillmentServiceConnected: loaderData.fulfillmentStatus.fulfillmentServiceConnected,
        locationCreated: loaderData.fulfillmentStatus.locationCreated,
      });
    }
  }, [loaderData, updateSetupStatus]);

  // Check onboarding status - redirect to onboarding if not complete
  useEffect(() => {
    if (!isOnboardingComplete || !isBrandSettingsComplete()) {
      navigate('/app/onboarding');
    }
  }, [isOnboardingComplete, isBrandSettingsComplete, navigate]);

  useEffect(() => {
    fetchOrders();
    fetchDashboardStats();
    fetchProducts();
  }, [fetchOrders, fetchDashboardStats, fetchProducts]);

  const recentOrders = orders.slice(0, 3);
  const featuredProducts = products.filter(p => p.isBestseller).slice(0, 4);

  const getBadgeTone = (status: string): 'success' | 'attention' | 'info' | 'critical' | 'warning' => {
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
  
        {/* ✅ GREEN CONNECTION BANNER */}
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
          {/* ================= LEFT SIDE ================= */}
          <div style={{ flex: '1', minWidth: 0 }}>
            <BlockStack gap="500">

              {/* ✅ STATS ROW */}
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

              {/* ✅ FEATURED PRODUCTS */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Featured Products
                  </Text>

                  <Text as="p" tone="subdued">
                    Browse our best-selling print-on-demand products. Click on any
                    product to customize and add it to your store.
                  </Text>

                  <InlineGrid columns={{ xs: 1, sm: 4 }} gap="400">
                    {featuredProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onToggleFavorite={toggleFavorite}
                        showFavorite
                        variant="compact"
                      />
                    ))}
                  </InlineGrid>

                  <Link url="/app/products">
                    View All Products →
                  </Link>
                </BlockStack>
              </Card>

            </BlockStack>
          </div>

          {/* ================= RIGHT SIDE ================= */}
          <div style={{ minWidth: '280px', maxWidth: '320px', flexShrink: 0 }}>
            <BlockStack gap="500">
  
              {/* ✅ CONNECTION STATUS CARD */}
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
                      tone={
                        setupStatus.fulfillmentServiceConnected
                          ? 'success'
                          : 'critical'
                      }
                      fontWeight="semibold"
                    >
                      {setupStatus.fulfillmentServiceConnected
                        ? '✓ Connected'
                        : '✗ Not Connected'}
                    </Text>
                  </InlineStack>
  
                  <InlineStack align="space-between">
                    <Text as="span">Location Created</Text>
                    <Text
                      as="span"
                      tone={
                        setupStatus.locationCreated ? 'success' : 'critical'
                      }
                      fontWeight="semibold"
                    >
                      {setupStatus.locationCreated
                        ? '✓ Created'
                        : '✗ Not Created'}
                    </Text>
                  </InlineStack>
                </BlockStack>
              </Card>
  
              {/* ✅ FULFILLMENT STATUS */}
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Fulfillment Status
                  </Text>
                  <Text as="h2" variant="headingLg">
                    Fulfillment Rate: {dashboardStats.fulfillmentRate.toFixed(1)}%
                  </Text>
                  <Text as="p" tone="subdued">
                    Your orders are being processed efficiently. All shipments are
                    handled with white-label branding as configured in your
                    settings.
                  </Text>
                </BlockStack>
              </Card>
  
              {/* ✅ RECENT ORDERS */}
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
                          <Badge tone={getBadgeTone(order.status)}>
                            {order.status}
                          </Badge>
                        </InlineStack>
  
                        <Text as="p">{order.customer.name}</Text>
                        <Text as="p" tone="subdued">
                          {order.date}
                        </Text>
                      </BlockStack>
                    </Card>
                  ))}
  
                  <Link url="/app/orders">
                    View All Orders
                  </Link>
                </BlockStack>
              </Card>

            </BlockStack>
          </div>
        </InlineStack>
      </BlockStack>
    </Page>
  );
}
