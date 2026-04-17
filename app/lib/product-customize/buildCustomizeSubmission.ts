import type { Canvas } from "fabric";
import { buildPrintPlan } from "../dtfta-design";
import { exportCanvasToDataUrl } from "../../components/DesignCanvas";
import type { DtftaPrintArea, DtftaVariant } from "../dtfta-products.server";
import type {
  PlacementCanvasStateMap,
  PlacementPrintSizeMap,
  PlacementRegionMap,
  PrintableAreaPayload,
  VariantArtworkPayload,
} from "./types";
import {
  getRegionFromPrintArea,
  normalizePlacementKey,
  buildColorPlacementKey,
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
      variantArtworkPayload: VariantArtworkPayload[];
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

  for (const [storageKey, canvas] of Object.entries(canvases)) {
    if (!canvas) continue;

    const exportedArtwork = exportCanvasToDataUrl(canvas);
    if (exportedArtwork) {
      finalArtworkByPlacement[storageKey] = exportedArtwork;
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

  const activeVariants = variants.filter(
    (variant) => variant.is_active && variant.id != null
  );

  const variantArtworkPayload: VariantArtworkPayload[] = activeVariants.map((variant) => {
    const variantPrintPlan = buildPrintPlanForColor({
      colorCode: variant.colorCode,
      printAreas,
      printSizes,
    });

    return {
      variantId: String(variant.id),
      variantSku: variant.sku ?? "",
      colorCode: variant.colorCode,
      colorName: variant.colorName,
      printPlan: variantPrintPlan,
    };
  });

  const hasArtwork = Object.values(finalArtworkByPlacement).some((artwork) => Boolean(artwork));

  const hasPrintPlan = Boolean(printPlan) || variantArtworkPayload.some((variant) => Boolean(variant.printPlan));

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
  formData.set("variantArtworkPayload", JSON.stringify(variantArtworkPayload));

  for (const [key, value] of Object.entries(finalArtworkByPlacement)) {
    if (value) {
      formData.set(`artwork_${key}`, value);
    }
  }

  return {
    ok: true,
    formData,
    printableAreas,
    printPlan,
    variantArtworkPayload,
  };
}
