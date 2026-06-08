import { useCallback, useMemo, useState } from "react";
import type { Canvas } from "fabric";
import type {
  DtftaColorMockups,
  DtftaPrintArea,
  DtftaVariant,
} from "../dtfta-products.server";
import { resolveColorMockupMapKey } from "../design-assets";
import { buildCustomizeSubmission } from "./buildCustomizeSubmission";
import { useCustomizeEditorState } from "./useCustomizeEditorState";
import { useCustomizePublish } from "./useCustomizePublish";
import {
  buildPlacementMockups,
  type ColorMockupOption,
  type MultiPlacementPreview,
  type PlacementPreviewEntry,
} from "./mockup-composer";
import { getRegionFromPrintArea, normalizePlacementKey } from "./helpers";
import { getPrintAreaBackgroundImageUrlForFabric } from "../design-assets";

type UseProductCustomizeArgs = {
  productKey: string;
  productName: string;
  productId: string;
  printAreas: DtftaPrintArea[];
  variants: DtftaVariant[];
  colorMockups?: DtftaColorMockups;
  defaultColor?: string;
};

export function useProductCustomize({
  productKey,
  productName,
  productId,
  printAreas,
  variants,
  colorMockups,
  defaultColor = "",
}: UseProductCustomizeArgs) {
  const designAssetOptions = useMemo(
    () => ({ colorMockups: colorMockups ?? null }),
    [colorMockups]
  );
  const [selectedColor, setSelectedColor] = useState(defaultColor);

  const editor = useCustomizeEditorState({
    printAreas,
    selectedColor,
  });

  const availableColors = useMemo(() => {
    const map = new Map<
      string,
      { colorCode: string; colorName: string; hex?: string }
    >();

    for (const variant of variants) {
      if (!variant.is_active) continue;

      const colorCode = String(variant.colorCode || "").trim();
      if (!colorCode || map.has(colorCode)) {
        continue;
      }

      const mockupKey = resolveColorMockupMapKey(colorCode, colorMockups);

      const mockup = mockupKey ? colorMockups?.[mockupKey] : undefined;

      map.set(colorCode, {
        colorCode,
        colorName: variant.colorName,
        hex: mockup?.hex,
      });
    }

    return Array.from(map.values());
  }, [variants, colorMockups]);

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
  const handleColorChange = useCallback(
    (colorCode: string) => {
      editor.savePlacementSnapshot(editor.placement);
      setSelectedColor(colorCode);
    },
    [editor.placement, editor.savePlacementSnapshot]
  );

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
      canvasSizesByPlacement: editor.canvasSizeRef.current,
      artworkLibraryIds: editor.artworkLibraryIdRef.current,
      designLayersByPlacement: editor.designLayersByPlacementRef.current,
      printAreas,
      printSizes: editor.printSizes,
      regions: editor.regions,
      selectedColor,
      variants,
      colorMockups,
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
    editor.placement,
    editor.canvases,
    editor.printSizes,
    editor.regions,
    editor.savePlacementSnapshot,
    editor.saveAllPlacements,
  ]);

  const publish = useCustomizePublish({
    buildFormData,
  });

  const buildCurrentPreview =
    useCallback(async (): Promise<MultiPlacementPreview> => {
      /**
       * Persist the current placement's artwork into artworkRef so that when we
       * iterate inactive placements (which only have a saved snapshot, not a
       * live canvas) we still pick up the latest design for the active one.
       */
      editor.savePlacementSnapshot(editor.placement);

      const activeAreas = printAreas
        .filter((area) => area.is_active)
        .sort((a, b) => a.display_order - b.display_order);

      const colorList: Array<{ colorCode: string; colorName: string }> =
        availableColors.length > 0
          ? availableColors
          : [{ colorCode: selectedColor, colorName: selectedColor }];

      const currentPlacementKey = normalizePlacementKey(editor.placement);

      const entries = await Promise.all(
        activeAreas.map(async (area): Promise<PlacementPreviewEntry | null> => {
          const placementKey = normalizePlacementKey(area.title);
          const region =
            editor.regions[placementKey] ?? getRegionFromPrintArea(area);

          /**
           * Only the current placement has a live, mounted Fabric canvas.
           * Other placements were unmounted on placement switch but their
           * artwork was snapshotted into artworkRef.current[placement].
           */
          const liveCanvas =
            placementKey === currentPlacementKey
              ? ((editor.canvases as Record<string, Canvas | null>)[
                  placementKey
                ] ?? null)
              : null;

          const colorOptions: ColorMockupOption[] = colorList.map((color) => ({
            colorCode: color.colorCode,
            colorName: color.colorName,
            backgroundImageUrl: getPrintAreaBackgroundImageUrlForFabric(
              area,
              color.colorCode,
              designAssetOptions
            ),
          }));

          const result = await buildPlacementMockups({
            placement: placementKey,
            placementTitle: area.title,
            region,
            liveCanvas,
            savedPrintOnlyUrl: editor.artworkRef.current[placementKey] ?? "",
            savedCanvasSize:
              editor.canvasSizeRef.current[placementKey] ?? null,
            colors: colorOptions,
          });

          if (!result) return null;

          return {
            placement: result.placement,
            placementTitle: result.placementTitle,
            printOnlyUrl: result.printOnlyUrl,
            mockupsByColor: result.mockupsByColor,
          };
        })
      );

      return {
        placements: entries.filter(
          (entry): entry is PlacementPreviewEntry => entry !== null
        ),
      };
    }, [
      editor.placement,
      editor.canvases,
      editor.regions,
      editor.artworkRef,
      editor.canvasSizeRef,
      editor.savePlacementSnapshot,
      printAreas,
      availableColors,
      selectedColor,
      designAssetOptions,
    ]);

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
    buildCurrentPreview,
  };
}
