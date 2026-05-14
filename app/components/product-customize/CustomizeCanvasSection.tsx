import { useCallback } from "react";
import { Text } from "@shopify/polaris";
import type { Canvas } from "fabric";
import DesignCanvas, {
  type DesignableRegion,
  type DesignLayerSummary,
} from "../DesignCanvas";
import type { DtftaPrintArea } from "../../lib/dtfta-products.server";
import { getProductDesignAssetUrlForFabric } from "../../lib/design-assets";
import {
  formatPrintMeasurement,
  normalizePrintUnitDisplay,
} from "../../lib/product-customize/print-units";

type CanvasActions = {
  addText: () => void;
  addImage: (file: File) => Promise<void>;
  addImageFromUrl: (
    url: string,
    options?: { libraryArtworkId?: string }
  ) => Promise<void>;
  deleteSelected: () => void;
  clear: () => void;
};

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
  onRegisterActions?: (actions: CanvasActions | null) => void;
  /** Called when canvas is cleared or a local file image is added (no library id). */
  onLibraryArtworkBindingChange?: (libraryArtworkId: string | null) => void;
  onDesignLayersChange?: (layers: DesignLayerSummary[]) => void;
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
  onLibraryArtworkBindingChange,
  onDesignLayersChange,
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
        <Text as="p" tone="caution">
          No active print areas found for this product.
        </Text>
      </div>
    );
  }

  const backgroundImageUrl = selectedPrintArea.image
    ? getProductDesignAssetUrlForFabric(selectedPrintArea.image, selectedColor)
    : "";

  const handleRegisterActions = useCallback(
    (actions: CanvasActions | null) => {
      if (!actions) {
        onRegisterActions?.(null);
        return;
      }
      onRegisterActions?.({
        addText: actions.addText,
        addImage: async (file) => {
          await actions.addImage(file);
          onLibraryArtworkBindingChange?.(null);
        },
        addImageFromUrl: actions.addImageFromUrl,
        deleteSelected: actions.deleteSelected,
        clear: () => {
          actions.clear();
          onLibraryArtworkBindingChange?.(null);
        },
      });
    },
    [onRegisterActions, onLibraryArtworkBindingChange]
  );

  return (
    <>
      <div
        style={{
          borderRadius: 10,
          background: "#ffffff",
          padding: 0,
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            minWidth: 0,
            maxWidth: "100%",
            height: "auto",
            boxSizing: "border-box",
          }}
        >
          {backgroundImageUrl ? (
            <DesignCanvas
              key={`${placement}-${selectedColor ?? "default"}`}
              label={selectedPrintArea.title}
              fillWidth
              showInlineActions={false}
              onRegisterActions={handleRegisterActions}
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
              onDesignLayersChange={onDesignLayersChange}
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
              <Text as="p" tone="caution">
                No background image found for the selected print area.
              </Text>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <Text as="p" variant="bodySm" tone="subdued">
          Active print area: {selectedPrintArea.title} ·{" "}
          {formatPrintMeasurement(selectedPrintSize.width, selectedPrintArea.unit)} ×{" "}
          {formatPrintMeasurement(selectedPrintSize.height, selectedPrintArea.unit)}{" "}
          {normalizePrintUnitDisplay(selectedPrintArea.unit) || selectedPrintArea.unit}
        </Text>
      </div>
      <div style={{ marginBottom: 24 }} />
    </>
  );
}