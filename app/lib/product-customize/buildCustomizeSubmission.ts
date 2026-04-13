import type { Canvas } from "fabric";
import { buildPrintPlan } from "../dtfta-design";
import { exportCanvasToDataUrl } from "../../components/DesignCanvas";
import type { DtftaPrintArea } from "../dtfta-products.server";
import type {
  PlacementCanvasStateMap,
  PlacementPrintSizeMap,
  PlacementRegionMap,
  PrintableAreaPayload,
} from "./types";
import { getRegionFromPrintArea, normalizePlacementKey } from "./helpers";
import {getProductDesignAssetUrl} from "../design-assets";

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
  selectedColorName?: string;
  selectedVariantId?: string;
  selectedVariantSku?: string;
};

type BuildCustomizeSubmissionResult =
  | {
      ok: true;
      formData: FormData;
      printableAreas: PrintableAreaPayload[];
      printPlan: string;
    }
  | {
      ok: false;
      error: string;
    };

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
    selectedColorName,
    selectedVariantId,
    selectedVariantSku,
  }: BuildCustomizeSubmissionArgs): BuildCustomizeSubmissionResult {
  const finalArtworkByPlacement: Record<string, string> = {
    ...artworkByPlacement,
  };

  for (const [placementKey, canvas] of Object.entries(canvases)) {
    if (!canvas) continue;

    const exportedArtwork = exportCanvasToDataUrl(canvas);
    if (exportedArtwork) {
      finalArtworkByPlacement[placementKey] = exportedArtwork;
    }
  }

  const printPlan = buildPrintPlan(printSizes);

  const printableAreas: PrintableAreaPayload[] = printAreas.map((area) => {
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
      backgroundImage: getProductDesignAssetUrl(area.image) ?? null,
      editorState: canvasStateByPlacement[key] ?? null,
    };
  });

  const hasArtwork = printableAreas.some((item) => Boolean(item.artwork));

  if (!printPlan && !hasArtwork) {
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
  formData.set("printableAreas", JSON.stringify(printableAreas));
  formData.set("selectedColor", selectedColor || "");
  formData.set("selectedColorName", selectedColorName || "");
  formData.set("selectedVariantId", selectedVariantId || "");
  formData.set("selectedVariantSku", selectedVariantSku || "");

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
  };
}