import { useState } from 'react';
import type { LoaderFunctionArgs } from 'react-router';
import { useLoaderData, useNavigate } from 'react-router';
import {
  Page,
  Card,
  BlockStack,
  Text,
  InlineGrid,
  List,
  InlineStack,
  Button,
} from '@shopify/polaris';
import { authenticate } from '../shopify.server';
import { createExternalApiHeaders } from '../lib/external-api.server';
import {
  resolveProductKeyFromApiProduct,
  getPlaceholderImageForApiProduct,
  getPlaceholderProducts,
} from '../lib/dtfta-products.server';
import ProductCard from '../common/ProductCard';
import type { Product } from '../types';

export type ProductWithKey = Product & { productKey?: string };

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const API_BASE = process.env.EXTERNAL_API_BASE || '/api';
  const headers = createExternalApiHeaders("", { "X-Shop": shop });

  try {
    const res = await fetch(`${API_BASE}/products/get?shop_id=${encodeURIComponent(shop)}`, { headers });
    const response = await res.json();
    //const rawProducts: Product[] = res.ok ? await res.json() : [];
    const rawProducts: Product[] = Array.isArray(response?.data) ? response.data : [];

    if (rawProducts.length === 0) {
      return { products: getPlaceholderProducts() as ProductWithKey[] };
    }
    const products: ProductWithKey[] = rawProducts.map((p) => {
      const productKey = resolveProductKeyFromApiProduct(p);
      const placeholderImage = getPlaceholderImageForApiProduct(p);

      return {
        ...p,
        productKey: productKey ?? undefined,
        image: p.image?.trim() ? p.image : placeholderImage ?? p.image,
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
                    onToggleFavorite={(pid) => {
                      setProducts((prev) =>
                        prev.map((p) => (p.id === pid ? { ...p, isFavorite: !p.isFavorite } : p))
                      );
                    }}
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

              {selectedProductData && (
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => {
                    const productKey = (selectedProductData as ProductWithKey).productKey ?? selectedProductData.id;
                    navigate(
                      `/app/products/customize?productId=${encodeURIComponent(selectedProductData.id)}&productKey=${encodeURIComponent(productKey)}`
                    );
                  }}
                >
                  Customize and add to store
                </Button>
              )}
            </BlockStack>
          </Card>
        </div>
      </InlineStack>
    </Page>
  );
}
