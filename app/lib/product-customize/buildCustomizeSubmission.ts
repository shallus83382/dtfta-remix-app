import type { Canvas } from "fabric";
import { buildPrintPlan } from "../dtfta-design";
import { exportCanvasToDataUrl } from "../../components/DesignCanvas";
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

const CANVAS_SIZE = 500;

type BuildCustomizeSubmissionArgs = {
  productKey: string;
  productName: string;
  productId: string;
  canvases: Record<string, Canvas | null>;
  canvasStateByPlacement: PlacementCanvasStateMap;
  artworkByPlacement: Record<string, string>;
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

function getCanvasSize(canvas: Canvas | null) {
  const anyCanvas = canvas as
    | (Canvas & {
        getWidth?: () => number;
        getHeight?: () => number;
      })
    | null;

  return {
    width: anyCanvas?.getWidth?.() || CANVAS_SIZE,
    height: anyCanvas?.getHeight?.() || CANVAS_SIZE,
  };
}

function getScaledRegion({
  region,
  canvasWidth,
  canvasHeight,
}: {
  region: { left: number; top: number; width: number; height: number };
  canvasWidth: number;
  canvasHeight: number;
}) {
  const scaleX = canvasWidth / CANVAS_SIZE;
  const scaleY = canvasHeight / CANVAS_SIZE;

  return {
    left: region.left * scaleX,
    top: region.top * scaleY,
    width: region.width * scaleX,
    height: region.height * scaleY,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.crossOrigin = "anonymous";

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));

    image.src = src;
  });
}

/**
 * Builds a product-media mockup for one color.
 *
 * This intentionally mirrors DesignCanvas preview behavior:
 * - background is contained inside the editor canvas and centered
 * - artwork crop is drawn into the selected print region
 *
 * This lets one shared print-only artwork be reused for every color background.
 */
async function composeMockupImage({
  backgroundImageUrl,
  artworkDataUrl,
  region,
  canvasWidth,
  canvasHeight,
  multiplier = 3,
}: {
  backgroundImageUrl: string;
  artworkDataUrl: string;
  region: { left: number; top: number; width: number; height: number };
  canvasWidth: number;
  canvasHeight: number;
  multiplier?: number;
}): Promise<string> {
  const [backgroundImage, artworkImage] = await Promise.all([
    loadImage(backgroundImageUrl),
    loadImage(artworkDataUrl),
  ]);

  const output = document.createElement("canvas");
  output.width = Math.max(1, Math.round(canvasWidth * multiplier));
  output.height = Math.max(1, Math.round(canvasHeight * multiplier));

  const ctx = output.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create canvas context");
  }

  ctx.scale(multiplier, multiplier);
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  const bgWidth = backgroundImage.naturalWidth || backgroundImage.width || 1;
  const bgHeight = backgroundImage.naturalHeight || backgroundImage.height || 1;
  const bgScale = Math.min(canvasWidth / bgWidth, canvasHeight / bgHeight);
  const bgDrawWidth = bgWidth * bgScale;
  const bgDrawHeight = bgHeight * bgScale;
  const bgLeft = canvasWidth / 2 - bgDrawWidth / 2;
  const bgTop = canvasHeight / 2 - bgDrawHeight / 2;

  ctx.drawImage(backgroundImage, bgLeft, bgTop, bgDrawWidth, bgDrawHeight);

  const drawRegion = getScaledRegion({ region, canvasWidth, canvasHeight });

  /**
   * The artworkDataUrl is already a crop of this exact print region.
   * Drawing it into the same region recreates the editor preview without
   * shifting or changing the user's placement.
   */
  ctx.drawImage(
    artworkImage,
    drawRegion.left,
    drawRegion.top,
    drawRegion.width,
    drawRegion.height
  );

  return output.toDataURL("image/png");
}

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
  artworkLibraryIds,
  printAreas,
  printSizes,
  regions,
  selectedColor,
  variants,
}: BuildCustomizeSubmissionArgs): Promise<BuildCustomizeSubmissionResult> {
  const printOnlyArtworkByPlacement: Record<string, string> = {
    ...artworkByPlacement,
  };

  const canvasSizeByPlacement: Record<string, { width: number; height: number }> = {};

  /**
   * Export one shared print-only artwork per placement.
   * This artwork has no shirt/background and is reused for every color.
   */
  for (const area of printAreas) {
    const placement = normalizePlacementKey(area.title);
    const canvas = canvases[placement] ?? null;
    if (!canvas) continue;

    const region = regions[placement] ?? getRegionFromPrintArea(area);
    canvasSizeByPlacement[placement] = getCanvasSize(canvas);

    const printOnlyArtwork = exportCanvasToDataUrl(canvas, {
      region,
      includeBackground: false,
    });

    if (printOnlyArtwork) {
      printOnlyArtworkByPlacement[placement] = printOnlyArtwork;
    }
  }

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
   * Generate one mockup image per color + placement:
   * selected/shared artwork + that color's background image.
   */
  for (const colorCode of allColorCodes) {
    for (const area of printAreas) {
      const placement = normalizePlacementKey(area.title);
      const region = regions[placement] ?? getRegionFromPrintArea(area);
      const printSize = printSizes[placement] ?? {
        width: Number(area.area_width || 250),
        height: Number(area.area_height || 250),
      };

      const customArtworkUrl = printOnlyArtworkByPlacement[placement] ?? "";
      if (!customArtworkUrl) continue;

      const backgroundImageUrl = area.image
        ? getProductDesignAssetUrl(area.image, colorCode)
        : "";

      const canvasSize = canvasSizeByPlacement[placement] ?? {
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
      };

      let artworkUrl = "";

      if (backgroundImageUrl) {
        try {
          artworkUrl = await composeMockupImage({
            backgroundImageUrl,
            artworkDataUrl: customArtworkUrl,
            region,
            canvasWidth: canvasSize.width,
            canvasHeight: canvasSize.height,
          });
        } catch (error) {
          console.error(
            `Failed to compose mockup for ${colorCode} / ${placement}`,
            error
          );
        }
      }

      const libraryArtworkId = artworkLibraryIds?.[placement]?.trim();

      /**
       * artworkUrl = product variation media/mockup.
       * customArtworkUrl = transparent print-only art.
       */
      artworkUrls[`${colorCode}_${placement}`] = {
        colorCode,
        placement,
        artworkUrl,
        customArtworkUrl,
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
