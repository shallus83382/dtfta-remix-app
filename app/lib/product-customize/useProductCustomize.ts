import { useCallback, useMemo, useState } from "react";
import type { DtftaPrintArea, DtftaVariant } from "../dtfta-products.server";
import { buildCustomizeSubmission } from "./buildCustomizeSubmission";
import { useCustomizeEditorState } from "./useCustomizeEditorState";
import { useCustomizePublish } from "./useCustomizePublish";

type UseProductCustomizeArgs = {
  productKey: string;
  productName: string;
  productId: string;
  printAreas: DtftaPrintArea[];
  variants: DtftaVariant[];
  defaultColor?: string;
};

export function useProductCustomize({
  productKey,
  productName,
  productId,
  printAreas,
  variants,
  defaultColor = "",
}: UseProductCustomizeArgs) {
  const editor = useCustomizeEditorState({ printAreas });
  const [selectedColor, setSelectedColor] = useState(defaultColor);

  const availableColors = useMemo(() => {
    const map = new Map<string, { colorCode: string; colorName: string }>();

    for (const variant of variants) {
      if (!variant.is_active) continue;
      if (!map.has(variant.colorCode)) {
        map.set(variant.colorCode, {
          colorCode: variant.colorCode,
          colorName: variant.colorName,
        });
      }
    }

    return Array.from(map.values());
  }, [variants]);

  const selectedVariant = useMemo(() => {
    return (
      variants.find(
        (variant) =>
          variant.is_active &&
          variant.colorCode === selectedColor
      ) ?? null
    );
  }, [variants, selectedColor]);

  const handleColorChange = useCallback((colorCode: string) => {
    setSelectedColor(colorCode);
  }, []);

  const buildFormData = useCallback(() => {
    editor.savePlacementSnapshot(editor.placement);
    editor.saveAllPlacements();

    const result = buildCustomizeSubmission({
      productKey,
      productName,
      productId,
      canvases: editor.canvases,
      canvasStateByPlacement: editor.canvasStateRef.current,
      artworkByPlacement: editor.artworkRef.current,
      printAreas,
      printSizes: editor.printSizes,
      regions: editor.regions,
      selectedColor,
      selectedColorName: selectedVariant?.colorName ?? "",
      selectedVariantId: selectedVariant?.id != null ? String(selectedVariant.id) : "",
      selectedVariantSku: selectedVariant?.sku ?? "",
    });

    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }

    return { ok: true as const, formData: result.formData };
  }, [
    productKey,
    productName,
    productId,
    printAreas,
    selectedColor,
    selectedVariant,
    editor,
  ]);

  const publish = useCustomizePublish({
    buildFormData,
  });

  return {
    fetcher: publish.fetcher,
    placement: editor.placement,
    selectedPrintArea: editor.selectedPrintArea,
    selectedRegion: editor.selectedRegion,
    selectedPrintSize: editor.selectedPrintSize,
    canvasStateByPlacement: editor.canvasStateByPlacement,
    selectedColor,
    availableColors,
    selectedVariant,
    getCanvasStateForPlacement: editor.getCanvasStateForPlacement,
    handleCanvasReady: editor.handleCanvasReady,
    handlePrintSizeChange: editor.handlePrintSizeChange,
    handleRegionChange: editor.handleRegionChange,
    handlePlacementChange: editor.handlePlacementChange,
    handleColorChange,
    handleAddToStore: publish.handleSubmit,
  };
}