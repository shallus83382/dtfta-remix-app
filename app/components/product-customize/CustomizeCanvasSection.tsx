import { Banner, Text } from "@shopify/polaris";
import type { Canvas } from "fabric";
import DesignCanvas, {
  type DesignableRegion,
} from "../DesignCanvas";
import type { DtftaPrintArea } from "../../lib/dtfta-products.server";
import {getProductDesignAssetUrl} from "../../lib/design-assets";

type Props = {
  placement: string;
  selectedPrintArea?: DtftaPrintArea;
  selectedRegion: DesignableRegion;
  selectedPrintSize: { width: number; height: number };
  initialCanvasState?: unknown;
  onCanvasReady: (placement: string, canvas: Canvas) => void;
  onPrintSizeChange: (placement: string, width: number, height: number) => void;
  onRegionChange: (placement: string, region: DesignableRegion) => void;
};

export default function CustomizeCanvasSection({
  placement,
  selectedPrintArea,
  selectedRegion,
  selectedPrintSize,
  initialCanvasState,
  onCanvasReady,
  onPrintSizeChange,
  onRegionChange,
}: Props) {
  if (!selectedPrintArea) {
    return <Banner tone="warning">No active print areas found for this product.</Banner>;
  }

  return (
    <>
      <div
        style={{
          width: "100%",
          minWidth: 0,
          height: "min(75vw, calc(100vh - 220px))",
          minHeight: 280,
        }}
      >
        {selectedPrintArea.image ? (
          <DesignCanvas
            key={placement}
            label={selectedPrintArea.title}
            fillWidth
            onCanvasReady={(canvas) => onCanvasReady(placement, canvas)}
            printWidth={selectedPrintSize.width}
            printHeight={selectedPrintSize.height}
            onPrintDimensionsChange={(w, h) =>
              onPrintSizeChange(placement, w, h)
            }
            backgroundImageUrl={getProductDesignAssetUrl(selectedPrintArea.image)}
            designableRegion={selectedRegion}
            onDesignableRegionChange={(region) =>
              onRegionChange(placement, region)
            }
            initialCanvasState={initialCanvasState}
          />
        ) : (
          <Banner tone="warning">
            No background image found for the selected print area.
          </Banner>
        )}
      </div>

      <Text as="p" variant="bodySm" tone="subdued">
        Active print area: {selectedPrintArea.title} · {selectedPrintArea.area_width} ×{" "}
        {selectedPrintArea.area_height} {selectedPrintArea.unit}
      </Text>
    </>
  );
}