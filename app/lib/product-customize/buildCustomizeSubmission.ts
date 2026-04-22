import type { Canvas } from "fabric";
import { buildPrintPlan } from "../dtfta-design";
import { exportCanvasToDataUrl, extractCanvasArtworkSourceUrl } from "../../components/DesignCanvas";
import type { DtftaPrintArea, DtftaVariant } from "../dtfta-products.server";
import type {
  PlacementCanvasStateMap,
  PlacementPrintSizeMap,
  PlacementRegionMap,
  PrintableAreaPayload,
  ArtworkUrlPayload,
} from "./types";
import {
  getRegionFromPrintArea,
  normalizePlacementKey,
  buildColorPlacementKey,
  parseColorPlacementKey,
} from "./helpers";
import { getProductDesignAssetUrl } from "../design-assets";

type BuildCustomizeSubmissionArgs = {
  productKey: string;
  productName: string;
  productId: string;
  canvases: Record<string, Canvas | null>;
  canvasStateByPlacement: PlacementCanvasStateMap;
  artworkByPlacement: Record<string, string>;
  printAreas: DtftaPrintArea[];
  printSizes: PlacementPrintSizeMap;
  regions: PlacementRegionMap;
  selectedColor: string;
  variants: DtftaVariant[];
};

type BuildCustomizeSubmissionResult =
  | {
      ok: true;
      formData: FormData;
      printableAreas: PrintableAreaPayload[];
      printPlan: string;
      artworkUrls: Record<string, ArtworkUrlPayload>;
    }
  | {
      ok: false;
      error: string;
    };

function buildPrintableAreasForColor({
  colorCode,
  printAreas,
  printSizes,
  regions,
  finalArtworkByPlacement,
  canvasStateByPlacement,
}: {
  colorCode: string;
  printAreas: DtftaPrintArea[];
  printSizes: PlacementPrintSizeMap;
  regions: PlacementRegionMap;
  finalArtworkByPlacement: Record<string, string>;
  canvasStateByPlacement: PlacementCanvasStateMap;
}): PrintableAreaPayload[] {
  return printAreas.map((area) => {
    const placementKey = normalizePlacementKey(area.title);
    const storageKey = buildColorPlacementKey(colorCode, placementKey);
    const region = regions[storageKey] ?? getRegionFromPrintArea(area);
    const size = printSizes[storageKey] ?? {
      width: Number(area.area_width || 250),
      height: Number(area.area_height || 250),
    };

    return {
      id: area.id,
      title: area.title,
      placement: placementKey,
      artwork: finalArtworkByPlacement[storageKey] ?? "",
      printSize: size,
      designableRegion: region,
      unit: area.unit ?? null,
      backgroundImage: getProductDesignAssetUrl(area.image, colorCode) ?? null,
      editorState: canvasStateByPlacement[storageKey] ?? null,
    };
  });
}

function buildPrintPlanForColor({
  colorCode,
  printAreas,
  printSizes,
}: {
  colorCode: string;
  printAreas: DtftaPrintArea[];
  printSizes: PlacementPrintSizeMap;
}) {
  const selectedPrintSizes: PlacementPrintSizeMap = {};

  for (const area of printAreas) {
    const placementKey = normalizePlacementKey(area.title);
    const storageKey = buildColorPlacementKey(colorCode, placementKey);
    const size = printSizes[storageKey];

    if (size) {
      selectedPrintSizes[placementKey] = size;
    }
  }

  return buildPrintPlan(selectedPrintSizes);
}

export function buildCustomizeSubmission({
  productKey,
  productName,
  productId,
  canvases,
  canvasStateByPlacement,
  artworkByPlacement,
  printAreas,
  printSizes,
  regions,
  selectedColor,
  variants,
}: BuildCustomizeSubmissionArgs): BuildCustomizeSubmissionResult {
  const finalArtworkByPlacement: Record<string, string> = {
    ...artworkByPlacement,
  };
  const finalCustomArtworkByPlacement: Record<string, string> = {};

  for (const [storageKey, canvas] of Object.entries(canvases)) {
    if (!canvas) continue;

    const { placement } = parseColorPlacementKey(storageKey);
    const placementArea = printAreas.find(
      (area) => normalizePlacementKey(area.title) === placement
    );
    const regionForExport =
      regions[storageKey] ??
      (placementArea ? getRegionFromPrintArea(placementArea) : getRegionFromPrintArea(printAreas[0]));

    const exportedCustomArtwork = exportCanvasToDataUrl(canvas, {
      region: regionForExport,
      includeBackground: false,
    });
    const sourceArtworkUrl = exportCanvasToDataUrl(canvas);
    if (sourceArtworkUrl) {
      finalArtworkByPlacement[storageKey] = sourceArtworkUrl;
    }
    if (exportedCustomArtwork) {
      finalCustomArtworkByPlacement[storageKey] = exportedCustomArtwork;
    }
  }

  const printableAreas = buildPrintableAreasForColor({
    colorCode: selectedColor,
    printAreas,
    printSizes,
    regions,
    finalArtworkByPlacement,
    canvasStateByPlacement,
  });

  const printPlan = buildPrintPlanForColor({
    colorCode: selectedColor,
    printAreas,
    printSizes,
  });

  const allColorCodes = Array.from(
    new Set([
      selectedColor,
      ...variants
        .filter((variant) => variant.is_active)
        .map((variant) => String(variant.colorCode || "").trim())
        .filter(Boolean),
    ])
  );

  const artworkUrls = allColorCodes.reduce<Record<string, ArtworkUrlPayload>>((acc, colorCode) => {
    for (const area of printAreas) {
      const placement = normalizePlacementKey(area.title);
      const colorKey = buildColorPlacementKey(colorCode, placement);
      const selectedColorKey = buildColorPlacementKey(selectedColor, placement);

      const artworkUrl =
        finalArtworkByPlacement[colorKey] ??
        finalArtworkByPlacement[selectedColorKey] ??
        "";
      const customArtworkUrl =
        finalCustomArtworkByPlacement[colorKey] ??
        finalCustomArtworkByPlacement[selectedColorKey] ??
        "";

      if (!artworkUrl) continue;

      const designableRegion =
        regions[colorKey] ??
        regions[selectedColorKey] ??
        getRegionFromPrintArea(area);

      const printSize =
        printSizes[colorKey] ??
        printSizes[selectedColorKey] ?? {
          width: Number(area.area_width || 250),
          height: Number(area.area_height || 250),
        };

      const payloadKey = `${colorCode}_${placement}`;
      acc[payloadKey] = {
        colorCode,
        placement,
        artworkUrl,
        ...(customArtworkUrl ? { customArtworkUrl } : {}),
        designableRegion,
        printSize,
      };
    }

    return acc;
  }, {});

  const hasArtwork = Object.values(finalArtworkByPlacement).some((artwork) => Boolean(artwork));

  const hasPrintPlan = Boolean(printPlan);

  if (!hasPrintPlan && !hasArtwork) {
    return {
      ok: false,
      error: "Add at least one placement with artwork or print-size changes.",
    };
  }

  const formData = new FormData();
  formData.set("productKey", productKey);
  formData.set("title", `${productName}`);
  formData.set("productId", productId);
  formData.set("printPlan", printPlan);
  const printableAreasPayload = printableAreas.map((area) => ({
    id: area.id,
    title: area.title,
    placement: area.placement,
    artwork: "",
    printSize: area.printSize,
    designableRegion: area.designableRegion,
    unit: area.unit,
  }));
  formData.set("printableAreas", JSON.stringify(printableAreasPayload));
  formData.set("selectedColor", selectedColor || "");
  formData.set("artworkUrls", JSON.stringify(artworkUrls));

  return {
    ok: true,
    formData,
    printableAreas,
    printPlan,
    artworkUrls,
  };
}
