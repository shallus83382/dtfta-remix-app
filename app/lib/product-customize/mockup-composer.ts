import type { Canvas } from "fabric";
import { exportCanvasToDataUrl, FABRIC_EXPORT_MULTIPLIER } from "../../components/DesignCanvas";
import { designRegionToPixelRect, DESIGN_REGION_EDGE_BLEED_PX } from "./design-region-pixel-rect";

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

function getScaledRegionPixels({
  region,
  canvasWidth,
  canvasHeight,
}: {
  region: MockupRegion;
  canvasWidth: number;
  canvasHeight: number;
}) {
  return designRegionToPixelRect(
    region,
    canvasWidth,
    canvasHeight,
    MOCKUP_CANVAS_SIZE,
    DESIGN_REGION_EDGE_BLEED_PX
  );
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
  multiplier = FABRIC_EXPORT_MULTIPLIER,
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

  const m = Math.max(1, multiplier);
  const cw = Math.max(1, canvasWidth);
  const ch = Math.max(1, canvasHeight);

  /** Ceil so scaled artwork/background never lands past the bitmap edge (avoids corner clipping). */
  const output = document.createElement("canvas");
  output.width = Math.max(1, Math.ceil(cw * m - 1e-9));
  output.height = Math.max(1, Math.ceil(ch * m - 1e-9));
  const outW = output.width;
  const outH = output.height;

  const ctx = output.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create canvas context");
  }

  ctx.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in ctx) {
    (ctx as CanvasRenderingContext2D & { imageSmoothingQuality?: string }).imageSmoothingQuality =
      "high";
  }

  ctx.clearRect(0, 0, outW, outH);

  const bgWidth = backgroundImage.naturalWidth || backgroundImage.width || 1;
  const bgHeight = backgroundImage.naturalHeight || backgroundImage.height || 1;
  const bgScale = Math.min(cw / bgWidth, ch / bgHeight);
  const bgDrawWidth = bgWidth * bgScale;
  const bgDrawHeight = bgHeight * bgScale;
  const bgLeft = cw / 2 - bgDrawWidth / 2;
  const bgTop = ch / 2 - bgDrawHeight / 2;

  let bgDx = bgLeft * m;
  let bgDy = bgTop * m;
  let bgDw = bgDrawWidth * m;
  let bgDh = bgDrawHeight * m;
  bgDx = Math.max(0, Math.min(bgDx, outW - 1));
  bgDy = Math.max(0, Math.min(bgDy, outH - 1));
  bgDw = Math.max(1, Math.min(bgDw, outW - bgDx));
  bgDh = Math.max(1, Math.min(bgDh, outH - bgDy));

  ctx.drawImage(backgroundImage, 0, 0, bgWidth, bgHeight, bgDx, bgDy, bgDw, bgDh);

  const drawRegion = getScaledRegionPixels({ region, canvasWidth: cw, canvasHeight: ch });

  let dx = drawRegion.left * m;
  let dy = drawRegion.top * m;
  let dw = drawRegion.width * m;
  let dh = drawRegion.height * m;

  dx = Math.max(0, Math.min(dx, outW - 1));
  dy = Math.max(0, Math.min(dy, outH - 1));
  dw = Math.max(1, Math.min(dw, outW - dx));
  dh = Math.max(1, Math.min(dh, outH - dy));

  const iw = artworkImage.naturalWidth || artworkImage.width || 1;
  const ih = artworkImage.naturalHeight || artworkImage.height || 1;
  if (iw > 0 && ih > 0) {
    /**
     * Map the full exported print crop into the destination rect (same math as before,
     * but device-pixel explicit so rounding never paints past the canvas edge).
     */
    ctx.drawImage(artworkImage, 0, 0, iw, ih, dx, dy, dw, dh);
  }

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
          multiplier: FABRIC_EXPORT_MULTIPLIER,
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
      multiplier: FABRIC_EXPORT_MULTIPLIER,
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
