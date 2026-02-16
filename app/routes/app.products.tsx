import { useEffect, useState } from 'react';
import type { LoaderFunctionArgs } from 'react-router';
import {
  Page,
  Card,
  BlockStack,
  Text,
  InlineGrid,
  List,
  InlineStack,
} from '@shopify/polaris';
import { authenticate } from '../shopify.server';
import { useAppStore } from '../store/useAppStore';
import ProductCard from '../common/ProductCard';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Products() {
  const { products, fetchProducts, toggleFavorite } = useAppStore();
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const selectedProductData = selectedProduct
    ? products.find((p) => p.id === selectedProduct)
    : null;

  return (
    <Page title="DTFTA Products" fullWidth>
      <InlineStack align="start" gap="500" blockAlign="start">
        <div style={{ flex: '1', minWidth: 0 }}>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Available Products
              </Text>
              <Text as="p" variant="bodyMd">
                Browse our catalog of print-on-demand products. Click on any product to
                customize and add it to your store.
              </Text>

              <InlineGrid columns={{ xs: 1, sm: 4 }} gap="400">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onToggleFavorite={toggleFavorite}
                    onClick={(productId) => setSelectedProduct(productId)}
                    isSelected={selectedProduct === product.id}
                    showFavorite={true}
                    variant="default"
                  />
                ))}
              </InlineGrid>
            </BlockStack>
          </Card>
        </div>

        <div style={{ minWidth: '280px', maxWidth: '320px', flexShrink: 0 }}>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Product Information
              </Text>
              <Text as="p" variant="bodyMd">
                All products are print-on-demand, meaning they are created only after
                an order is placed. No inventory management required.
              </Text>

              <List type="bullet">
                <List.Item>Full customization support</List.Item>
                <List.Item>White-label fulfillment</List.Item>
                <List.Item>US-based shipping</List.Item>
                <List.Item>Quality guaranteed</List.Item>
              </List>

              <Text as="p" variant="bodyMd">
                Click on any product card to start customizing and add it to your store.
              </Text>
            </BlockStack>
          </Card>
        </div>
      </InlineStack>
    </Page>
  );
}
