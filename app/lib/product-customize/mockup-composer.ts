import type { Canvas } from "fabric";
import type { PerspectiveCorners } from "../dtfta-products.server";
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

function solveLinearSystem(matrix: number[][], values: number[]): number[] | null {
  const size = values.length;
  const rows = matrix.map((row, index) => [...row, values[index]]);

  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) {
        pivot = row;
      }
    }

    if (Math.abs(rows[pivot][column]) < 1e-10) return null;
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];

    const divisor = rows[column][column];
    for (let entry = column; entry <= size; entry += 1) {
      rows[column][entry] /= divisor;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = rows[row][column];
      for (let entry = column; entry <= size; entry += 1) {
        rows[row][entry] -= factor * rows[column][entry];
      }
    }
  }

  return rows.map((row) => row[size]);
}

function getPerspectiveTransform(
  corners: PerspectiveCorners,
  canvasWidth: number,
  canvasHeight: number,
  multiplier: number
): number[] | null {
  const points = corners.map((corner) => ({
    x: (corner.x / MOCKUP_CANVAS_SIZE) * canvasWidth * multiplier,
    y: (corner.y / MOCKUP_CANVAS_SIZE) * canvasHeight * multiplier,
  }));
  const source = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  const matrix: number[][] = [];
  const values: number[] = [];

  source.forEach(({ x, y }, index) => {
    const { x: targetX, y: targetY } = points[index];
    matrix.push([x, y, 1, 0, 0, 0, -targetX * x, -targetX * y]);
    values.push(targetX);
    matrix.push([0, 0, 0, x, y, 1, -targetY * x, -targetY * y]);
    values.push(targetY);
  });

  return solveLinearSystem(matrix, values);
}

function drawPerspectiveArtwork({
  context,
  image,
  corners,
  canvasWidth,
  canvasHeight,
  multiplier,
}: {
  context: CanvasRenderingContext2D;
  image: HTMLImageElement;
  corners: PerspectiveCorners;
  canvasWidth: number;
  canvasHeight: number;
  multiplier: number;
}) {
  const transform = getPerspectiveTransform(
    corners,
    canvasWidth,
    canvasHeight,
    multiplier
  );
  if (!transform) {
    throw new Error("Unable to map artwork onto perspective print area");
  }

  const imageWidth = image.naturalWidth || image.width || 1;
  const imageHeight = image.naturalHeight || image.height || 1;
  const mapPoint = (u: number, v: number) => {
    const denominator = transform[6] * u + transform[7] * v + 1;
    return {
      x: (transform[0] * u + transform[1] * v + transform[2]) / denominator,
      y: (transform[3] * u + transform[4] * v + transform[5]) / denominator,
    };
  };
  const drawTriangle = (
    source: Array<{ x: number; y: number }>,
    destination: Array<{ x: number; y: number }>
  ) => {
    const [source0, source1, source2] = source;
    const [destination0, destination1, destination2] = destination;
    const sourceX1 = source1.x - source0.x;
    const sourceY1 = source1.y - source0.y;
    const sourceX2 = source2.x - source0.x;
    const sourceY2 = source2.y - source0.y;
    const determinant = sourceX1 * sourceY2 - sourceX2 * sourceY1;
    if (Math.abs(determinant) < 1e-10) return;

    const destinationX1 = destination1.x - destination0.x;
    const destinationY1 = destination1.y - destination0.y;
    const destinationX2 = destination2.x - destination0.x;
    const destinationY2 = destination2.y - destination0.y;
    const a = (destinationX1 * sourceY2 - destinationX2 * sourceY1) / determinant;
    const c = (destinationX2 * sourceX1 - destinationX1 * sourceX2) / determinant;
    const b = (destinationY1 * sourceY2 - destinationY2 * sourceY1) / determinant;
    const d = (destinationY2 * sourceX1 - destinationY1 * sourceX2) / determinant;
    const e = destination0.x - a * source0.x - c * source0.y;
    const f = destination0.y - b * source0.x - d * source0.y;

    context.save();
    context.beginPath();
    context.moveTo(destination0.x, destination0.y);
    context.lineTo(destination1.x, destination1.y);
    context.lineTo(destination2.x, destination2.y);
    context.closePath();
    context.clip();
    context.transform(a, b, c, d, e, f);
    context.drawImage(image, 0, 0, imageWidth, imageHeight);
    context.restore();
  };

  const divisions = 16;
  const sourcePoint = (u: number, v: number) => ({
    x: u * imageWidth,
    y: v * imageHeight,
  });

  for (let row = 0; row < divisions; row += 1) {
    for (let column = 0; column < divisions; column += 1) {
      const u0 = column / divisions;
      const u1 = (column + 1) / divisions;
      const v0 = row / divisions;
      const v1 = (row + 1) / divisions;
      const source00 = sourcePoint(u0, v0);
      const source10 = sourcePoint(u1, v0);
      const source11 = sourcePoint(u1, v1);
      const source01 = sourcePoint(u0, v1);
      const destination00 = mapPoint(u0, v0);
      const destination10 = mapPoint(u1, v0);
      const destination11 = mapPoint(u1, v1);
      const destination01 = mapPoint(u0, v1);

      drawTriangle(
        [source00, source10, source11],
        [destination00, destination10, destination11]
      );
      drawTriangle(
        [source00, source11, source01],
        [destination00, destination11, destination01]
      );
    }
  }
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
  perspectiveCorners,
  canvasWidth,
  canvasHeight,
  multiplier = FABRIC_EXPORT_MULTIPLIER,
}: {
  backgroundImageUrl: string;
  artworkDataUrl: string;
  region: MockupRegion;
  perspectiveCorners?: PerspectiveCorners;
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

  if (perspectiveCorners) {
    drawPerspectiveArtwork({
      context: ctx,
      image: artworkImage,
      corners: perspectiveCorners,
      canvasWidth: cw,
      canvasHeight: ch,
      multiplier: m,
    });
  } else {
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
      ctx.drawImage(artworkImage, 0, 0, iw, ih, dx, dy, dw, dh);
    }
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
  perspectiveCorners,
  canvasWidth,
  canvasHeight,
  colors,
}: {
  printOnlyUrl: string;
  region: MockupRegion;
  perspectiveCorners?: PerspectiveCorners;
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
          perspectiveCorners,
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
  /** Perspective surface corners in 0–500 design coordinates, ordered clockwise from top-left. */
  perspectiveCorners?: PerspectiveCorners;
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

  const liveCanvasHasArtwork = (() => {
    if (!input.liveCanvas) return false;
    try {
      return input.liveCanvas.getObjects().some((obj) => {
        const data = (obj as { data?: { __internal?: boolean } }).data;
        return !data?.__internal;
      });
    } catch {
      return false;
    }
  })();

  if (liveCanvasHasArtwork && input.liveCanvas) {
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
    perspectiveCorners: input.perspectiveCorners,
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
