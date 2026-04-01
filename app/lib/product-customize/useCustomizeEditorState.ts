import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { flushSync } from "react-dom";
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

  const canvasStateRef = useRef<PlacementCanvasStateMap>({});
  const artworkRef = useRef<Record<string, string>>({});
  const placementRef = useRef<string>(defaultPlacement);

  useEffect(() => {
    placementRef.current = placement;
  }, [placement]);

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

  const serializePlacementState = useCallback(
    (placementKey: string) => {
      const canvas = canvases[placementKey];
      if (!canvas) return null;

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

        return { objects: serialized };
      } catch (error) {
        console.error("Failed to save canvas objects", error);
        return null;
      }
    },
    [canvases]
  );

  const exportPlacementArtwork = useCallback(
    (placementKey: string) => {
      const canvas = canvases[placementKey];
      if (!canvas) return "";

      const dataUrl = exportCanvasToDataUrl(canvas);
      return dataUrl || "";
    },
    [canvases]
  );

  const savePlacementSnapshot = useCallback(
    (placementKey: string) => {
      const nextCanvasState = serializePlacementState(placementKey);
      const nextArtwork = exportPlacementArtwork(placementKey);

      if (nextCanvasState) {
        const mergedCanvasState = {
          ...canvasStateRef.current,
          [placementKey]: nextCanvasState,
        };
        canvasStateRef.current = mergedCanvasState;
        flushSync(() => {
          setCanvasStateByPlacement(mergedCanvasState);
        });
      }

      if (nextArtwork) {
        const mergedArtwork = {
          ...artworkRef.current,
          [placementKey]: nextArtwork,
        };
        artworkRef.current = mergedArtwork;
        flushSync(() => {
          setArtworkByPlacement(mergedArtwork);
        });
      }

      return {
        editorState: nextCanvasState ?? canvasStateRef.current[placementKey] ?? null,
        artwork: nextArtwork || artworkRef.current[placementKey] || "",
      };
    },
    [exportPlacementArtwork, serializePlacementState]
  );

  const saveAllPlacements = useCallback(() => {
    for (const placementKey of Object.keys(canvases)) {
      savePlacementSnapshot(placementKey);
    }
  }, [canvases, savePlacementSnapshot]);

  const handlePlacementChange = useCallback(
    (nextPlacement: string) => {
      if (nextPlacement === placementRef.current) return;
      savePlacementSnapshot(placementRef.current);
      setPlacement(nextPlacement);
    },
    [savePlacementSnapshot]
  );

  const getCanvasStateForPlacement = useCallback(
    (placementKey: string) => canvasStateRef.current[placementKey],
    []
  );

  return {
    placement,
    canvases,
    canvasStateByPlacement,
    canvasStateRef,
    printSizes,
    regions,
    artworkByPlacement,
    artworkRef,
    selectedPrintArea,
    selectedRegion,
    selectedPrintSize,
    handleCanvasReady,
    handlePrintSizeChange,
    handleRegionChange,
    handlePlacementChange,
    savePlacementSnapshot,
    saveAllPlacements,
    getCanvasStateForPlacement,
  };
}