import type { Canvas } from "fabric";
import { buildPrintPlan } from "../dtfta-design";
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
} from "./helpers";
import { getProductDesignAssetUrl } from "../design-assets";
import {
  buildPlacementMockups,
  type ColorMockupOption,
} from "./mockup-composer";

/** Laravel expects `productId` to be a DB integer; omit non-numeric template keys. */
function sanitizeDbProductId(raw: string): string {
  const s = String(raw ?? "").trim();
  return /^\d+$/.test(s) ? s : "";
}

type BuildCustomizeSubmissionArgs = {
  productKey: string;
  productName: string;
  productId: string;
  canvases: Record<string, Canvas | null>;
  canvasStateByPlacement: PlacementCanvasStateMap;
  artworkByPlacement: Record<string, string>;
  /**
   * Canvas dimensions per placement captured at snapshot time. Used so that
   * non-active placements compose mockups at the same dimensions that produced
   * their saved artwork (preserving the design's aspect ratio).
   */
  canvasSizesByPlacement?: Record<string, { width: number; height: number }>;
  /** Optional library asset ids per placement (from artwork API). */
  artworkLibraryIds?: Record<string, string>;
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

function buildPrintableAreasForSelectedColor({
  selectedColor,
  printAreas,
  printSizes,
  regions,
  artworkUrls,
  canvasStateByPlacement,
}: {
  selectedColor: string;
  printAreas: DtftaPrintArea[];
  printSizes: PlacementPrintSizeMap;
  regions: PlacementRegionMap;
  artworkUrls: Record<string, ArtworkUrlPayload>;
  canvasStateByPlacement: PlacementCanvasStateMap;
}): PrintableAreaPayload[] {
  return printAreas.map((area) => {
    const placement = normalizePlacementKey(area.title);
    const region = regions[placement] ?? getRegionFromPrintArea(area);
    const size = printSizes[placement] ?? {
      width: Number(area.area_width || 250),
      height: Number(area.area_height || 250),
    };

    const payloadKey = `${selectedColor}_${placement}`;

    return {
      id: area.id,
      title: area.title,
      placement,
      artwork: artworkUrls[payloadKey]?.artworkUrl ?? "",
      printSize: size,
      designableRegion: region,
      unit: area.unit ?? null,
      backgroundImage: getProductDesignAssetUrl(area.image, selectedColor) ?? null,
      editorState: canvasStateByPlacement[placement] ?? null,
    };
  });
}

function buildPrintPlanForSharedPlacements({
  printAreas,
  printSizes,
}: {
  printAreas: DtftaPrintArea[];
  printSizes: PlacementPrintSizeMap;
}) {
  const selectedPrintSizes: PlacementPrintSizeMap = {};

  for (const area of printAreas) {
    const placement = normalizePlacementKey(area.title);
    const size = printSizes[placement];

    if (size) {
      selectedPrintSizes[placement] = size;
    }
  }

  return buildPrintPlan(selectedPrintSizes);
}

export async function buildCustomizeSubmission({
  productKey,
  productName,
  productId,
  canvases,
  canvasStateByPlacement,
  artworkByPlacement,
  canvasSizesByPlacement,
  artworkLibraryIds,
  printAreas,
  printSizes,
  regions,
  selectedColor,
  variants,
}: BuildCustomizeSubmissionArgs): Promise<BuildCustomizeSubmissionResult> {
  const allColorCodes = Array.from(
    new Set([
      selectedColor,
      ...variants
        .filter((variant) => variant.is_active)
        .map((variant) => String(variant.colorCode || "").trim())
        .filter(Boolean),
    ])
  );

  const artworkUrls: Record<string, ArtworkUrlPayload> = {};

  /**
   * Build per-placement print-only artwork + per-color mockups using the
   * shared `buildPlacementMockups` helper. This is the SAME function the
   * Preview modal calls, so the published mockups are byte-identical to the
   * ones the user just previewed (assuming the canvas hasn't changed).
   */
  for (const area of printAreas) {
    const placement = normalizePlacementKey(area.title);
    const region = regions[placement] ?? getRegionFromPrintArea(area);
    const printSize = printSizes[placement] ?? {
      width: Number(area.area_width || 250),
      height: Number(area.area_height || 250),
    };

    const colors: ColorMockupOption[] = allColorCodes.map((colorCode) => ({
      colorCode,
      colorName: colorCode,
      backgroundImageUrl: area.image
        ? getProductDesignAssetUrl(area.image, colorCode)
        : "",
    }));

    const result = await buildPlacementMockups({
      placement,
      placementTitle: area.title,
      region,
      liveCanvas: canvases[placement] ?? null,
      savedPrintOnlyUrl: artworkByPlacement[placement] ?? "",
      savedCanvasSize: canvasSizesByPlacement?.[placement] ?? null,
      colors,
    });

    if (!result) continue;

    const libraryArtworkId = artworkLibraryIds?.[placement]?.trim();

    for (const colorCode of allColorCodes) {
      const mockupUrl = result.mockupsByColor[colorCode] ?? "";

      /**
       * artworkUrl = product variation media/mockup.
       * customArtworkUrl = transparent print-only art.
       */
      artworkUrls[`${colorCode}_${placement}`] = {
        colorCode,
        placement,
        artworkUrl: mockupUrl,
        customArtworkUrl: result.printOnlyUrl,
        designableRegion: region,
        printSize,
        ...(libraryArtworkId ? { libraryArtworkId } : {}),
      };
    }
  }

  const printableAreas = buildPrintableAreasForSelectedColor({
    selectedColor,
    printAreas,
    printSizes,
    regions,
    artworkUrls,
    canvasStateByPlacement,
  });

  const printPlan = buildPrintPlanForSharedPlacements({
    printAreas,
    printSizes,
  });

  const hasArtwork = Object.values(artworkUrls).some(
    (payload) => Boolean(payload.artworkUrl || payload.customArtworkUrl)
  );

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
  formData.set("productId", sanitizeDbProductId(productId));
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
