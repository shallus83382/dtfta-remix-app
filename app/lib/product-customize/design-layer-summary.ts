import type { Canvas, FabricObject } from "fabric";

const CANVAS_BASE = 500;

export type DesignLayerSummary = {
  id: string;
  kind: "image" | "text" | "vector" | "other";
  label: string;
  previewUrl: string | null;
  /** Set when the layer image came from `/app/api/artworks` (Fabric `data.libraryArtworkId`) */
  libraryArtworkId?: string;
  /** Layer bounding box top-left within the printable area (same unit as product print area `unit`) */
  left: number;
  top: number;
  /** Bounding box width / height (same unit as product print area `unit`) */
  width: number;
  height: number;
  /** Object center within the printable area (matches Fabric center origin); same unit as print area */
  centerX: number;
  centerY: number;
  rotation: number;
  /** Allowed range for horizontal center while keeping the layer inside the print area */
  centerXMin: number;
  centerXMax: number;
  centerYMin: number;
  centerYMax: number;
  selected: boolean;
};

function newLayerId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `layer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function ensureDesignLayerId(obj: FabricObject): string {
  const typed = obj as FabricObject & {
    data?: { layerId?: string };
  };
  if (!typed.data || typeof typed.data !== "object") {
    const preserved =
      typed.data && typeof typed.data === "object"
        ? { ...(typed.data as Record<string, unknown>) }
        : {};
    (typed as FabricObject & { data: Record<string, unknown> }).data = {
      __internal: false,
      kind: "design",
      ...preserved,
      layerId: newLayerId(),
    };
    return (typed.data as { layerId: string }).layerId;
  }
  if (typeof typed.data.layerId === "string" && typed.data.layerId.trim()) {
    return typed.data.layerId;
  }
  typed.data.layerId = newLayerId();
  return typed.data.layerId;
}

function classifyKind(obj: FabricObject): DesignLayerSummary["kind"] {
  const t = (obj as FabricObject & { type?: string }).type;
  if (t === "image") return "image";
  if (t === "group") return "vector";
  if (t === "textbox" || t === "text" || t === "i-text") return "text";
  return "other";
}

function imagePreviewUrl(obj: FabricObject): string | null {
  const typed = obj as FabricObject & {
    type?: string;
    getSrc?: () => string;
    src?: string;
  };
  if (typed.type !== "image" && typed.type !== "group") return null;
  if (typeof typed.getSrc === "function") {
    const s = typed.getSrc();
    if (typeof s === "string" && s.trim()) return s;
  }
  if (typeof typed.src === "string" && typed.src.trim()) return typed.src;
  return null;
}

function layerLabel(obj: FabricObject): string {
  const kind = classifyKind(obj);
  const textLike = obj as FabricObject & { text?: string };
  if (kind === "text" && typeof textLike.text === "string") {
    const t = textLike.text.trim();
    return t.length > 48 ? `${t.slice(0, 48)}…` : t || "Text";
  }
  if (kind === "image") return "Image";
  if (kind === "vector") return "Vector artwork";
  return "Design layer";
}

function roundUnit(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function computeDesignLayerSummaries(
  canvas: Canvas | null,
  options: {
    designableRegion: { left: number; top: number; width: number; height: number };
    canvasPixelWidth: number;
    canvasPixelHeight: number;
    printWidth: number;
    printHeight: number;
  }
): DesignLayerSummary[] {
  if (!canvas) return [];

  const { designableRegion: region, canvasPixelWidth, canvasPixelHeight, printWidth, printHeight } =
    options;

  const scaleX = canvasPixelWidth / CANVAS_BASE;
  const scaleY = canvasPixelHeight / CANVAS_BASE;

  const rL = region.left * scaleX;
  const rT = region.top * scaleY;
  const rW = Math.max(1e-6, region.width * scaleX);
  const rH = Math.max(1e-6, region.height * scaleY);

  const activeTargets = new Set(canvas.getActiveObjects());

  const objects = canvas.getObjects().filter((obj) => {
    const data = (obj as FabricObject & { data?: { __internal?: boolean } }).data;
    return !data?.__internal;
  });

  const layers: DesignLayerSummary[] = [];

  for (const obj of objects) {
    obj.setCoords();

    const id = ensureDesignLayerId(obj);
    const kind = classifyKind(obj);
    const previewUrl = imagePreviewUrl(obj);

    const libData = (obj as FabricObject & {
      data?: { libraryArtworkId?: string; artworkId?: string };
    }).data;
    const fromData =
      typeof libData?.libraryArtworkId === "string" && libData.libraryArtworkId.trim()
        ? libData.libraryArtworkId.trim()
        : typeof libData?.artworkId === "string" && libData.artworkId.trim()
          ? libData.artworkId.trim()
          : undefined;
    const topLevel = obj as FabricObject & { libraryArtworkId?: string; artworkId?: string };
    const libraryArtworkId =
      fromData ??
      (typeof topLevel.libraryArtworkId === "string" && topLevel.libraryArtworkId.trim()
        ? topLevel.libraryArtworkId.trim()
        : typeof topLevel.artworkId === "string" && topLevel.artworkId.trim()
          ? topLevel.artworkId.trim()
          : undefined);

    const bounds = obj.getBoundingRect();

    const widthPrint = (bounds.width / rW) * printWidth;
    const heightPrint = (bounds.height / rH) * printHeight;

    const leftPrint = ((bounds.left - rL) / rW) * printWidth;
    const topPrint = ((bounds.top - rT) / rH) * printHeight;

    const cxCanvas = obj.left ?? rL + rW / 2;
    const cyCanvas = obj.top ?? rT + rH / 2;
    const centerX = ((cxCanvas - rL) / rW) * printWidth;
    const centerY = ((cyCanvas - rT) / rH) * printHeight;

    const scaledWidth =
      typeof (obj as FabricObject & { getScaledWidth?: () => number }).getScaledWidth === "function"
        ? (obj as FabricObject & { getScaledWidth: () => number }).getScaledWidth()
        : bounds.width;

    const scaledHeight =
      typeof (obj as FabricObject & { getScaledHeight?: () => number }).getScaledHeight === "function"
        ? (obj as FabricObject & { getScaledHeight: () => number }).getScaledHeight()
        : bounds.height;

    const halfW = scaledWidth / 2;
    const halfH = scaledHeight / 2;

    let centerXMin = 0;
    let centerXMax = printWidth;
    let centerYMin = 0;
    let centerYMax = printHeight;

    if (scaledWidth < rW) {
      centerXMin = roundUnit((halfW / rW) * printWidth);
      centerXMax = roundUnit(printWidth - (halfW / rW) * printWidth);
    } else {
      const mid = roundUnit(printWidth / 2);
      centerXMin = mid;
      centerXMax = mid;
    }

    if (scaledHeight < rH) {
      centerYMin = roundUnit((halfH / rH) * printHeight);
      centerYMax = roundUnit(printHeight - (halfH / rH) * printHeight);
    } else {
      const mid = roundUnit(printHeight / 2);
      centerYMin = mid;
      centerYMax = mid;
    }

    const rotation =
      typeof (obj as FabricObject & { angle?: number }).angle === "number"
        ? (obj as FabricObject & { angle: number }).angle
        : 0;

    const selected = activeTargets.has(obj);

    layers.push({
      id,
      kind,
      label: layerLabel(obj),
      previewUrl,
      ...(libraryArtworkId ? { libraryArtworkId } : {}),
      left: roundUnit(leftPrint),
      top: roundUnit(topPrint),
      width: roundUnit(widthPrint),
      height: roundUnit(heightPrint),
      centerX: roundUnit(centerX),
      centerY: roundUnit(centerY),
      rotation: roundUnit(rotation),
      centerXMin,
      centerXMax,
      centerYMin,
      centerYMax,
      selected: Boolean(selected),
    });
  }

  return layers;
}
