import type { Canvas } from "fabric";
import { buildPrintPlan } from "../dtfta-design";
import type {
  DtftaColorMockups,
  DtftaPrintArea,
  DtftaVariant,
} from "../dtfta-products.server";
import type {
  PlacementCanvasStateMap,
  PlacementPrintSizeMap,
  PlacementRegionMap,
  PrintableAreaPayload,
  ArtworkUrlPayload,
  ArtworkLayerMeta,
  VariantRetailPrice,
} from "./types";
import type { DesignLayerSummary } from "./design-layer-summary";
import {
  getRegionFromPrintArea,
  normalizePlacementKey,
} from "./helpers";
import { getPhysicalPrintSize } from "./print-area-dimensions";
import {
  getPrintAreaBackgroundImageUrl,
  getPrintAreaBackgroundImageUrlForFabric,
  type ProductDesignAssetOptions,
} from "../design-assets";
import {
  buildPlacementMockups,
  type ColorMockupOption,
} from "./mockup-composer";

function compressImageDataUrl(
  dataUrl: string,
  options: { maxEdge: number; type: "image/jpeg" | "image/png"; quality?: number }
): Promise<string> {
  if (!dataUrl.startsWith("data:image/") || typeof document === "undefined") {
    return Promise.resolve(dataUrl);
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const longest = Math.max(image.width, image.height) || 1;
      const scale = Math.min(1, options.maxEdge / longest);
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(dataUrl);
        return;
      }
      if (options.type === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL(options.type, options.quality ?? 0.82));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

/** Laravel expects `productId` to be a DB integer; omit non-numeric template keys. */
function sanitizeDbProductId(raw: string): string {
  const s = String(raw ?? "").trim();
  return /^\d+$/.test(s) ? s : "";
}

function designLayersToSubmissionMeta(
  layers: DesignLayerSummary[] | undefined,
  unit: string | null | undefined
): ArtworkLayerMeta[] | undefined {
  if (!layers?.length) return undefined;
  return layers.map((layer) => {
    const id = layer.libraryArtworkId?.trim();
    return {
      layerId: layer.id,
      kind: layer.kind,
      label: layer.label,
      unit: unit ?? undefined,
      left: layer.left,
      top: layer.top,
      width: layer.width,
      height: layer.height,
      centerX: layer.centerX,
      centerY: layer.centerY,
      rotation: layer.rotation,
      centerXMin: layer.centerXMin,
      centerXMax: layer.centerXMax,
      centerYMin: layer.centerYMin,
      centerYMax: layer.centerYMax,
      ...(id ? { libraryArtworkId: id, artworkId: id } : {}),
      ...(layer.previewUrl &&
      typeof layer.previewUrl === "string" &&
      !layer.previewUrl.startsWith("data:")
        ? { previewUrl: layer.previewUrl }
        : {}),
    };
  });
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
  /** Design layer geometry per normalized placement (same keys as print areas). */
  designLayersByPlacement?: Record<string, DesignLayerSummary[]>;
  printAreas: DtftaPrintArea[];
  printSizes: PlacementPrintSizeMap;
  regions: PlacementRegionMap;
  selectedColor: string;
  variants: DtftaVariant[];
  colorMockups?: DtftaColorMockups;
  variantPrices: VariantRetailPrice[];
};

export type SecondaryMockup = {
  placement: string;
  color: string;
  data_url: string;
};

type BuildCustomizeSubmissionResult =
  | {
      ok: true;
      formData: FormData;
      printableAreas: PrintableAreaPayload[];
      printPlan: string;
      artworkUrls: Record<string, ArtworkUrlPayload>;
      secondaryMockups?: SecondaryMockup[];
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
  designAssetOptions,
}: {
  selectedColor: string;
  printAreas: DtftaPrintArea[];
  printSizes: PlacementPrintSizeMap;
  regions: PlacementRegionMap;
  artworkUrls: Record<string, ArtworkUrlPayload>;
  canvasStateByPlacement: PlacementCanvasStateMap;
  designAssetOptions?: ProductDesignAssetOptions;
}): PrintableAreaPayload[] {
  return printAreas.map((area) => {
    const placement = normalizePlacementKey(area.title);
    const region = regions[placement] ?? getRegionFromPrintArea(area);
    const size = printSizes[placement] ?? getPhysicalPrintSize(area);

    const payloadKey = `${selectedColor}_${placement}`;

    return {
      id: area.id,
      title: area.title,
      placement,
      artwork: artworkUrls[payloadKey]?.artworkUrl ?? "",
      printSize: size,
      designableRegion: region,
      unit: area.unit ?? null,
      backgroundImage:
        getPrintAreaBackgroundImageUrl(area, selectedColor, designAssetOptions) ||
        null,
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
  designLayersByPlacement,
  printAreas,
  printSizes,
  regions,
  selectedColor,
  variants,
  colorMockups,
  variantPrices,
}: BuildCustomizeSubmissionArgs): Promise<BuildCustomizeSubmissionResult> {
  const designAssetOptions: ProductDesignAssetOptions = {
    colorMockups: colorMockups ?? null,
  };

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
  const secondaryMockups: SecondaryMockup[] = [];

  /**
   * Build per-placement print-only artwork + per-color mockups using the
   * shared `buildPlacementMockups` helper. This is the SAME function the
   * Preview modal calls, so the published mockups are byte-identical to the
   * ones the user just previewed (assuming the canvas hasn't changed).
   */
  for (const area of printAreas) {
    const placement = normalizePlacementKey(area.title);
    const region = regions[placement] ?? getRegionFromPrintArea(area);
    const printSize = printSizes[placement] ?? getPhysicalPrintSize(area);

    const colors: ColorMockupOption[] = allColorCodes.map((colorCode) => ({
      colorCode,
      colorName: colorCode,
      backgroundImageUrl: getPrintAreaBackgroundImageUrlForFabric(
        area,
        colorCode,
        designAssetOptions
      ),
    }));

    const result = await buildPlacementMockups({
      placement,
      placementTitle: area.title,
      region,
      perspectiveCorners: area.perspective_corners,
      liveCanvas: canvases[placement] ?? null,
      savedPrintOnlyUrl: artworkByPlacement[placement] ?? "",
      savedCanvasSize: canvasSizesByPlacement?.[placement] ?? null,
      colors,
    });

    if (!result) continue;

    const libraryArtworkId = artworkLibraryIds?.[placement]?.trim();
    const layersMeta = designLayersToSubmissionMeta(
      designLayersByPlacement?.[placement],
      area.unit
    );
    const printOnlyUrl = result.printOnlyUrl
      ? await compressImageDataUrl(result.printOnlyUrl, {
          maxEdge: 2000,
          type: "image/png",
        })
      : "";
    let attachedPrintFile = false;
    const normSelectedColor = selectedColor.trim().toLowerCase();

    for (const colorCode of allColorCodes) {
      const rawMockup = result.mockupsByColor[colorCode] ?? "";
      const mockupUrl = rawMockup
        ? await compressImageDataUrl(rawMockup, {
            maxEdge: 1400,
            type: "image/jpeg",
            quality: 0.82,
          })
        : "";
      const includePrintFile = !attachedPrintFile && Boolean(printOnlyUrl);
      if (includePrintFile) attachedPrintFile = true;

      const isPrimary =
        colorCode.trim().toLowerCase() === normSelectedColor ||
        (!allColorCodes.some((c) => c.trim().toLowerCase() === normSelectedColor) && colorCode === allColorCodes[0]);

      if (isPrimary) {
        artworkUrls[`${colorCode}_${placement}`] = {
          colorCode,
          placement,
          artworkUrl: mockupUrl,
          ...(includePrintFile ? { customArtworkUrl: printOnlyUrl } : {}),
          designableRegion: region,
          printSize,
          ...(libraryArtworkId ? { libraryArtworkId } : {}),
          ...(layersMeta?.length ? { layersMeta } : {}),
        };
      } else if (mockupUrl) {
        secondaryMockups.push({
          placement,
          color: colorCode,
          data_url: mockupUrl,
        });
      }
    }
  }

  const printableAreas = buildPrintableAreasForSelectedColor({
    selectedColor,
    printAreas,
    printSizes,
    regions,
    artworkUrls,
    canvasStateByPlacement,
    designAssetOptions,
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
  formData.set("variantPrices", JSON.stringify(variantPrices));
  formData.set("artworkUrls", JSON.stringify(artworkUrls));

  return {
    ok: true,
    formData,
    printableAreas,
    printPlan,
    artworkUrls,
    secondaryMockups,
  };
}
