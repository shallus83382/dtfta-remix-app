// Shared types extracted from previous store implementation
export type OrderStatus = 'New' | 'In Production' | 'Shipped' | 'Artwork Needed' | 'Exception';

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customer: {
    name: string;
    email: string;
  };
  date: string;
  items: Array<{
    quantity: number;
    name: string;
    sku?: string;
  }>;
  tracking?: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  model: string;
  price: number;
  currency: string;
  image: string;
  isBestseller?: boolean;
  category: string;
  isFavorite?: boolean;
}

export interface DashboardStats {
  totalOrders: number;
  pending: number;
  inProduction: number;
  shipped: number;
  exceptions: number;
  fulfillmentRate: number;
}

export interface BrandSettings {
  brandName: string;
  returnAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  supportContact: {
    email: string;
    phone?: string;
  };
}

export interface SetupStatus {
  fulfillmentServiceConnected: boolean;
  locationCreated: boolean;
}

/** Design payload sent to Laravel create-in-shopify endpoint */
export interface CreateInShopifyPayload {
  shop: string;
  productKey: string;
  title?: string;
  printPlan: string;
  artworkUrls: { front?: string; back?: string };
}

