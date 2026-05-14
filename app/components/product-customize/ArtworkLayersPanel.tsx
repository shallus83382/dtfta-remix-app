import type { CSSProperties } from "react";
import { BlockStack, Badge, InlineStack, Text, Thumbnail } from "@shopify/polaris";
import type { DesignLayerSummary } from "../../lib/product-customize/design-layer-summary";
import {
  formatPrintMeasurement,
  normalizePrintUnitDisplay,
} from "../../lib/product-customize/print-units";
import { brandColors } from "../../lib/brand-theme";

type Props = {
  layers: DesignLayerSummary[];
  dimensionUnit: string;
  printWidth: number;
  printHeight: number;
};

function fmtDegrees(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const rounded = Math.round(n * 10) / 10;
  const s = rounded.toFixed(1);
  return s.replace(/\.0$/, "");
}

export default function ArtworkLayersPanel({
  layers,
  dimensionUnit,
  printWidth,
  printHeight,
}: Props) {
  const unitLabel =
    normalizePrintUnitDisplay(dimensionUnit) || dimensionUnit.trim() || "units";

  /** Format using the raw product unit so precision matches px / mm / in / etc. */
  const fmt = (n: number) => formatPrintMeasurement(n, dimensionUnit);

  const panelStyle: CSSProperties = {
    marginTop: 14,
    borderRadius: 12,
    border: "1px solid #dbe3ec",
    background: "linear-gradient(145deg, #ffffff 0%, #f8fbff 100%)",
    padding: "12px 14px",
    boxShadow: "0 8px 18px rgba(22,22,31,0.06)",
    minWidth: 0,
    boxSizing: "border-box",
  };

  return (
    <div style={panelStyle}>
      <InlineStack align="space-between" blockAlign="center" wrap>
        <Text as="h3" variant="headingSm">
          Artwork on print area
        </Text>
        <Badge tone="info">{layers.length} layer{layers.length === 1 ? "" : "s"}</Badge>
      </InlineStack>

      <div style={{ marginTop: 6, marginBottom: 10 }}>
        <Text as="p" variant="bodySm" tone="subdued">
          Measurements follow this product’s print area unit ({fmt(printWidth)} × {fmt(printHeight)}{" "}
          {unitLabel}). Center ranges show how far you can move each layer before it hits the edge.
        </Text>
      </div>

      {layers.length === 0 ? (
        <Text as="p" variant="bodySm" tone="subdued">
          Add text or images to see dimensions, placement, and movable limits here.
        </Text>
      ) : (
        <BlockStack gap="300">
          {layers.map((layer) => (
            <div
              key={layer.id}
              style={{
                borderRadius: 10,
                border: layer.selected ? "1px solid rgba(255, 106, 0, 0.55)" : "1px solid #e2e8f0",
                background: layer.selected ? "rgba(255, 106, 0, 0.06)" : "#ffffff",
                padding: 10,
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flexShrink: 0 }}>
                {layer.previewUrl ? (
                  <Thumbnail
                    source={layer.previewUrl}
                    alt=""
                    size="small"
                  />
                ) : (
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      border: "1px dashed #cbd5e1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 600,
                      color: brandColors.textSubtle,
                      background: "#f8fafc",
                    }}
                  >
                    {layer.kind === "text" ? "Aa" : "◇"}
                  </div>
                )}
              </div>

              <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                <InlineStack gap="200" blockAlign="center" wrap>
                  <Text as="p" variant="bodySm" fontWeight="semibold">
                    {layer.label}
                  </Text>
                  {layer.selected ? (
                    <Badge tone="attention">Selected</Badge>
                  ) : null}
                  <Badge>{layer.kind}</Badge>
                </InlineStack>

                <div style={{ marginTop: 8 }}>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Size: {fmt(layer.width)} × {fmt(layer.height)} {unitLabel}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Top-left: {fmt(layer.left)}, {fmt(layer.top)} {unitLabel}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Center: {fmt(layer.centerX)}, {fmt(layer.centerY)} {unitLabel}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Rotation: {fmtDegrees(layer.rotation)}°
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Center X range: {fmt(layer.centerXMin)} – {fmt(layer.centerXMax)} {unitLabel}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Center Y range: {fmt(layer.centerYMin)} – {fmt(layer.centerYMax)} {unitLabel}
                  </Text>
                </div>
              </div>
            </div>
          ))}
        </BlockStack>
      )}
    </div>
  );
}
