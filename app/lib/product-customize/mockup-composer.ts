import type { Canvas } from "fabric";
import { exportCanvasToDataUrl } from "../../components/DesignCanvas";

export const MOCKUP_CANVAS_SIZE = 500;

export type MockupRegion = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type ColorMockupOption = {
  colorCode: string;
  colorName: string;
  /** Background image URL for this color. Empty string when no asset is configured. */
  backgroundImageUrl: string;
};

export type PlacementPreviewEntry = {
  placement: string;
  placementTitle: string;
  /** Transparent print-only artwork (cropped to design region). Reused across colors. */
  printOnlyUrl: string;
  /** colorCode -> mockup data URL (empty string when the mockup couldn't be composed). */
  mockupsByColor: Record<string, string>;
};

export type MultiPlacementPreview = {
  placements: PlacementPreviewEntry[];
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.crossOrigin = "anonymous";

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));

    image.src = src;
  });
}

function getScaledRegion({
  region,
  canvasWidth,
  canvasHeight,
}: {
  region: MockupRegion;
  canvasWidth: number;
  canvasHeight: number;
}) {
  const scaleX = canvasWidth / MOCKUP_CANVAS_SIZE;
  const scaleY = canvasHeight / MOCKUP_CANVAS_SIZE;

  return {
    left: region.left * scaleX,
    top: region.top * scaleY,
    width: region.width * scaleX,
    height: region.height * scaleY,
  };
}

/**
 * Builds a product-media mockup for one color/placement.
 *
 * This intentionally mirrors DesignCanvas preview behavior:
 * - background is contained inside the editor canvas and centered
 * - artwork crop is drawn into the selected print region
 *
 * This lets one shared print-only artwork be reused for every color background.
 */
export async function composeMockupImage({
  backgroundImageUrl,
  artworkDataUrl,
  region,
  canvasWidth,
  canvasHeight,
  multiplier = 3,
}: {
  backgroundImageUrl: string;
  artworkDataUrl: string;
  region: MockupRegion;
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

/**
 * Composes a mockup image for every provided color in parallel, given an
 * already-exported print-only artwork data URL.
 *
 * Used by the Preview modal so the user can switch between color/placement
 * combinations without re-exporting the print artwork each time.
 */
export async function composeMockupsForColors({
  printOnlyUrl,
  region,
  canvasWidth,
  canvasHeight,
  colors,
}: {
  printOnlyUrl: string;
  region: MockupRegion;
  canvasWidth: number;
  canvasHeight: number;
  colors: ColorMockupOption[];
}): Promise<Record<string, string>> {
  const entries = await Promise.all(
    colors.map(async (color) => {
      if (!color.backgroundImageUrl || !printOnlyUrl) {
        return [color.colorCode, ""] as const;
      }

      try {
        const mockupUrl = await composeMockupImage({
          backgroundImageUrl: color.backgroundImageUrl,
          artworkDataUrl: printOnlyUrl,
          region,
          canvasWidth,
          canvasHeight,
        });
        return [color.colorCode, mockupUrl] as const;
      } catch (error) {
        console.error(
          `Failed to compose preview mockup for color ${color.colorCode}`,
          error
        );
        return [color.colorCode, ""] as const;
      }
    })
  );

  const mockupsByColor: Record<string, string> = {};
  for (const [colorCode, url] of entries) {
    mockupsByColor[colorCode] = url;
  }

  return mockupsByColor;
}

export type PlacementMockupInput = {
  /** Normalized placement key (e.g. "front"). */
  placement: string;
  /** Display title (e.g. "Front"). */
  placementTitle: string;
  /** Designable region in MOCKUP_CANVAS_SIZE (500) coordinate space. */
  region: MockupRegion;
  /** Live Fabric canvas if this placement is currently active, else null. */
  liveCanvas: Canvas | null;
  /** Saved print-only artwork data URL from a previous snapshot, if any. */
  savedPrintOnlyUrl: string;
  /** Canvas dimensions captured when the saved artwork was exported. */
  savedCanvasSize: { width: number; height: number } | null;
  /** Colors to compose mockups for (each provides its own background image). */
  colors: ColorMockupOption[];
};

export type PlacementMockupResult = {
  placement: string;
  placementTitle: string;
  region: MockupRegion;
  /** Transparent print-only artwork (cropped to region). */
  printOnlyUrl: string;
  /** Canvas dimensions used to compose the mockups. */
  canvasWidth: number;
  canvasHeight: number;
  /** colorCode -> mockup image data URL. */
  mockupsByColor: Record<string, string>;
};

/**
 * SOURCE OF TRUTH for what we export per placement.
 *
 * Builds the print-only artwork plus per-color mockup images for one placement
 * using consistent rules:
 * - Live Fabric canvas (current placement) is preferred for freshness.
 * - Falls back to the saved snapshot for inactive placements.
 * - Mockup composition uses the same canvas dimensions that produced the
 *   artwork crop, preserving the design's aspect ratio.
 *
 * Both the Preview modal and the publish payload call this with identical
 * inputs, guaranteeing the previewed mockup is byte-identical to the one we
 * upload (assuming the canvas state hasn't changed in between).
 */
export async function buildPlacementMockups(
  input: PlacementMockupInput
): Promise<PlacementMockupResult | null> {
  let printOnlyUrl = "";
  let canvasWidth = input.savedCanvasSize?.width ?? MOCKUP_CANVAS_SIZE;
  let canvasHeight = input.savedCanvasSize?.height ?? MOCKUP_CANVAS_SIZE;

  if (input.liveCanvas) {
    const exported = exportCanvasToDataUrl(input.liveCanvas, {
      region: input.region,
      includeBackground: false,
    });
    if (exported) {
      printOnlyUrl = exported;
      const sized = input.liveCanvas as Canvas & {
        getWidth?: () => number;
        getHeight?: () => number;
      };
      canvasWidth = sized.getWidth?.() || canvasWidth;
      canvasHeight = sized.getHeight?.() || canvasHeight;
    }
  }

  if (!printOnlyUrl) {
    printOnlyUrl = input.savedPrintOnlyUrl;
  }

  if (!printOnlyUrl) return null;

  const mockupsByColor = await composeMockupsForColors({
    printOnlyUrl,
    region: input.region,
    canvasWidth,
    canvasHeight,
    colors: input.colors,
  });

  return {
    placement: input.placement,
    placementTitle: input.placementTitle,
    region: input.region,
    printOnlyUrl,
    canvasWidth,
    canvasHeight,
    mockupsByColor,
  };
}
