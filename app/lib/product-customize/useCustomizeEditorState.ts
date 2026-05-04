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
  /** Library asset ids from the artwork API, keyed by normalized placement (shared across colors). */
  const artworkLibraryIdRef = useRef<Record<string, string>>({});
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
        if (!next[placementKey]) {
          next[placementKey] = {
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
        if (!next[placementKey]) {
          next[placementKey] = getRegionFromPrintArea(area);
        }
      }

      return next;
    });

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

  const handleCanvasReady = useCallback(
    (placementKey: string, canvas: Canvas) => {
      const normalizedPlacement = normalizePlacementKey(placementKey);

      setCanvases((prev) => {
        if (prev[normalizedPlacement] === canvas) return prev;
        return { ...prev, [normalizedPlacement]: canvas };
      });
    },
    []
  );

  const handlePrintSizeChange = useCallback(
    (placementKey: string, w: number, h: number) => {
      setPrintSizes((prev) => {
        const current = prev[placementKey];
        if (current && current.width == w && current.height == h) return prev;
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
          current.left == region.left &&
          current.top == region.top &&
          current.width == region.width &&
          current.height == region.height
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
      const normalizedPlacement = normalizePlacementKey(placementKey);
      const canvas = canvases[normalizedPlacement];
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
    (placementKey: string) => {
      const normalizedPlacement = normalizePlacementKey(placementKey);
      const canvas = canvases[normalizedPlacement];
      if (!canvas) return "";

      const placementArea = printAreas.find(
        (area) => normalizePlacementKey(area.title) === normalizedPlacement
      );
      const regionForExport =
        regions[normalizedPlacement] ??
        (placementArea ? getRegionFromPrintArea(placementArea) : getRegionFromPrintArea(printAreas[0]));

      const dataUrl = exportCanvasToDataUrl(canvas, {
        region: regionForExport,
        includeBackground: false,
      });
      return dataUrl || "";
    },
    [canvases, printAreas, regions]
  );

  const setArtworkLibraryIdForPlacement = useCallback((placementKey: string, libraryArtworkId: string | null) => {
    const normalizedPlacement = normalizePlacementKey(placementKey);
    const next = { ...artworkLibraryIdRef.current };
    if (libraryArtworkId == null || libraryArtworkId === "") {
      delete next[normalizedPlacement];
    } else {
      next[normalizedPlacement] = libraryArtworkId;
    }
    artworkLibraryIdRef.current = next;
  }, []);

  const savePlacementSnapshot = useCallback(
    (placementKey: string) => {
      const normalizedPlacement = normalizePlacementKey(placementKey);

      const nextCanvasState = serializePlacementState(normalizedPlacement);
      const nextArtwork = exportPlacementArtwork(normalizedPlacement);

      if (nextCanvasState) {
        const mergedCanvasState = {
          ...canvasStateRef.current,
          [normalizedPlacement]: nextCanvasState,
        };
        canvasStateRef.current = mergedCanvasState;
        flushSync(() => {
          setCanvasStateByPlacement(mergedCanvasState);
        });
      }

      if (nextArtwork && nextArtwork.trim()) {
        const mergedArtwork = {
          ...artworkRef.current,
          [normalizedPlacement]: nextArtwork,
        };
        artworkRef.current = mergedArtwork;
        flushSync(() => {
          setArtworkByPlacement(mergedArtwork);
        });
      } else {
        const activeCanvas = canvases[normalizedPlacement];
        if (activeCanvas) {
          const ids = { ...artworkLibraryIdRef.current };
          delete ids[normalizedPlacement];
          artworkLibraryIdRef.current = ids;
        }
      }

      return {
        editorState: nextCanvasState ?? canvasStateRef.current[normalizedPlacement] ?? null,
        artwork: nextArtwork || artworkRef.current[normalizedPlacement] || "",
      };
    },
    [canvases, exportPlacementArtwork, serializePlacementState]
  );

  const saveAllPlacements = useCallback(
    () => {
      for (const area of printAreas) {
        const placementKey = normalizePlacementKey(area.title);
        savePlacementSnapshot(placementKey);
      }
    },
    [printAreas, savePlacementSnapshot]
  );

  const handlePlacementChange = useCallback(
    (nextPlacement: string) => {
      if (nextPlacement == placementRef.current) return;
      savePlacementSnapshot(placementRef.current);
      setPlacement(nextPlacement);
    },
    [savePlacementSnapshot]
  );

  const getCanvasStateForPlacement = useCallback(
    (placementKey: string) => {
      const normalizedPlacement = normalizePlacementKey(placementKey);
      return canvasStateRef.current[normalizedPlacement];
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
    artworkLibraryIdRef,
    setArtworkLibraryIdForPlacement,
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
