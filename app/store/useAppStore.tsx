import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Types
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
  exceptions: number; // Orders with "Exception" or "Artwork Needed" status
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

interface SetupStatus {
  fulfillmentServiceConnected: boolean;
  locationCreated: boolean;
}

interface AppStore {
  orders: Order[];
  products: Product[];
  dashboardStats: DashboardStats;
  brandSettings: BrandSettings | null;
  selectedOrderFilter: OrderStatus | 'All';
  isLoading: boolean;
  isOnboardingComplete: boolean;
  setupStatus: SetupStatus;
  
  // Actions
  setOrders: (orders: Order[]) => void;
  setProducts: (products: Product[]) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  setSelectedOrderFilter: (filter: OrderStatus | 'All') => void;
  setBrandSettings: (settings: BrandSettings) => void;
  toggleFavorite: (productId: string) => void;
  fetchOrders: () => void;
  fetchProducts: () => void;
  fetchDashboardStats: () => void;
  completeOnboarding: () => void;
  updateSetupStatus: (status: Partial<SetupStatus>) => void;
  isBrandSettingsComplete: () => boolean;
}

const AppStoreContext = createContext<AppStore | undefined>(undefined);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalOrders: 0,
    pending: 0,
    inProduction: 0,
    shipped: 0,
    exceptions: 0,
    fulfillmentRate: 0,
  });
  const [brandSettings, setBrandSettings] = useState<BrandSettings | null>(null);
  const [selectedOrderFilter, setSelectedOrderFilter] = useState<OrderStatus | 'All'>('All');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [setupStatus, setSetupStatus] = useState<SetupStatus>({
    fulfillmentServiceConnected: false,
    locationCreated: false,
  });

  // Initialize static data
  const initializeStaticData = () => {
    // Static products data
    const staticProducts: Product[] = [
      {
        id: '1',
        name: 'Unisex Tee',
        brand: 'Next Level',
        model: '6210',
        price: 12.99,
        currency: 'USD',
        image: '/assets/download.webp',
        isBestseller: true,
        category: 'TEE',
      },
      {
        id: '2',
        name: 'Long Sleeve Tee',
        brand: 'Next Level',
        model: '3601',
        price: 15.99,
        currency: 'USD',
        image: '/assets/download2.webp',
        isBestseller: true,
        category: 'LS',
      },
      {
        id: '3',
        name: 'Heavy Blend Hoodie',
        brand: 'Gildan',
        model: '18500',
        price: 28.99,
        currency: 'USD',
        image: '/assets/download3.webp',
        category: 'HOODIE',
      },
      {
        id: '4',
        name: 'Heavyweight Hoodie',
        brand: 'Cotton Heritage',
        model: 'M2650CH',
        price: 32.99,
        currency: 'USD',
        image: '/assets/download4.webp',
        category: 'HOODIE',
      },
    ];

    // Static orders data
    const staticOrders: Order[] = [
      {
        id: '1',
        orderNumber: '1001',
        status: 'Shipped',
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        date: '2024-02-05',
        items: [
          {
            quantity: 2,
            name: 'Unisex Tee (DTFTA-APP-TEE-NL-6210-BLK-XL)',
            sku: 'DTFTA-APP-TEE-NL-6210-BLK-XL',
          },
        ],
        tracking: '1Z999AA10123456784',
      },
      {
        id: '2',
        orderNumber: '1002',
        status: 'In Production',
        customer: {
          name: 'Jane Smith',
          email: 'jane@example.com',
        },
        date: '2024-02-05',
        items: [
          {
            quantity: 1,
            name: 'Heavy Blend Hoodie (DTFTA-APP-HOODIE-GD-18500-NAV-L)',
            sku: 'DTFTA-APP-HOODIE-GD-18500-NAV-L',
          },
        ],
      },
      {
        id: '3',
        orderNumber: '1003',
        status: 'New',
        customer: {
          name: 'Bob Johnson',
          email: 'bob@example.com',
        },
        date: '2024-02-04',
        items: [
          {
            quantity: 1,
            name: 'Long Sleeve Tee (DTFTA-APP-LS-NL-3601-HGR-L)',
            sku: 'DTFTA-APP-LS-NL-3601-HGR-L',
          },
        ],
      },
      {
        id: '4',
        orderNumber: '1004',
        status: 'Artwork Needed',
        customer: {
          name: 'Alice Williams',
          email: 'alice@example.com',
        },
        date: '2024-02-06',
        items: [
          {
            quantity: 1,
            name: 'Unisex Tee (DTFTA-APP-TEE-NL-6210-BLK-M)',
            sku: 'DTFTA-APP-TEE-NL-6210-BLK-M',
          },
        ],
      },
      {
        id: '5',
        orderNumber: '1005',
        status: 'Exception',
        customer: {
          name: 'Charlie Brown',
          email: 'charlie@example.com',
        },
        date: '2024-02-06',
        items: [
          {
            quantity: 1,
            name: 'Heavyweight Hoodie (DTFTA-APP-HOODIE-CH-M2650CH-CHAR-XL)',
            sku: 'DTFTA-APP-HOODIE-CH-M2650CH-CHAR-XL',
          },
        ],
      },
    ];

    setProducts(staticProducts);
    setOrders(staticOrders);
  };

  const fetchDashboardStats = useCallback(() => {
    setDashboardStats((prevStats) => {
      // This will be called with current orders state
      return prevStats;
    });
  }, []);

  const fetchOrders = useCallback(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      initializeStaticData();
      setIsLoading(false);
    }, 100);
  }, []);

  const fetchProducts = useCallback(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      initializeStaticData();
      setIsLoading(false);
    }, 100);
  }, []);

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId ? { ...order, status } : order
      )
    );
  };

  const toggleFavorite = (productId: string) => {
    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        product.id === productId
          ? { ...product, isFavorite: !product.isFavorite }
          : product
      )
    );
  };

  const isBrandSettingsComplete = useCallback(() => {
    if (!brandSettings) return false;
    return !!(
      brandSettings.brandName &&
      brandSettings.returnAddress.street &&
      brandSettings.returnAddress.city &&
      brandSettings.returnAddress.state &&
      brandSettings.returnAddress.zipCode &&
      brandSettings.supportContact.email
    );
  }, [brandSettings]);

  const completeOnboarding = useCallback(() => {
    setIsOnboardingComplete(true);
  }, []);

  const updateSetupStatus = useCallback((status: Partial<SetupStatus>) => {
    setSetupStatus((prev) => ({ ...prev, ...status }));
  }, []);

  // Initialize data on mount
  useEffect(() => {
    initializeStaticData();
  }, []);

  // Check onboarding completion when brand settings or setup status change
  useEffect(() => {
    if (isBrandSettingsComplete() && setupStatus.fulfillmentServiceConnected && setupStatus.locationCreated) {
      setIsOnboardingComplete(true);
    } else {
      setIsOnboardingComplete(false);
    }
  }, [brandSettings, setupStatus, isBrandSettingsComplete]);

  // Update stats when orders change
  useEffect(() => {
    const stats: DashboardStats = {
      totalOrders: orders.length,
      pending: orders.filter((o) => o.status === 'New').length,
      inProduction: orders.filter((o) => o.status === 'In Production').length,
      shipped: orders.filter((o) => o.status === 'Shipped').length,
      exceptions: orders.filter((o) => o.status === 'Exception' || o.status === 'Artwork Needed').length,
      fulfillmentRate: orders.length > 0 
        ? (orders.filter((o) => o.status === 'Shipped').length / orders.length) * 100 
        : 0,
    };
    setDashboardStats(stats);
  }, [orders]);

  const value: AppStore = {
    orders,
    products,
    dashboardStats,
    brandSettings,
    selectedOrderFilter,
    isLoading,
    isOnboardingComplete,
    setupStatus,
    setOrders,
    setProducts,
    updateOrderStatus,
    setSelectedOrderFilter,
    setBrandSettings,
    toggleFavorite,
    fetchOrders,
    fetchProducts,
    fetchDashboardStats,
    completeOnboarding,
    updateSetupStatus,
    isBrandSettingsComplete,
  };

  return (
    <AppStoreContext.Provider value={value}>
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppStoreContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppStoreProvider');
  }
  return context;
}

