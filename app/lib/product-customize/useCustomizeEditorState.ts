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
  buildColorPlacementKey,
} from "./helpers";
import { exportCanvasToDataUrl } from "../../components/DesignCanvas";

type UseCustomizeEditorStateArgs = {
  printAreas: DtftaPrintArea[];
  selectedColor: string;
};

export function useCustomizeEditorState({
  printAreas,
  selectedColor,
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
  const selectedColorRef = useRef<string>(selectedColor);

  useEffect(() => {
    placementRef.current = placement;
  }, [placement]);

  useEffect(() => {
    selectedColorRef.current = selectedColor;
  }, [selectedColor]);

  useEffect(() => {
    if (!printAreas.length) return;

    setPrintSizes((prev) => {
      const next = { ...prev };

      for (const area of printAreas) {
        const placementKey = normalizePlacementKey(area.title);
        const storageKey = buildColorPlacementKey(selectedColor, placementKey);

        if (!next[storageKey]) {
          next[storageKey] = {
            width: Number(area.area_width || 250),
            height: Number(area.area_height || 250),
          };
        }
      }

      return next;
    });

    setRegions((prev) => {
      const next = { ...prev };

      for (const area of printAreas) {
        const placementKey = normalizePlacementKey(area.title);
        const storageKey = buildColorPlacementKey(selectedColor, placementKey);

        if (!next[storageKey]) {
          next[storageKey] = getRegionFromPrintArea(area);
        }
      }

      return next;
    });

    setPlacement((prev) => prev || normalizePlacementKey(printAreas[0].title));
  }, [printAreas, selectedColor]);

  const selectedPrintArea = useMemo(
    () => printAreas.find((area) => normalizePlacementKey(area.title) === placement),
    [printAreas, placement]
  );

  const selectedStorageKey = buildColorPlacementKey(selectedColor, placement);

  const selectedRegion = selectedPrintArea
    ? regions[selectedStorageKey] ?? getRegionFromPrintArea(selectedPrintArea)
    : DEFAULT_DESIGN_REGION;

  const selectedPrintSize = selectedPrintArea
    ? printSizes[selectedStorageKey] ?? {
        width: Number(selectedPrintArea.area_width || 250),
        height: Number(selectedPrintArea.area_height || 250),
      }
    : { width: 12, height: 16 };

  const handleCanvasReady = useCallback(
    (placementKey: string, canvas: Canvas) => {
      const storageKey = buildColorPlacementKey(selectedColorRef.current, placementKey);

      setCanvases((prev) => {
        if (prev[storageKey] === canvas) return prev;
        return { ...prev, [storageKey]: canvas };
      });
    },
    []
  );

  const handlePrintSizeChange = useCallback(
    (placementKey: string, w: number, h: number) => {
      const storageKey = buildColorPlacementKey(selectedColorRef.current, placementKey);

      setPrintSizes((prev) => {
        const current = prev[storageKey];
        if (current && current.width == w && current.height == h) return prev;
        return { ...prev, [storageKey]: { width: w, height: h } };
      });
    },
    []
  );

  const handleRegionChange = useCallback(
    (placementKey: string, region: DesignableRegion) => {
      const storageKey = buildColorPlacementKey(selectedColorRef.current, placementKey);

      setRegions((prev) => {
        const current = prev[storageKey];

        if (
          current &&
          current.left == region.left &&
          current.top == region.top &&
          current.width == region.width &&
          current.height == region.height
        ) {
          return prev;
        }

        return { ...prev, [storageKey]: region };
      });
    },
    []
  );

  const serializePlacementState = useCallback(
    (placementKey: string, colorCode?: string) => {
      const storageKey = buildColorPlacementKey(
        colorCode ?? selectedColorRef.current,
        placementKey
      );
      const canvas = canvases[storageKey];
      if (!canvas) return null;

      try {
        const objects = canvas.getObjects();

        const userObjects = objects.filter((obj) => {
          const anyObj = obj as FabricObject & { data?: Record<string, unknown> };
          return !anyObj.data?.__internal;
        });

        const serialized = userObjects
          .map((obj) =>
            typeof (obj as FabricObject & { toObject?: () => unknown }).toObject ==
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
    (placementKey: string, colorCode?: string) => {
      const storageKey = buildColorPlacementKey(
        colorCode ?? selectedColorRef.current,
        placementKey
      );
      const canvas = canvases[storageKey];
      if (!canvas) return "";

      const dataUrl = exportCanvasToDataUrl(canvas);
      return dataUrl || "";
    },
    [canvases]
  );

  const savePlacementSnapshot = useCallback(
    (placementKey: string, colorCode?: string) => {
      const effectiveColor = colorCode ?? selectedColorRef.current;
      const storageKey = buildColorPlacementKey(effectiveColor, placementKey);

      const nextCanvasState = serializePlacementState(placementKey, effectiveColor);
      const nextArtwork = exportPlacementArtwork(placementKey, effectiveColor);

      if (nextCanvasState) {
        const mergedCanvasState = {
          ...canvasStateRef.current,
          [storageKey]: nextCanvasState,
        };
        canvasStateRef.current = mergedCanvasState;
        flushSync(() => {
          setCanvasStateByPlacement(mergedCanvasState);
        });
      }

      if (nextArtwork) {
        const mergedArtwork = {
          ...artworkRef.current,
          [storageKey]: nextArtwork,
        };
        artworkRef.current = mergedArtwork;
        flushSync(() => {
          setArtworkByPlacement(mergedArtwork);
        });
      }

      return {
        editorState: nextCanvasState ?? canvasStateRef.current[storageKey] ?? null,
        artwork: nextArtwork || artworkRef.current[storageKey] || "",
      };
    },
    [exportPlacementArtwork, serializePlacementState]
  );

  const saveAllPlacements = useCallback(
    (colorCode?: string) => {
      const effectiveColor = colorCode ?? selectedColorRef.current;

      for (const area of printAreas) {
        const placementKey = normalizePlacementKey(area.title);
        savePlacementSnapshot(placementKey, effectiveColor);
      }
    },
    [printAreas, savePlacementSnapshot]
  );

  const handlePlacementChange = useCallback(
    (nextPlacement: string) => {
      if (nextPlacement == placementRef.current) return;
      savePlacementSnapshot(placementRef.current, selectedColorRef.current);
      setPlacement(nextPlacement);
    },
    [savePlacementSnapshot]
  );

  const getCanvasStateForPlacement = useCallback(
    (placementKey: string, colorCode?: string) => {
      const storageKey = buildColorPlacementKey(
        colorCode ?? selectedColorRef.current,
        placementKey
      );
      return canvasStateRef.current[storageKey];
    },
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
