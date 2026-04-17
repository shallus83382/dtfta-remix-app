import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Card,
  BlockStack,
  Text,
  Badge,
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
        border: isSelected ? "2px solid #1d4ed8" : "1px solid transparent",
        borderRadius: 12,
        backgroundColor: "transparent",
        boxShadow: isHovered
          ? "0 12px 24px rgba(15,23,42,0.10)"
          : "0 4px 10px rgba(15,23,42,0.04)",
        transform: isHovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all 180ms ease",
      }}
    >
      <Card>
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "1",
              overflow: "hidden",
              borderRadius: "10px",
              background:
                "radial-gradient(circle at top, #ffffff 0%, #f8fafc 48%, #eef2f7 100%)",
              marginBottom: "0.875rem",
              border: "1px solid #edf2f7",
            }}
          >
            <img
              src={product.image}
              alt={product.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
                padding: "14px",
                transform: isHovered ? "scale(1.02)" : "scale(1)",
                transition: "transform 200ms ease",
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />

            {product.isBestseller && (
              <div style={{ position: "absolute", bottom: "8px", left: "8px" }}>
                <Badge tone="warning">Bestseller</Badge>
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
                  border: "1px solid #dbe2ea",
                  borderRadius: "50%",
                  width: "34px",
                  height: "34px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 10px rgba(15,23,42,0.12)",
                }}
                onClick={handleFavoriteClick}
              >
                <svg
                  width="20"
                  height="20"
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
        </div>

        <div
          style={{
            borderTop: "1px solid #edf2f7",
            paddingTop: 12,
          }}
        >
          <BlockStack gap="200">
            <BlockStack gap="050">
              <Text
                as="p"
                variant={variant === "compact" ? "bodySm" : "headingSm"}
                fontWeight="semibold"
                tone="base"
                truncate
              >
                {product.name}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued" truncate>
                {product.brand} / {product.model}
              </Text>
            </BlockStack>

            <InlineMetaTag text={product.category || "Apparel"} />

            <div
              style={{
                borderRadius: 10,
                border: "1px solid #dbe7ff",
                background:
                  "linear-gradient(135deg, rgba(239,246,255,0.95) 0%, rgba(255,255,255,1) 100%)",
                padding: "8px 10px",
              }}
            >
              <Text
                as="p"
                variant="bodySm"
                tone="subdued"
                style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
              >
                Starting at
              </Text>
              <Text
                as="p"
                variant={variant === "compact" ? "bodyLg" : "headingMd"}
                fontWeight="semibold"
                tone="base"
              >
                {product?.currency} {product?.price?.toFixed(2)}
              </Text>
            </div>
          </BlockStack>
        </div>
      </Card>
    </div>
  );
}

function InlineMetaTag({ text }: { text: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        width: "fit-content",
        maxWidth: "100%",
        borderRadius: 999,
        border: "1px solid #dbe2ea",
        backgroundColor: "#f8fafc",
        padding: "3px 10px",
      }}
    >
      <Text as="p" variant="bodySm" tone="subdued" truncate>
        {text}
      </Text>
    </div>
  );
}