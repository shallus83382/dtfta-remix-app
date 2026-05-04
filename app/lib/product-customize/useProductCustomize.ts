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
  const [selectedColor, setSelectedColor] = useState(defaultColor);

  const editor = useCustomizeEditorState({
    printAreas,
    selectedColor,
  });

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
          variant.colorCode == selectedColor
      ) ?? null
    );
  }, [variants, selectedColor]);

  /**
   * Artwork and placement are shared by placement, not by color.
   * When switching color, only the background preview changes.
   */
  const handleColorChange = useCallback((colorCode: string) => {
    editor.savePlacementSnapshot(editor.placement);
    setSelectedColor(colorCode);
  }, [editor]);

  const buildFormData = useCallback(async () => {
    editor.savePlacementSnapshot(editor.placement);
    editor.saveAllPlacements();

    const result = await buildCustomizeSubmission({
      productKey,
      productName,
      productId,
      canvases: editor.canvases,
      canvasStateByPlacement: editor.canvasStateRef.current,
      artworkByPlacement: editor.artworkRef.current,
      artworkLibraryIds: editor.artworkLibraryIdRef.current,
      printAreas,
      printSizes: editor.printSizes,
      regions: editor.regions,
      selectedColor,
      variants,
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
    variants,
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
    setArtworkLibraryIdForPlacement: editor.setArtworkLibraryIdForPlacement,
  };
}
