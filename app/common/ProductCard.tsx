import { useState } from "react";
import { useNavigate } from "react-router";
import {
  BlockStack,
  Text,
} from "@shopify/polaris";
import type { Product } from "../types";
import {
  brandCardDarkGradient,
  brandColors,
  brandPrimaryButtonBg,
} from "../lib/brand-theme";

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
        border: isActiveVisual
          ? "1px solid rgba(255, 106, 0, 0.45)"
          : "1px solid #e2e8f0",
        borderRadius: 14,
        background:
          isActiveVisual
            ? brandCardDarkGradient
            : "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        boxShadow: isActiveVisual
          ? "0 16px 30px rgba(22,22,31,0.28)"
          : "0 8px 18px rgba(22,22,31,0.08)",
        transform: isActiveVisual ? "translateY(-3px)" : "translateY(0)",
        transition: "all 180ms ease",
        padding: 10,
      }}
    >
      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "1",
            overflow: "hidden",
            borderRadius: "10px",
            background:
              "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.9) 0%, rgba(241,245,249,1) 58%, rgba(226,232,240,1) 100%)",
            marginBottom: "0.7rem",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(140deg, rgba(255, 106, 0, 0.07) 0%, rgba(255,255,255,0) 100%)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
          <img
            src={product.image}
            alt={product.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transform: isHovered ? "scale(1.03)" : "scale(1)",
              transition: "transform 200ms ease",
              zIndex: 0,
              position: "relative",
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
                background: brandPrimaryButtonBg,
                color: "#ffffff",
                borderRadius: 999,
                padding: "3px 8px",
                fontSize: 11,
                fontWeight: 600,
                zIndex: 2,
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
                backgroundColor: "rgba(255,255,255,0.92)",
                border: "1px solid #dbe4ee",
                borderRadius: 999,
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2,
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
                style={{ color: product.isFavorite ? "#dc2626" : brandColors.text }}
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
          )}
        </div>

        <div style={{ padding: "0 4px 4px" }}>
          <BlockStack gap="100">
            <Text
              as="p"
              variant={variant === "compact" ? "bodySm" : "headingSm"}
              fontWeight="semibold"
              tone={isActiveVisual ? "text-inverse" : "base"}
              style={{ color: isActiveVisual ? "#ffffff" : brandColors.text }}
              truncate
            >
              {product.name}
            </Text>
            <Text
              as="p"
              variant="bodySm"
              tone={isActiveVisual ? "text-inverse" : "subdued"}
              style={{ color: isActiveVisual ? "rgba(255,255,255,0.9)" : undefined }}
              truncate
            >
              By {product.brand} {product.model ? `・${product.model}` : ""}
            </Text>
            <Text
              as="p"
              variant={variant === "compact" ? "bodyMd" : "headingSm"}
              fontWeight="semibold"
              tone={isActiveVisual ? "text-inverse" : "base"}
              style={{ color: isActiveVisual ? "#ffffff" : brandColors.text }}
            >
              From {product?.currency} {formattedPrice}
            </Text>
            <Text
              as="p"
              variant="bodySm"
              tone={isActiveVisual ? "text-inverse" : "subdued"}
              style={{ color: isActiveVisual ? "rgba(255,255,255,0.9)" : undefined }}
            >
              {product.colors?.length ?? 0} colors · {product.sizes?.length ?? 0} sizes
            </Text>
          </BlockStack>
        </div>
      </div>
    </div>
  );
}