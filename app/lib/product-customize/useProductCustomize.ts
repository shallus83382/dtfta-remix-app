import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { Canvas, FabricObject } from "fabric";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { buildPrintPlan } from "../dtfta-design";
import {
  exportCanvasToDataUrl,
  type DesignableRegion,
} from "../../components/DesignCanvas";
import type { DtftaPrintArea } from "../dtfta-products.server";
import type { PrintableAreaPayload } from "./types";
import {
  DEFAULT_DESIGN_REGION,
  getRegionFromPrintArea,
  normalizePlacementKey,
} from "./helpers";

type SubmitResult = {
  ok: boolean;
  error?: string;
  productId?: string;
  handle?: string;
};

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
  const fetcher = useFetcher<SubmitResult>();
  const shopify = useAppBridge();

  const defaultPlacement = normalizePlacementKey(printAreas[0]?.title ?? "front");

  const [placement, setPlacement] = useState<string>(defaultPlacement);
  const [canvases, setCanvases] = useState<Record<string, Canvas | null>>({});
  const [canvasStateByPlacement, setCanvasStateByPlacement] = useState<
    Record<string, unknown>
  >({});
  const [printSizes, setPrintSizes] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const [regions, setRegions] = useState<Record<string, DesignableRegion>>({});
  const [artworkByPlacement, setArtworkByPlacement] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (!printAreas.length) return;

    const nextPrintSizes: Record<string, { width: number; height: number }> = {};
    const nextRegions: Record<string, DesignableRegion> = {};

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

  const handleAddToStore = useCallback(() => {
    const activeCanvas = canvases[placement];
    const activeArtwork = activeCanvas ? exportCanvasToDataUrl(activeCanvas) : "";

    const finalArtworkByPlacement: Record<string, string> = {
      ...artworkByPlacement,
      ...(activeArtwork ? { [placement]: activeArtwork } : {}),
    };

    const printPlan = buildPrintPlan(printSizes);

    const printableAreasPayload: PrintableAreaPayload[] = printAreas.map((area) => {
      const key = normalizePlacementKey(area.title);
      const region = regions[key] ?? getRegionFromPrintArea(area);
      const size = printSizes[key] ?? {
        width: Number(area.area_width || 250),
        height: Number(area.area_height || 250),
      };

      return {
        id: area.id,
        title: area.title,
        placement: key,
        artwork: finalArtworkByPlacement[key] ?? "",
        printSize: size,
        designableRegion: region,
        unit: area.unit ?? null,
        backgroundImage: area.image ?? null,
      };
    });

    const hasArtwork = printableAreasPayload.some((item) => Boolean(item.artwork));

    if (!printPlan && !hasArtwork) {
      shopify.toast.show("Add at least one placement (print size or artwork).");
      return;
    }

    const formData = new FormData();
    formData.set("productKey", productKey);
    formData.set("title", `${productName} Custom`);
    formData.set("productId", productId);
    formData.set("printPlan", printPlan);
    formData.set("printableAreas", JSON.stringify(printableAreasPayload));

    for (const [key, value] of Object.entries(finalArtworkByPlacement)) {
      if (value) {
        formData.set(`artwork_${key}`, value);
      }
    }

    fetcher.submit(formData, { method: "POST" });
  }, [
    artworkByPlacement,
    canvases,
    fetcher,
    placement,
    printAreas,
    printSizes,
    productKey,
    productName,
    regions,
    shopify,
  ]);

  const successHandled = useRef(false);

  useEffect(() => {
    if (fetcher.state === "idle") {
      successHandled.current = false;
    }
  }, [fetcher.state]);

  useEffect(() => {
    if (fetcher.data?.ok && fetcher.data.productId && !successHandled.current) {
      successHandled.current = true;
      shopify.toast.show("Product created");

      try {
        shopify.intents.invoke?.("edit:shopify/Product", {
          value: fetcher.data.productId,
        });
      } catch {
        // ignore
      }
    }
  }, [fetcher.data?.ok, fetcher.data?.productId, shopify]);

  return {
    fetcher,
    placement,
    selectedPrintArea,
    selectedRegion,
    selectedPrintSize,
    canvasStateByPlacement,
    handleCanvasReady,
    handlePrintSizeChange,
    handleRegionChange,
    handlePlacementChange,
    handleAddToStore,
  };
}