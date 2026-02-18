import { useNavigate } from 'react-router';
import {
  Card,
  BlockStack,
  Text,
  Badge,
  InlineStack,
} from '@shopify/polaris';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onToggleFavorite?: (productId: string) => void;
  onClick?: (productId: string) => void;
  showFavorite?: boolean;
  isSelected?: boolean;
  variant?: 'default' | 'compact';
}

export default function ProductCard({
  product,
  onToggleFavorite,
  onClick,
  showFavorite = true,
  isSelected = false,
  variant = 'default',
}: ProductCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(product.id);
    } else {
      navigate(`/app/products?product=${product.id}`);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(product.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        cursor: 'pointer',
        border: isSelected ? '2px solid #2563eb' : undefined,
      }}
    >
      <Card>
        <div style={{ position: 'relative' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1',
              overflow: 'hidden',
              borderRadius: '8px',
              backgroundColor: '#f3f4f6',
              marginBottom: '1rem',
            }}
          >
          <img
            src={product.image}
            alt={product.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {product.isBestseller && (
            <div style={{ position: 'absolute', bottom: '8px', left: '8px' }}>
              <Badge tone="warning">Bestseller</Badge>
            </div>
          )}
          {showFavorite && onToggleFavorite && (
            <div
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                cursor: 'pointer',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={handleFavoriteClick}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={product.isFavorite ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: product.isFavorite ? '#ef4444' : '#000000' }}
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
          )}
        </div>
        </div>
        <BlockStack gap="100">
          <Text
            as="p"
            variant={variant === 'compact' ? 'bodySm' : 'bodyMd'}
            fontWeight="semibold"
          >
            {product.name}
          </Text>
          <Text
            as="p"
            variant={variant === 'compact' ? 'bodySm' : 'bodyMd'}
            tone="subdued"
          >
            By {product.brand} · {product.model}
          </Text>
          <Text
            as="p"
            variant={variant === 'compact' ? 'bodySm' : 'bodyMd'}
            fontWeight="semibold"
          >
            From {product.currency} {product.price.toFixed(2)}
          </Text>
        </BlockStack>
      </Card>
    </div>
  );
}

