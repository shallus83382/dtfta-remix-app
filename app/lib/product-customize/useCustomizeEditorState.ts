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
import {
  computeDesignLayerSummaries,
  type DesignLayerSummary,
} from "./design-layer-summary";
import { exportCanvasToDataUrl, FABRIC_EXPORT_MULTIPLIER } from "../../components/DesignCanvas";
import { getPhysicalPrintSize } from "./print-area-dimensions";

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
  const placementRef = useRef<string>(defaultPlacement);
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
  /**
   * Canvas dimensions captured at snapshot time, keyed by normalized placement.
   * Saved alongside the artwork so we can recompose mockups with the same
   * non-uniform scaling that produced the artwork crop, instead of distorting
   * the design when only a 500x500 fallback is available.
   */
  const canvasSizeRef = useRef<Record<string, { width: number; height: number }>>({});
  /** Library asset ids from the artwork API, keyed by normalized placement (shared across colors). */
  const artworkLibraryIdRef = useRef<Record<string, string>>({});
  /**
   * Last known design layer summaries per placement (print-area units), updated when
   * we snapshot a placement that still has a live Fabric canvas.
   */
  const designLayersByPlacementRef = useRef<Record<string, DesignLayerSummary[]>>(
    {}
  );
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
          next[placementKey] = getPhysicalPrintSize(area);
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
    ? printSizes[placement] ?? getPhysicalPrintSize(selectedPrintArea)
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
          .map((obj) => {
            if (
              typeof (obj as FabricObject & { toObject?: () => unknown }).toObject !==
              "function"
            ) {
              return null;
            }
            const raw = (obj as FabricObject & { toObject: () => unknown }).toObject() as Record<
              string,
              unknown
            >;
            const liveData = (obj as FabricObject & { data?: Record<string, unknown> }).data;
            if (liveData && typeof liveData === "object") {
              const base =
                raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)
                  ? { ...(raw.data as Record<string, unknown>) }
                  : {};
              const lid =
                typeof liveData.layerId === "string" && liveData.layerId.trim()
                  ? liveData.layerId.trim()
                  : "";
              let lib = "";
              if (typeof liveData.libraryArtworkId === "string") {
                lib = liveData.libraryArtworkId.trim();
              }
              if (!lib && typeof liveData.artworkId === "string") {
                lib = liveData.artworkId.trim();
              }
              if (lid) base.layerId = lid;
              if (lib) {
                base.libraryArtworkId = lib;
                base.artworkId = lib;
              }
              raw.data = {
                ...base,
                __internal: Boolean(base.__internal),
                kind: typeof base.kind === "string" ? base.kind : "design",
              };
            }
            return raw;
          })
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
      const fallbackArea = printAreas[0];
      const regionForExport =
        regions[normalizedPlacement] ??
        (placementArea
          ? getRegionFromPrintArea(placementArea)
          : fallbackArea
            ? getRegionFromPrintArea(fallbackArea)
            : DEFAULT_DESIGN_REGION);

      const dataUrl = exportCanvasToDataUrl(canvas, {
        region: regionForExport,
        includeBackground: false,
        multiplier: FABRIC_EXPORT_MULTIPLIER,
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

        const liveCanvas = canvases[normalizedPlacement] as
          | (Canvas & { getWidth?: () => number; getHeight?: () => number })
          | undefined;
        if (liveCanvas) {
          const width = liveCanvas.getWidth?.() ?? 0;
          const height = liveCanvas.getHeight?.() ?? 0;
          if (width > 0 && height > 0) {
            canvasSizeRef.current = {
              ...canvasSizeRef.current,
              [normalizedPlacement]: { width, height },
            };
          }
        }
      } else {
        /**
         * Only clear the library-artwork binding when we're snapshotting the
         * currently-active placement. For inactive placements, `canvases[key]`
         * may hold a disposed Fabric reference (its DesignCanvas has unmounted
         * but the entry was never removed from this state map) — exporting
         * such a canvas returns null, which would otherwise look like "user
         * cleared the canvas" and incorrectly drop the libraryArtworkId we set
         * when the merchant picked from the artwork library.
         */
        const isCurrentPlacement =
          normalizedPlacement === placementRef.current;
        const activeCanvas = canvases[normalizedPlacement];
        if (isCurrentPlacement && activeCanvas) {
          const ids = { ...artworkLibraryIdRef.current };
          delete ids[normalizedPlacement];
          artworkLibraryIdRef.current = ids;
        }
      }

      try {
        const canvas = canvases[normalizedPlacement];
        if (canvas) {
          const placementArea = printAreas.find(
            (area) => normalizePlacementKey(area.title) === normalizedPlacement
          );
          const region =
            regions[normalizedPlacement] ??
            (placementArea ? getRegionFromPrintArea(placementArea) : DEFAULT_DESIGN_REGION);
          const printSize =
            printSizes[normalizedPlacement] ??
            (placementArea ? getPhysicalPrintSize(placementArea) : { width: 12, height: 16 });

          const liveCanvas = canvas as Canvas & {
            getWidth?: () => number;
            getHeight?: () => number;
          };
          const width = liveCanvas.getWidth?.() ?? 0;
          const height = liveCanvas.getHeight?.() ?? 0;
          if (width > 0 && height > 0) {
            const layers = computeDesignLayerSummaries(canvas, {
              designableRegion: region,
              canvasPixelWidth: width,
              canvasPixelHeight: height,
              printWidth: printSize.width,
              printHeight: printSize.height,
            });
            designLayersByPlacementRef.current = {
              ...designLayersByPlacementRef.current,
              [normalizedPlacement]: layers,
            };
          }
        }
      } catch (error) {
        console.error("Failed to snapshot design layers", error);
      }

      return {
        editorState: nextCanvasState ?? canvasStateRef.current[normalizedPlacement] ?? null,
        artwork: nextArtwork || artworkRef.current[normalizedPlacement] || "",
      };
    },
    [
      canvases,
      exportPlacementArtwork,
      serializePlacementState,
      printAreas,
      regions,
      printSizes,
    ]
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
    canvasSizeRef,
    artworkLibraryIdRef,
    designLayersByPlacementRef,
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
