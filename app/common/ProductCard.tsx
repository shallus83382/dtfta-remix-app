import { useState } from "react";
import { useNavigate } from "react-router";
import {
  BlockStack,
  Text,
} from "@shopify/polaris";
import type { Product } from "../types";

interface ProductCardProps {
  product: Product;
  onToggleFavorite?: (productId: string) => void;
  onClick?: (productId: string) => void;
  showFavorite?: boolean;
  isSelected?: boolean;
  variant?: "default" | "compact";
}

export default function ProductCard({
  product,
  onToggleFavorite,
  onClick,
  showFavorite = true,
  isSelected = false,
  variant = "default",
}: ProductCardProps) {
  const navigate = useNavigate();
  const productId = String(product.id);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick(productId);
    } else {
      navigate(`/app/products?product=${encodeURIComponent(productId)}`);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(productId);
    }
  };

  const isActiveVisual = isHovered || isSelected;
  const normalizedPrice = Number(product?.price);
  const formattedPrice = Number.isFinite(normalizedPrice)
    ? normalizedPrice.toFixed(2)
    : "0.00";

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      role="button"
      tabIndex={0}
      style={{
        cursor: "pointer",
        border: "none",
        borderRadius: 0,
        backgroundColor: isActiveVisual ? "#0f172a" : "transparent",
        boxShadow: isActiveVisual
          ? "0 8px 16px rgba(15,23,42,0.08)"
          : "none",
        transform: isActiveVisual ? "translateY(-2px)" : "translateY(0)",
        transition: "all 180ms ease",
        padding: 0,
      }}
    >
      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "1",
            overflow: "hidden",
            borderRadius: "0px",
            backgroundColor: "#efefea",
            marginBottom: "0.8rem",
          }}
        >
          <img
            src={product.image}
            alt={product.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transform: isHovered ? "scale(1.015)" : "scale(1)",
              transition: "transform 200ms ease",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />

          {product.isBestseller && (
            <div
              style={{
                position: "absolute",
                bottom: "10px",
                left: "10px",
                backgroundColor: "#d9be7e",
                color: "#4b3a13",
                borderRadius: 2,
                padding: "2px 6px",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Bestseller
            </div>
          )}

          {showFavorite && onToggleFavorite && (
            <div
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                cursor: "pointer",
                backgroundColor: "#ffffff",
                borderRadius: 2,
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={handleFavoriteClick}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill={product.isFavorite ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: product.isFavorite ? "#dc2626" : "#0f172a" }}
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
          )}
        </div>

        <div style={{ padding: "0 10px 10px" }}>
          <BlockStack gap="100">
            <Text
              as="p"
              variant={variant === "compact" ? "bodySm" : "headingSm"}
              fontWeight="semibold"
              tone={isActiveVisual ? "text-inverse" : "base"}
              style={{ color: isActiveVisual ? "#ffffff" : undefined }}
              truncate
            >
              {product.name}
            </Text>
            <Text
              as="p"
              variant="bodySm"
              tone={isActiveVisual ? "text-inverse" : "subdued"}
              style={{ color: isActiveVisual ? "#cbd5e1" : undefined }}
              truncate
            >
              By {product.brand} {product.model ? `・${product.model}` : ""}
            </Text>
            <Text
              as="p"
              variant={variant === "compact" ? "bodyMd" : "headingSm"}
              fontWeight="semibold"
              tone={isActiveVisual ? "text-inverse" : "base"}
              style={{ color: isActiveVisual ? "#ffffff" : undefined }}
            >
              From {product?.currency} {formattedPrice}
            </Text>
            <Text
              as="p"
              variant="bodySm"
              tone={isActiveVisual ? "text-inverse" : "subdued"}
              style={{ color: isActiveVisual ? "#cbd5e1" : undefined }}
            >
              {product.colors?.length ?? 0} colors · {product.sizes?.length ?? 0} sizes
            </Text>
          </BlockStack>
        </div>
      </div>
    </div>
  );
}