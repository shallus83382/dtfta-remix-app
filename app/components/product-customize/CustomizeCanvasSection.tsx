import { Text } from "@shopify/polaris";
import type { Canvas } from "fabric";
import DesignCanvas, {
  type DesignableRegion,
} from "../DesignCanvas";
import type { DtftaPrintArea } from "../../lib/dtfta-products.server";
import { getProductDesignAssetUrl } from "../../lib/design-assets";

type Props = {
  placement: string;
  selectedColor?: string;
  selectedPrintArea?: DtftaPrintArea;
  selectedRegion: DesignableRegion;
  selectedPrintSize: { width: number; height: number };
  initialCanvasState?: unknown;
  onCanvasReady: (placement: string, canvas: Canvas) => void;
  onPrintSizeChange: (placement: string, width: number, height: number) => void;
  onRegionChange: (placement: string, region: DesignableRegion) => void;
  onRegisterActions?: (actions: {
    addText: () => void;
    addImage: (file: File) => Promise<void>;
    deleteSelected: () => void;
    clear: () => void;
  } | null) => void;
};

export default function CustomizeCanvasSection({
  placement,
  selectedColor,
  selectedPrintArea,
  selectedRegion,
  selectedPrintSize,
  initialCanvasState,
  onCanvasReady,
  onPrintSizeChange,
  onRegionChange,
  onRegisterActions,
}: Props) {
  if (!selectedPrintArea) {
    return (
      <div
        style={{
          borderRadius: 12,
          border: "1px solid #fde68a",
          backgroundColor: "#fffbeb",
          padding: 12,
        }}
      >
        <Text as="p" tone="warning">
          No active print areas found for this product.
        </Text>
      </div>
    );
  }

  const backgroundImageUrl = selectedPrintArea.image
    ? getProductDesignAssetUrl(selectedPrintArea.image, selectedColor)
    : "";

  return (
    <>
      <div
        style={{
          borderRadius: 10,
          background: "#ffffff",
          padding: 0,
        }}
      >
        <div
          style={{
            width: "100%",
            minWidth: 0,
            height: "auto",
          }}
        >
          {backgroundImageUrl ? (
            <DesignCanvas
              key={`${placement}-${selectedColor ?? "default"}`}
              label={selectedPrintArea.title}
              fillWidth
              showInlineActions={false}
              onRegisterActions={onRegisterActions}
              onCanvasReady={(canvas) => onCanvasReady(placement, canvas)}
              printWidth={selectedPrintSize.width}
              printHeight={selectedPrintSize.height}
              onPrintDimensionsChange={(w, h) =>
                onPrintSizeChange(placement, w, h)
              }
              backgroundImageUrl={backgroundImageUrl}
              designableRegion={selectedRegion}
              onDesignableRegionChange={(region) =>
                onRegionChange(placement, region)
              }
              initialCanvasState={initialCanvasState}
            />
          ) : (
            <div
              style={{
                borderRadius: 12,
                border: "1px solid #fde68a",
                backgroundColor: "#fffbeb",
                padding: 12,
              }}
            >
              <Text as="p" tone="warning">
                No background image found for the selected print area.
              </Text>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <Text as="p" variant="bodySm" tone="subdued">
          Active print area: {selectedPrintArea.title} · {selectedPrintArea.area_width} ×{" "}
          {selectedPrintArea.area_height} {selectedPrintArea.unit}
        </Text>
      </div>
      <div style={{ marginBottom: 24 }} />
    </>
  );
}