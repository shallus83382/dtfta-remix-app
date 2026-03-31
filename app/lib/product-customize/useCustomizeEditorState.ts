import { useState, useCallback, useEffect, useMemo } from "react";
import type { Canvas, FabricObject } from "fabric";
import type { DesignableRegion } from "../../components/DesignCanvas";
import type { DtftaPrintArea } from "../dtfta-products.server";
import type {
  PlacementCanvasStateMap,
  PlacementPrintSizeMap,
  PlacementRegionMap,
} from "./types";
import {
  DEFAULT_DESIGN_REGION,
  getRegionFromPrintArea,
  normalizePlacementKey,
} from "./helpers";
import { exportCanvasToDataUrl } from "../../components/DesignCanvas";

type UseCustomizeEditorStateArgs = {
  printAreas: DtftaPrintArea[];
};

export function useCustomizeEditorState({
  printAreas,
}: UseCustomizeEditorStateArgs) {
  const defaultPlacement = normalizePlacementKey(printAreas[0]?.title ?? "front");

  const [placement, setPlacement] = useState<string>(defaultPlacement);
  const [canvases, setCanvases] = useState<Record<string, Canvas | null>>({});
  const [canvasStateByPlacement, setCanvasStateByPlacement] =
    useState<PlacementCanvasStateMap>({});
  const [printSizes, setPrintSizes] = useState<PlacementPrintSizeMap>({});
  const [regions, setRegions] = useState<PlacementRegionMap>({});
  const [artworkByPlacement, setArtworkByPlacement] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    if (!printAreas.length) return;

    const nextPrintSizes: PlacementPrintSizeMap = {};
    const nextRegions: PlacementRegionMap = {};

    for (const area of printAreas) {
      const key = normalizePlacementKey(area.title);

      nextPrintSizes[key] = {
        width: Number(area.area_width || 250),
        height: Number(area.area_height || 250),
      };

      nextRegions[key] = getRegionFromPrintArea(area);
    }

    setPrintSizes(nextPrintSizes);
    setRegions(nextRegions);
    setPlacement((prev) => prev || normalizePlacementKey(printAreas[0].title));
  }, [printAreas]);

  const selectedPrintArea = useMemo(
    () => printAreas.find((area) => normalizePlacementKey(area.title) === placement),
    [printAreas, placement]
  );

  const selectedRegion = selectedPrintArea
    ? regions[placement] ?? getRegionFromPrintArea(selectedPrintArea)
    : DEFAULT_DESIGN_REGION;

  const selectedPrintSize = selectedPrintArea
    ? printSizes[placement] ?? {
        width: Number(selectedPrintArea.area_width || 250),
        height: Number(selectedPrintArea.area_height || 250),
      }
    : { width: 12, height: 16 };

  const handleCanvasReady = useCallback((placementKey: string, canvas: Canvas) => {
    setCanvases((prev) => {
      if (prev[placementKey] === canvas) return prev;
      return { ...prev, [placementKey]: canvas };
    });
  }, []);

  const handlePrintSizeChange = useCallback(
    (placementKey: string, w: number, h: number) => {
      setPrintSizes((prev) => {
        const current = prev[placementKey];
        if (current && current.width === w && current.height === h) return prev;
        return { ...prev, [placementKey]: { width: w, height: h } };
      });
    },
    []
  );

  const handleRegionChange = useCallback(
    (placementKey: string, region: DesignableRegion) => {
      setRegions((prev) => {
        const current = prev[placementKey];

        if (
          current &&
          current.left === region.left &&
          current.top === region.top &&
          current.width === region.width &&
          current.height === region.height
        ) {
          return prev;
        }

        return { ...prev, [placementKey]: region };
      });
    },
    []
  );

  const savePlacementArtwork = useCallback(
    (placementKey: string) => {
      const canvas = canvases[placementKey];
      if (!canvas) return;

      const dataUrl = exportCanvasToDataUrl(canvas);
      if (!dataUrl) return;

      setArtworkByPlacement((prev) => {
        if (prev[placementKey] === dataUrl) return prev;
        return { ...prev, [placementKey]: dataUrl };
      });
    },
    [canvases]
  );

  const savePlacementState = useCallback(
    (placementKey: string) => {
      const canvas = canvases[placementKey];
      if (!canvas) return;

      try {
        const objects = canvas.getObjects();

        const userObjects = objects.filter((obj) => {
          const anyObj = obj as FabricObject & { data?: Record<string, unknown> };
          return !anyObj.data?.__internal;
        });

        const serialized = userObjects
          .map((obj) =>
            typeof (obj as FabricObject & { toObject?: () => unknown }).toObject ===
            "function"
              ? (obj as FabricObject & { toObject: () => unknown }).toObject()
              : null
          )
          .filter(Boolean);

        setCanvasStateByPlacement((prev) => ({
          ...prev,
          [placementKey]: { objects: serialized },
        }));
      } catch (error) {
        console.error("Failed to save canvas objects", error);
      }
    },
    [canvases]
  );

  const handlePlacementChange = useCallback(
    (nextPlacement: string) => {
      if (nextPlacement === placement) return;
      savePlacementState(placement);
      savePlacementArtwork(placement);
      setPlacement(nextPlacement);
    },
    [placement, savePlacementArtwork, savePlacementState]
  );

  return {
    placement,
    canvases,
    canvasStateByPlacement,
    printSizes,
    regions,
    artworkByPlacement,
    selectedPrintArea,
    selectedRegion,
    selectedPrintSize,
    handleCanvasReady,
    handlePrintSizeChange,
    handleRegionChange,
    handlePlacementChange,
  };
}