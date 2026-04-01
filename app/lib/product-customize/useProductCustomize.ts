import { useCallback } from "react";
import type { DtftaPrintArea } from "../dtfta-products.server";
import { buildCustomizeSubmission } from "./buildCustomizeSubmission";
import { useCustomizeEditorState } from "./useCustomizeEditorState";
import { useCustomizePublish } from "./useCustomizePublish";

type UseProductCustomizeArgs = {
  productKey: string;
  productName: string;
  productId: string;
  printAreas: DtftaPrintArea[];
};

export function useProductCustomize({
  productKey,
  productName,
  productId,
  printAreas,
}: UseProductCustomizeArgs) {
  const editor = useCustomizeEditorState({ printAreas });

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
    getCanvasStateForPlacement: editor.getCanvasStateForPlacement,
    handleCanvasReady: editor.handleCanvasReady,
    handlePrintSizeChange: editor.handlePrintSizeChange,
    handleRegionChange: editor.handleRegionChange,
    handlePlacementChange: editor.handlePlacementChange,
    handleAddToStore: publish.handleSubmit,
  };
}