import { useRef, useEffect, useCallback, useState } from "react";
import { Select, InlineStack, useMediaQuery } from "@shopify/polaris";
import { brandColors } from "../lib/brand-theme";
import type { Canvas, FabricObject, Rect } from "fabric";
import {
  computeDesignLayerSummaries,
  ensureDesignLayerId,
  type DesignLayerSummary,
} from "../lib/product-customize/design-layer-summary";
import { designRegionToPixelRect, DESIGN_REGION_EDGE_BLEED_PX } from "../lib/product-customize/design-region-pixel-rect";

export type { DesignLayerSummary };

/** Print-only `toDataURL` multiplier; mockups use the same value when compositing. */
export const FABRIC_EXPORT_MULTIPLIER = 3;

const CANVAS_SIZE = 500;
const MIN_CANVAS_SIZE = 280;
const MIN_CANVAS_HEIGHT = 280;
const CANVAS_ASPECT_RATIO = 0.72;
const MAX_CANVAS_WIDTH = 860;
const MAX_CANVAS_HEIGHT = 520;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.15;

/** @see DESIGN_REGION_EDGE_BLEED_PX in design-region-pixel-rect (export + mockup use the same value). */
const REGION_CLIP_OUTSET_PX = DESIGN_REGION_EDGE_BLEED_PX;

function createPaddedAbsoluteClipRect(
  fabric: typeof import("fabric"),
  regionRect: { left?: number; top?: number; width?: number; height?: number },
  canvasW: number,
  canvasH: number
) {
  const pad = REGION_CLIP_OUTSET_PX;
  const rl = regionRect.left ?? 0;
  const rt = regionRect.top ?? 0;
  const rw = regionRect.width ?? 0;
  const rh = regionRect.height ?? 0;
  const cw = Math.max(1, canvasW);
  const ch = Math.max(1, canvasH);
  const left = Math.max(0, rl - pad);
  const top = Math.max(0, rt - pad);
  const width = Math.max(1, Math.min(cw - left, rw + 2 * pad));
  const height = Math.max(1, Math.min(ch - top, rh + 2 * pad));
  return new fabric.Rect({
    left,
    top,
    width,
    height,
    originX: "left",
    originY: "top",
    absolutePositioned: true,
  });
}

const DEFAULT_TEXT_COLOR = "#111111";
const DEFAULT_FONT_FAMILY = "Arial";

const TEXT_COLOR_OPTIONS = [
  { label: "Black", value: "#111111" },
  { label: "White", value: "#ffffff" },
  { label: "Red", value: "#ef4444" },
  { label: "Green", value: "#22c55e" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Yellow", value: "#eab308" },
  { label: "Purple", value: "#a855f7" },
];

const FONT_FAMILY_OPTIONS = [
  { label: "Arial", value: "Arial" },
  { label: "Helvetica", value: "Helvetica" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Georgia", value: "Georgia" },
  { label: "Verdana", value: "Verdana" },
  { label: "Courier New", value: "Courier New" },
  { label: "Trebuchet MS", value: "Trebuchet MS" },
  { label: "Impact", value: "Impact" },
];

export interface DesignableRegion {
  left: number;
  top: number;
  width: number;
  height: number;
}

const DEFAULT_REGION: DesignableRegion = {
  left: 125,
  top: 125,
  width: 250,
  height: 250,
};

interface DesignCanvasProps {
  label: string;
  fillWidth?: boolean;
  onCanvasReady?: (canvas: Canvas) => void;
  printWidth: number;
  printHeight: number;
  onPrintDimensionsChange?: (width: number, height: number) => void;
  backgroundImageUrl?: string;
  designableRegion: DesignableRegion;
  onDesignableRegionChange?: (region: DesignableRegion) => void;
  initialCanvasState?: unknown;
  showInlineActions?: boolean;
  onRegisterActions?: (actions: {
    addText: () => void;
    addImage: (file: File) => Promise<void>;
    addImageFromUrl: (
      url: string,
      options?: { libraryArtworkId?: string }
    ) => Promise<void>;
    deleteSelected: () => void;
    clear: () => void;
  } | null) => void;
  /** Fired when design layers change (add/move/scale/rotate/select). Values use the same unit as product print area `unit`. */
  onDesignLayersChange?: (layers: DesignLayerSummary[]) => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file as data URL"));
      }
    };

    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

function loadImageDataUrlFromSource(input: File | string): Promise<string> {
  if (typeof input === "string") {
    return Promise.resolve(input);
  }
  return readFileAsDataUrl(input);
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file as text"));
      }
    };

    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsText(file);
  });
}

function isSvgFile(file: File): boolean {
  if (file.type === "image/svg+xml") return true;
  return file.name.toLowerCase().endsWith(".svg");
}

function isSvgUrl(url: string): boolean {
  const cleanUrl = url.split("?")[0]?.split("#")[0] ?? "";
  return cleanUrl.toLowerCase().endsWith(".svg");
}

function isFabricCanvasObject(value: unknown): value is FabricObject {
  return !!value && typeof value === "object" && "setCoords" in value && "set" in value;
}

export default function DesignCanvas({
  label,
  fillWidth = false,
  onCanvasReady,
  printWidth,
  printHeight,
  onPrintDimensionsChange,
  backgroundImageUrl,
  designableRegion,
  onDesignableRegionChange,
  initialCanvasState,
  showInlineActions = true,
  onRegisterActions,
  onDesignLayersChange,
}: DesignCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomContainerRef = useRef<HTMLDivElement>(null);

  const canvasRef = useRef<Canvas | null>(null);
  const regionRectRef = useRef<Rect | null>(null);
  const backgroundImageRef = useRef<FabricObject | null>(null);

  const onCanvasReadyRef = useRef(onCanvasReady);
  const onPrintDimensionsChangeRef = useRef(onPrintDimensionsChange);
  const onDesignableRegionChangeRef = useRef(onDesignableRegionChange);
  const onRegisterActionsRef = useRef(onRegisterActions);
  const onDesignLayersChangeRef = useRef(onDesignLayersChange);
  const designLayersRafRef = useRef<number | null>(null);

  useEffect(() => {
    onCanvasReadyRef.current = onCanvasReady;
  }, [onCanvasReady]);

  useEffect(() => {
    onPrintDimensionsChangeRef.current = onPrintDimensionsChange;
  }, [onPrintDimensionsChange]);

  useEffect(() => {
    onDesignableRegionChangeRef.current = onDesignableRegionChange;
  }, [onDesignableRegionChange]);

  const [canvasDimensions, setCanvasDimensions] = useState<{ w: number; h: number } | number>(
    fillWidth ? 0 : CANVAS_SIZE
  );
  const [zoom, setZoom] = useState(1);
  const [canvasReadyTick, setCanvasReadyTick] = useState(0);
  const [textColor, setTextColor] = useState(DEFAULT_TEXT_COLOR);
  const [fontFamily, setFontFamily] = useState(DEFAULT_FONT_FAMILY);

  const region = designableRegion ?? DEFAULT_REGION;
  const isNarrowToolbar = useMediaQuery("(max-width: 560px)");

  const hasDimensions = fillWidth
    ? typeof canvasDimensions === "object" && canvasDimensions.w > 0 && canvasDimensions.h > 0
    : true;

  const width =
    fillWidth && typeof canvasDimensions === "object" ? canvasDimensions.w : CANVAS_SIZE;

  const height =
    fillWidth && typeof canvasDimensions === "object" ? canvasDimensions.h : CANVAS_SIZE;

  const scaleX = width / CANVAS_SIZE;
  const scaleY = height / CANVAS_SIZE;

  useEffect(() => {
    onDesignLayersChangeRef.current = onDesignLayersChange;
  }, [onDesignLayersChange]);

  const scheduleDesignLayersEmit = useCallback(() => {
    if (designLayersRafRef.current != null) {
      cancelAnimationFrame(designLayersRafRef.current);
    }
    designLayersRafRef.current = requestAnimationFrame(() => {
      designLayersRafRef.current = null;
      const canvas = canvasRef.current;
      const list = computeDesignLayerSummaries(canvas, {
        designableRegion: region,
        canvasPixelWidth: width,
        canvasPixelHeight: height,
        printWidth,
        printHeight,
      });
      onDesignLayersChangeRef.current?.(list);
    });
  }, [
    region.left,
    region.top,
    region.width,
    region.height,
    width,
    height,
    printWidth,
    printHeight,
  ]);

  const scheduleDesignLayersEmitRef = useRef(scheduleDesignLayersEmit);
  scheduleDesignLayersEmitRef.current = scheduleDesignLayersEmit;

  useEffect(() => {
    scheduleDesignLayersEmit();
  }, [scheduleDesignLayersEmit, canvasReadyTick]);

  useEffect(() => {
    if (!fillWidth || !wrapperRef.current) return;

    const el = wrapperRef.current;

    const updateSize = () => {
      const w = el.clientWidth;
      if (w <= 0) return;

      const cw = Math.min(MAX_CANVAS_WIDTH, Math.max(MIN_CANVAS_SIZE, w));
      const ch = Math.max(
        MIN_CANVAS_HEIGHT,
        Math.min(
          MAX_CANVAS_HEIGHT,
          Math.min(Math.round(cw * CANVAS_ASPECT_RATIO), Math.round(cw * 0.9))
        )
      );

      setCanvasDimensions({ w: cw, h: ch });
    };

    updateSize();

    const ro = new ResizeObserver(updateSize);
    ro.observe(el);

    return () => ro.disconnect();
  }, [fillWidth]);

  const positionRegionRect = useCallback(() => {
    const canvas = canvasRef.current;
    const rect = regionRectRef.current;
    if (!canvas || !rect) return;

    rect.set({
      originX: "left",
      originY: "top",
      left: region.left * scaleX,
      top: region.top * scaleY,
      width: region.width * scaleX,
      height: region.height * scaleY,
    });

    rect.setCoords();
    canvas.requestRenderAll();
  }, [region.left, region.top, region.width, region.height, scaleX, scaleY]);

  const buildRegionClipPath = useCallback(async () => {
    const rect = regionRectRef.current;
    const canvas = canvasRef.current;
    if (!rect || !canvas) return null;

    const fabric = await import("fabric");
    const cw = canvas.getWidth?.() ?? CANVAS_SIZE;
    const ch = canvas.getHeight?.() ?? CANVAS_SIZE;
    return createPaddedAbsoluteClipRect(fabric, rect, cw, ch);
  }, []);

  const clampObjectToRegion = useCallback((obj: FabricObject) => {
    const canvas = canvasRef.current;
    const regionRect = regionRectRef.current;

    if (!canvas || !regionRect) return;
    if (obj === backgroundImageRef.current || obj === regionRect) return;

    obj.setCoords();
    regionRect.setCoords();

    const regionLeft = regionRect.left ?? 0;
    const regionTop = regionRect.top ?? 0;
    const regionWidth = regionRect.width ?? 0;
    const regionHeight = regionRect.height ?? 0;

    const scaledWidth =
      typeof (obj as FabricObject & { getScaledWidth?: () => number }).getScaledWidth === "function"
        ? (obj as FabricObject & { getScaledWidth: () => number }).getScaledWidth()
        : obj.getBoundingRect().width;

    const scaledHeight =
      typeof (obj as FabricObject & { getScaledHeight?: () => number }).getScaledHeight ===
      "function"
        ? (obj as FabricObject & { getScaledHeight: () => number }).getScaledHeight()
        : obj.getBoundingRect().height;

    const halfW = scaledWidth / 2;
    const halfH = scaledHeight / 2;

    let nextLeft = obj.left ?? 0;
    let nextTop = obj.top ?? 0;

    const minLeft = regionLeft + halfW;
    const maxLeft = regionLeft + regionWidth - halfW;
    const minTop = regionTop + halfH;
    const maxTop = regionTop + regionHeight - halfH;

    if (scaledWidth >= regionWidth) {
      nextLeft = regionLeft + regionWidth / 2;
    } else {
      nextLeft = Math.max(minLeft, Math.min(nextLeft, maxLeft));
    }

    if (scaledHeight >= regionHeight) {
      nextTop = regionTop + regionHeight / 2;
    } else {
      nextTop = Math.max(minTop, Math.min(nextTop, maxTop));
    }

    obj.set({
      left: nextLeft,
      top: nextTop,
      originX: "center",
      originY: "center",
    });

    obj.setCoords();
    canvas.requestRenderAll();
  }, []);

  const constrainScaleToRegion = useCallback(
    (obj: FabricObject) => {
      const canvas = canvasRef.current;
      const regionRect = regionRectRef.current;

      if (!canvas || !regionRect) return;
      if (obj === backgroundImageRef.current || obj === regionRect) return;

      obj.setCoords();
      regionRect.setCoords();

      const regionWidth = regionRect.width ?? 0;
      const regionHeight = regionRect.height ?? 0;
      const bounds = obj.getBoundingRect();

      if (bounds.width <= regionWidth && bounds.height <= regionHeight) {
        clampObjectToRegion(obj);
        return;
      }

      const currentScaleX = obj.scaleX ?? 1;
      const currentScaleY = obj.scaleY ?? 1;
      const widthRatio = regionWidth / bounds.width;
      const heightRatio = regionHeight / bounds.height;
      const ratio = Math.min(widthRatio, heightRatio);

      obj.set({
        scaleX: currentScaleX * ratio,
        scaleY: currentScaleY * ratio,
      });

      obj.setCoords();
      clampObjectToRegion(obj);
      canvas.requestRenderAll();
    },
    [clampObjectToRegion]
  );

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    if (fillWidth && !hasDimensions) return;
    if (canvasRef.current) return;

    let mounted = true;
    let cleanupListeners: (() => void) | null = null;

    import("fabric").then((fabric) => {
      if (!mounted || !containerRef.current || canvasRef.current) return;

      const canvasEl = document.createElement("canvas");
      canvasEl.width = width;
      canvasEl.height = height;

      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(canvasEl);

      const fabricCanvas = new fabric.Canvas(canvasEl, {
        width,
        height,
      });

      canvasRef.current = fabricCanvas;
      setCanvasReadyTick((v) => v + 1);

      const rect = new fabric.Rect({
        left: region.left * scaleX,
        top: region.top * scaleY,
        width: region.width * scaleX,
        height: region.height * scaleY,
        originX: "left",
        originY: "top",
        fill: "transparent",
        stroke: "#374151",
        strokeWidth: 2,
        strokeDashArray: [8, 8],
        selectable: false,
        evented: false,
        data: { __internal: true, kind: "region" },
      });

      fabricCanvas.add(rect);
      regionRectRef.current = rect;

      const onMoving = (e: { target?: FabricObject }) => {
        if (e.target) clampObjectToRegion(e.target);
      };

      const onScaling = (e: { target?: FabricObject }) => {
        if (e.target) constrainScaleToRegion(e.target);
      };

      const onModified = (e: { target?: FabricObject }) => {
        if (e.target) {
          constrainScaleToRegion(e.target);
          clampObjectToRegion(e.target);
        }
        scheduleDesignLayersEmitRef.current();
      };

      const bumpDesignLayers = () => scheduleDesignLayersEmitRef.current();

      const onMovingWithLayers = (e: { target?: FabricObject }) => {
        onMoving(e);
        bumpDesignLayers();
      };

      const onScalingWithLayers = (e: { target?: FabricObject }) => {
        onScaling(e);
        bumpDesignLayers();
      };

      fabricCanvas.on("object:moving", onMovingWithLayers);
      fabricCanvas.on("object:scaling", onScalingWithLayers);
      fabricCanvas.on("object:modified", onModified);

      fabricCanvas.on("object:added", bumpDesignLayers);
      fabricCanvas.on("object:removed", bumpDesignLayers);
      fabricCanvas.on("selection:created", bumpDesignLayers);
      fabricCanvas.on("selection:updated", bumpDesignLayers);
      fabricCanvas.on("selection:cleared", bumpDesignLayers);

      cleanupListeners = () => {
        fabricCanvas.off("object:moving", onMovingWithLayers);
        fabricCanvas.off("object:scaling", onScalingWithLayers);
        fabricCanvas.off("object:modified", onModified);

        fabricCanvas.off("object:added", bumpDesignLayers);
        fabricCanvas.off("object:removed", bumpDesignLayers);
        fabricCanvas.off("selection:created", bumpDesignLayers);
        fabricCanvas.off("selection:updated", bumpDesignLayers);
        fabricCanvas.off("selection:cleared", bumpDesignLayers);
      };

      fabricCanvas.requestRenderAll();
      bumpDesignLayers();
      onCanvasReadyRef.current?.(fabricCanvas);
    });

    return () => {
      mounted = false;
      cleanupListeners?.();
      regionRectRef.current = null;
      backgroundImageRef.current = null;

      if (canvasRef.current) {
        canvasRef.current.dispose();
        canvasRef.current = null;
      }

      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [
    fillWidth,
    hasDimensions,
    width,
    height,
    region.left,
    region.top,
    region.width,
    region.height,
    scaleX,
    scaleY,
    clampObjectToRegion,
    constrainScaleToRegion,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const anyCanvas = canvas as Canvas & {
      setWidth?: (value: number) => void;
      setHeight?: (value: number) => void;
      lowerCanvasEl?: HTMLCanvasElement;
    };

    anyCanvas.setWidth?.(width);
    anyCanvas.setHeight?.(height);

    if (anyCanvas.lowerCanvasEl) {
      anyCanvas.lowerCanvasEl.width = width;
      anyCanvas.lowerCanvasEl.height = height;
    }

    positionRegionRect();
    canvas.requestRenderAll();
  }, [width, height, positionRegionRect]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    import("fabric").then(async (fabric) => {
      const currentCanvas = canvasRef.current;
      if (cancelled || !currentCanvas) return;

      if (backgroundImageRef.current) {
        currentCanvas.remove(backgroundImageRef.current);
        backgroundImageRef.current = null;
      }

      if (!backgroundImageUrl) {
        if (regionRectRef.current) {
          currentCanvas.bringObjectToFront(regionRectRef.current);
        }
        currentCanvas.requestRenderAll();
        return;
      }

      try {
        const img = await fabric.FabricImage.fromURL(backgroundImageUrl, {
          crossOrigin: "anonymous",
        });

        if (cancelled || !canvasRef.current) return;

        const imgW = img.width ?? 1;
        const imgH = img.height ?? 1;
        const scaleBg = Math.min(width / imgW, height / imgH);

        img.set({
          scaleX: scaleBg,
          scaleY: scaleBg,
          originX: "center",
          originY: "center",
          left: width / 2,
          top: height / 2,
          selectable: false,
          evented: false,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true,
          hasControls: false,
          hasBorders: false,
          data: { __internal: true, kind: "background" },
        });

        const liveCanvas = canvasRef.current;
        if (!liveCanvas) return;

        liveCanvas.add(img);
        liveCanvas.sendObjectToBack(img);
        backgroundImageRef.current = img;

        if (regionRectRef.current) {
          liveCanvas.bringObjectToFront(regionRectRef.current);
        }

        liveCanvas.requestRenderAll();
      } catch (error) {
        console.error("Failed to load background image", error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [backgroundImageUrl, width, height, canvasReadyTick]);

  useEffect(() => {
    positionRegionRect();
  }, [positionRegionRect]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const rect = regionRectRef.current;
    if (!canvas || !rect) return;

    let cancelled = false;

    import("fabric").then((fabric) => {
      if (cancelled || !regionRectRef.current || !canvasRef.current) return;

      const currentRect = regionRectRef.current;

      const cw = canvas.getWidth?.() ?? CANVAS_SIZE;
      const ch = canvas.getHeight?.() ?? CANVAS_SIZE;

      canvas.getObjects().forEach((obj) => {
        if (obj === backgroundImageRef.current || obj === currentRect) return;

        const clip = createPaddedAbsoluteClipRect(fabric, currentRect, cw, ch);

        obj.set({ clipPath: clip });
        obj.setCoords();
      });

      canvas.requestRenderAll();
    });

    return () => {
      cancelled = true;
    };
  }, [
    positionRegionRect,
    region.left,
    region.top,
    region.width,
    region.height,
    scaleX,
    scaleY,
    width,
    height,
    backgroundImageUrl,
  ]);

  useEffect(() => {
    if (!canvasReadyTick) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    import("fabric").then(async (fabric) => {
      const currentCanvas = canvasRef.current;
      if (cancelled || !currentCanvas || !regionRectRef.current) return;

      const regionRect = regionRectRef.current;
      const bg = backgroundImageRef.current;

      currentCanvas.discardActiveObject();

      currentCanvas.getObjects().forEach((obj) => {
        if (obj !== regionRect && obj !== bg) {
          currentCanvas.remove(obj);
        }
      });

      const savedObjects =
        initialCanvasState &&
        typeof initialCanvasState === "object" &&
        Array.isArray((initialCanvasState as { objects?: unknown[] }).objects)
          ? (initialCanvasState as { objects: unknown[] }).objects
          : [];

      if (savedObjects.length > 0) {
        const enlivened = await fabric.util.enlivenObjects(savedObjects);

        if (cancelled || !canvasRef.current || !regionRectRef.current) return;

        const fabricObjects = enlivened.filter(isFabricCanvasObject);

        fabricObjects.forEach((obj) => {
          currentCanvas.add(obj);
          ensureDesignLayerId(obj);

          const cw = currentCanvas.getWidth?.() ?? CANVAS_SIZE;
          const ch = currentCanvas.getHeight?.() ?? CANVAS_SIZE;
          const clip = createPaddedAbsoluteClipRect(fabric, regionRectRef.current!, cw, ch);

          obj.set({
            clipPath: clip,
            selectable: true,
            evented: true,
          });

          obj.setCoords();
          constrainScaleToRegion(obj);
          clampObjectToRegion(obj);
        });
      }

      if (backgroundImageRef.current) {
        currentCanvas.sendObjectToBack(backgroundImageRef.current);
      }
      if (regionRectRef.current) {
        currentCanvas.bringObjectToFront(regionRectRef.current);
      }

      currentCanvas.requestRenderAll();
      scheduleDesignLayersEmitRef.current();
    });

    return () => {
      cancelled = true;
    };
  }, [
    initialCanvasState,
    canvasReadyTick,
    constrainScaleToRegion,
    clampObjectToRegion,
  ]);

  const getActiveTextObject = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return null;

    const maybeText = activeObject as FabricObject & {
      type?: string;
      fill?: string;
      fontFamily?: string;
      set?: (props: Record<string, unknown>) => void;
      setCoords?: () => void;
    };

    const isTextLike =
      maybeText.type === "textbox" ||
      maybeText.type === "text" ||
      maybeText.type === "i-text";

    return isTextLike ? maybeText : null;
  }, []);

  const applyTextColorToSelection = useCallback(
    (color: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const activeText = getActiveTextObject();
      if (!activeText || typeof activeText.set !== "function") return;

      activeText.set({ fill: color });
      activeText.setCoords?.();
      canvas.requestRenderAll();
    },
    [getActiveTextObject]
  );

  const applyFontFamilyToSelection = useCallback(
    (nextFontFamily: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const activeText = getActiveTextObject();
      if (!activeText || typeof activeText.set !== "function") return;

      activeText.set({ fontFamily: nextFontFamily });
      activeText.setCoords?.();
      canvas.requestRenderAll();
    },
    [getActiveTextObject]
  );

  const handleTextColorChange = useCallback(
    (color: string) => {
      setTextColor(color);
      applyTextColorToSelection(color);
    },
    [applyTextColorToSelection]
  );

  const handleFontFamilyChange = useCallback(
    (nextFontFamily: string) => {
      setFontFamily(nextFontFamily);
      applyFontFamilyToSelection(nextFontFamily);
    },
    [applyFontFamilyToSelection]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const syncSelectedTextStyle = () => {
      const activeText = getActiveTextObject();

      const fill =
        activeText && typeof activeText.fill === "string"
          ? activeText.fill
          : DEFAULT_TEXT_COLOR;

      const nextFontFamily =
        activeText && typeof activeText.fontFamily === "string"
          ? activeText.fontFamily
          : DEFAULT_FONT_FAMILY;

      setTextColor(fill);
      setFontFamily(nextFontFamily);
    };

    canvas.on("selection:created", syncSelectedTextStyle);
    canvas.on("selection:updated", syncSelectedTextStyle);
    canvas.on("selection:cleared", syncSelectedTextStyle);

    return () => {
      canvas.off("selection:created", syncSelectedTextStyle);
      canvas.off("selection:updated", syncSelectedTextStyle);
      canvas.off("selection:cleared", syncSelectedTextStyle);
    };
  }, [canvasReadyTick, getActiveTextObject]);

  const setZoomAtPoint = useCallback(
    (canvas: Canvas, point: { x: number; y: number }, z: number) => {
      const e = point.x * (1 - z);
      const f = point.y * (1 - z);

      (canvas as unknown as { setViewportTransform?: (t: number[]) => void }).setViewportTransform?.([
        z,
        0,
        0,
        z,
        e,
        f,
      ]);
    },
    []
  );

  const applyZoom = useCallback(
    (newZoom: number, point?: { x: number; y: number }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
      const pt = point ?? { x: width / 2, y: height / 2 };

      // Always re-center zoom around the intended point to prevent drift.
      setZoomAtPoint(canvas, pt, z);
      canvas.requestRenderAll();
      setZoom(z);
    },
    [width, height, setZoomAtPoint]
  );

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const z = zoomRef.current;
    const pt = { x: width / 2, y: height / 2 };
    setZoomAtPoint(canvas, pt, z);

    canvas.requestRenderAll();
  }, [zoom, width, height, setZoomAtPoint]);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const delta = -Math.sign(e.deltaY) * 0.1;

      const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomRef.current * (1 + delta)));
      applyZoom(newZoom);

      e.preventDefault();
    },
    [applyZoom]
  );

  useEffect(() => {
    const el = zoomContainerRef.current;
    if (!el) return;

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handleZoomIn = useCallback(() => {
    applyZoom(zoom + ZOOM_STEP);
  }, [zoom, applyZoom]);

  const handleZoomOut = useCallback(() => {
    applyZoom(zoom - ZOOM_STEP);
  }, [zoom, applyZoom]);

  const handleAddText = useCallback(() => {
    if (!canvasRef.current || !regionRectRef.current) return;

    import("fabric").then(async (fabric) => {
      const canvas = canvasRef.current!;
      const rect = regionRectRef.current!;

      const centerX = (rect.left ?? 0) + (rect.width ?? 0) / 2;
      const centerY = (rect.top ?? 0) + (rect.height ?? 0) / 2;
      const maxWidth = Math.max(100, (rect.width ?? 0) - 20);

      const clipPath = await buildRegionClipPath();

      const text = new fabric.Textbox("Your text", {
        width: maxWidth,
        fontSize: 24,
        fontFamily,
        left: centerX,
        top: centerY,
        originX: "center",
        originY: "center",
        textAlign: "center",
        fill: textColor,
        clipPath: clipPath ?? undefined,
        lockRotation: false,
        centeredRotation: true,
        data: { __internal: false, kind: "design" },
      });

      canvas.add(text);
      ensureDesignLayerId(text);
      text.setCoords();

      constrainScaleToRegion(text);
      clampObjectToRegion(text);

      canvas.setActiveObject(text);
      canvas.requestRenderAll();
    });
  }, [buildRegionClipPath, clampObjectToRegion, constrainScaleToRegion, textColor, fontFamily]);

  const handleAddImageFromSource = useCallback(
    async (input: File | string, meta?: { libraryArtworkId?: string }) => {
      if (!canvasRef.current || !regionRectRef.current) return;

      try {
        const fabric = await import("fabric");
        const clipPath = await buildRegionClipPath();
        const shouldTreatAsSvg =
          typeof input === "string" ? isSvgUrl(input) : isSvgFile(input);
        let img: FabricObject | null = null;

        if (shouldTreatAsSvg) {
          const svgMarkup =
            typeof input === "string"
              ? await fetch(input).then((response) => response.text())
              : await readFileAsText(input);

          const parsed = await fabric.loadSVGFromString(svgMarkup);
          const svgObjects = parsed.objects.filter(
            (obj): obj is FabricObject => obj !== null
          );
          img = fabric.util.groupSVGElements(svgObjects, parsed.options);
        } else {
          const imageSource = await loadImageDataUrlFromSource(input);
          img = await fabric.FabricImage.fromURL(imageSource, {
            crossOrigin: "anonymous",
          });
        }

        if (!img || !canvasRef.current || !regionRectRef.current) return;

        const canvas = canvasRef.current;
        const rect = regionRectRef.current;

        const centerX = (rect.left ?? 0) + (rect.width ?? 0) / 2;
        const centerY = (rect.top ?? 0) + (rect.height ?? 0) / 2;

        const w = img.width ?? 1;
        const h = img.height ?? 1;
        const maxWidth = Math.max(50, (rect.width ?? 0) - 20);
        const maxHeight = Math.max(50, (rect.height ?? 0) - 20);
        const imgScale = Math.min(maxWidth / w, maxHeight / h, 1);

        const libraryArtworkId =
          typeof meta?.libraryArtworkId === "string" && meta.libraryArtworkId.trim()
            ? meta.libraryArtworkId.trim()
            : undefined;

        img.set({
          left: centerX,
          top: centerY,
          scaleX: imgScale,
          scaleY: imgScale,
          originX: "center",
          originY: "center",
          clipPath: clipPath ?? undefined,
          lockRotation: false,
          centeredRotation: true,
          selectable: true,
          evented: true,
          data: {
            __internal: false,
            kind: "design",
            ...(libraryArtworkId
              ? { libraryArtworkId, artworkId: libraryArtworkId }
              : {}),
          },
        });

        canvas.add(img);
        ensureDesignLayerId(img);
        img.setCoords();

        constrainScaleToRegion(img);
        clampObjectToRegion(img);

        canvas.setActiveObject(img);
        canvas.requestRenderAll();
      } catch (error) {
        console.error("Failed to add image", error);
      }
    },
    [buildRegionClipPath, clampObjectToRegion, constrainScaleToRegion]
  );

  const handleAddImage = useCallback(
    async (file: File) => handleAddImageFromSource(file),
    [handleAddImageFromSource]
  );

  const handleAddImageFromUrl = useCallback(
    async (url: string, options?: { libraryArtworkId?: string }) =>
      handleAddImageFromSource(url, options),
    [handleAddImageFromSource]
  );

  const handleClear = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const objects = canvas.getObjects();
    const regionRect = regionRectRef.current;
    const bg = backgroundImageRef.current;

    objects.forEach((obj) => {
      if (obj !== regionRect && obj !== bg) canvas.remove(obj);
    });

    canvas.requestRenderAll();
  }, []);

  const handleDeleteSelected = useCallback(() => {
    const active = canvasRef.current?.getActiveObjects();
    if (active?.length) {
      active.forEach((obj) => canvasRef.current?.remove(obj));
      canvasRef.current?.discardActiveObject();
      canvasRef.current?.requestRenderAll();
    }
  }, []);

  useEffect(() => {
    onRegisterActionsRef.current?.({
      addText: handleAddText,
      addImage: handleAddImage,
      addImageFromUrl: handleAddImageFromUrl,
      deleteSelected: handleDeleteSelected,
      clear: handleClear,
    });

    return () => {
      onRegisterActionsRef.current?.(null);
    };
  }, [
    handleAddImage,
    handleAddImageFromUrl,
    handleAddText,
    handleClear,
    handleDeleteSelected,
  ]);

  const maxLeft = CANVAS_SIZE - 1;
  const maxTop = CANVAS_SIZE - 1;
  const maxWidthVal = CANVAS_SIZE;
  const maxHeightVal = CANVAS_SIZE;

  const chipButtonStyle = {
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    height: 32,
    padding: "0 10px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    background: "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)",
    color: brandColors.text,
    boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
  } as const;

  const actionButtonStyle = {
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    height: 34,
    padding: "0 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    background: "#ffffff",
    color: brandColors.text,
  } as const;

  const content = (
    <>
      <div
        style={{
          marginBottom: 10,
          borderRadius: 10,
          border: "1px solid #dbe3ec",
          background: "linear-gradient(145deg, #ffffff 0%, #f8fbff 100%)",
          padding: "8px 12px",
          fontWeight: 600,
          color: brandColors.text,
          boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
        }}
      >
        {label}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
          flexWrap: "wrap",
          borderRadius: 10,
          border: "1px solid #dbe3ec",
          background: "linear-gradient(145deg, #ffffff 0%, #f8fbff 100%)",
          padding: 10,
          boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
          minWidth: 0,
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        <InlineStack gap="300" blockAlign="center" wrap>
        <span style={{ fontSize: 12, fontWeight: 700, color: brandColors.textSubtle }}>Zoom:</span>

        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoom <= ZOOM_MIN}
          style={{
            ...chipButtonStyle,
            cursor: zoom <= ZOOM_MIN ? "not-allowed" : "pointer",
            minWidth: 30,
            opacity: zoom <= ZOOM_MIN ? 0.55 : 1,
          }}
          aria-label="Zoom out"
        >
          −
        </button>

        <span style={{ minWidth: 48, textAlign: "center", fontSize: 14, fontWeight: 700, color: brandColors.text }}>
          {Math.round(zoom * 100)}%
        </span>

        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoom >= ZOOM_MAX}
          style={{
            ...chipButtonStyle,
            cursor: zoom >= ZOOM_MAX ? "not-allowed" : "pointer",
            minWidth: 30,
            opacity: zoom >= ZOOM_MAX ? 0.55 : 1,
          }}
          aria-label="Zoom in"
        >
          +
        </button>


          <div
            style={{
              flex: isNarrowToolbar ? "1 1 100%" : "1 1 160px",
              minWidth: isNarrowToolbar ? "min(100%, 200px)" : 0,
              maxWidth: "100%",
            }}
          >
            <Select
              label="Font family"
              labelInline={!isNarrowToolbar}
              options={FONT_FAMILY_OPTIONS}
              value={fontFamily}
              onChange={handleFontFamilyChange}
            />
          </div>

          <div
            style={{
              flex: isNarrowToolbar ? "1 1 100%" : "1 1 160px",
              minWidth: isNarrowToolbar ? "min(100%, 200px)" : 0,
              maxWidth: "100%",
            }}
          >
            <Select
              label="Text color"
              labelInline={!isNarrowToolbar}
              options={TEXT_COLOR_OPTIONS}
              value={textColor}
              onChange={handleTextColorChange}
            />
          </div>

          <input
            type="color"
            value={textColor}
            onChange={(e) => handleTextColorChange(e.target.value)}
            aria-label="Pick custom text color"
            style={{
              width: 36,
              height: 36,
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              padding: 2,
              background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
              boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
              cursor: "pointer",
            }}
          />
        </InlineStack>
      </div>

        <div
        ref={zoomContainerRef}
        style={{
          border: "none",
          borderRadius: 12,
          background: "#fff",
          overflow: "hidden",
          cursor: "crosshair",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        <div
          ref={containerRef}
          style={{
            width: fillWidth ? width : 500,
            height: fillWidth ? height : 600,
            minWidth: 0,
            boxSizing: "border-box",
          }}
        />
      </div>

      {showInlineActions ? (
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={handleAddText} style={actionButtonStyle}>
            Add text
          </button>

          <label
            style={{
              ...actionButtonStyle,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Add image
            <input
              type="file"
              accept=".svg,image/svg+xml,image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleAddImage(f);
                e.target.value = "";
              }}
            />
          </label>

          <button type="button" onClick={handleDeleteSelected} style={actionButtonStyle}>
            Delete selected
          </button>

          <button type="button" onClick={handleClear} style={actionButtonStyle}>
            Clear
          </button>
        </div>
      ) : null}

          {/* <div style={{ marginTop: 12 }}>
        <div style={{ marginBottom: 6, fontWeight: 600, fontSize: 12 }}>Design area position (px)</div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span>Left</span>
            <input
              type="number"
              min={0}
              max={maxLeft}
              value={region.left}
              onChange={(e) =>
                onDesignableRegionChangeRef.current?.({
                  ...region,
                  left: Number(e.target.value) || 0,
                })
              }
              style={{ width: 64 }}
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span>Top</span>
            <input
              type="number"
              min={0}
              max={maxTop}
              value={region.top}
              onChange={(e) =>
                onDesignableRegionChangeRef.current?.({
                  ...region,
                  top: Number(e.target.value) || 0,
                })
              }
              style={{ width: 64 }}
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span>Width</span>
            <input
              type="number"
              min={50}
              max={maxWidthVal}
              value={region.width}
              onChange={(e) =>
                onDesignableRegionChangeRef.current?.({
                  ...region,
                  width: Number(e.target.value) || 100,
                })
              }
              style={{ width: 64 }}
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span>Height</span>
            <input
              type="number"
              min={50}
              max={maxHeightVal}
              value={region.height}
              onChange={(e) =>
                onDesignableRegionChangeRef.current?.({
                  ...region,
                  height: Number(e.target.value) || 100,
                })
              }
              style={{ width: 64 }}
            />
          </label>
        </div>
      </div>

      <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
        <span>Print size:</span>

        <input
          type="number"
          min={1}
          max={24}
          value={printWidth}
          onChange={(e) =>
            onPrintDimensionsChangeRef.current?.(Number(e.target.value) || 12, printHeight)
          }
          style={{ width: 56 }}
        />

        <span>×</span>

        <input
          type="number"
          min={1}
          max={24}
          value={printHeight}
          onChange={(e) =>
            onPrintDimensionsChangeRef.current?.(printWidth, Number(e.target.value) || 16)
          }
          style={{ width: 56 }}
        />
      </div> */}   

    </>
  );

  return (
    <div
      style={{
        border: "none",
        borderRadius: 0,
        padding: 12,
        background: "#ffffff",
        ...(fillWidth ? { width: "100%", minWidth: 0, boxSizing: "border-box" } : {}),
      }}
    >
      {fillWidth ? (
        <div ref={wrapperRef} style={{ width: "100%", minWidth: 0 }}>
          {content}
        </div>
      ) : (
        content
      )}
    </div>
  );
}

export function exportCanvasToDataUrl(
  canvas: Canvas | null,
  options?: { region?: DesignableRegion; includeBackground?: boolean; multiplier?: number }
): string | null {
  if (!canvas) return null;
  const multiplier = options?.multiplier ?? FABRIC_EXPORT_MULTIPLIER;
  const extractFallbackArtworkSource = () => {
    try {
      const objects = canvas.getObjects();
      for (const obj of objects) {
        const typed = obj as FabricObject & {
          data?: { __internal?: boolean };
          getSrc?: () => string;
          src?: string;
        };
        if (typed.data?.__internal) continue;

        if (typeof typed.getSrc === "function") {
          const src = typed.getSrc();
          if (typeof src === "string" && src.trim()) return src;
        }

        if (typeof typed.src === "string" && typed.src.trim()) {
          return typed.src;
        }
      }
    } catch {
      // Ignore fallback extraction failure.
    }
    return null;
  };

  try {
    const isExportableObject = (obj: FabricObject) => {
      const data = (obj as FabricObject & { data?: { kind?: string } }).data;
      if (options?.includeBackground === false && data?.kind === "background") {
        return false;
      }
      // Keep real background image, exclude only dotted design-region helper frame.
      return data?.kind !== "region";
    };

    const anyCanvas = canvas as Canvas & {
      toDataURL?: (options?: unknown) => string;
      lowerCanvasEl?: HTMLCanvasElement;
    };

    if (typeof anyCanvas.toDataURL === "function") {
      const region = options?.region;
      const cw =
        typeof (canvas as Canvas & { getWidth?: () => number }).getWidth === "function"
          ? (canvas as Canvas & { getWidth: () => number }).getWidth() || CANVAS_SIZE
          : CANVAS_SIZE;
      const ch =
        typeof (canvas as Canvas & { getHeight?: () => number }).getHeight === "function"
          ? (canvas as Canvas & { getHeight: () => number }).getHeight() || CANVAS_SIZE
          : CANVAS_SIZE;

      const pixelRect =
        region != null
          ? designRegionToPixelRect(
              region,
              cw,
              ch,
              CANVAS_SIZE,
              DESIGN_REGION_EDGE_BLEED_PX
            )
          : null;

      return anyCanvas.toDataURL({
        format: "png",
        multiplier,
        filter: isExportableObject,
        ...(pixelRect
          ? {
              left: pixelRect.left,
              top: pixelRect.top,
              width: pixelRect.width,
              height: pixelRect.height,
            }
          : {}),
      });
    }

    const el = anyCanvas.lowerCanvasEl;
    if (!el) return null;

    return el.toDataURL("image/png");
  } catch (error) {
    const fallbackSource = extractFallbackArtworkSource();
    if (fallbackSource) {
      // console.warn(
      //   "Canvas export failed; falling back to artwork source URL.",
      //   error
      // );
      return fallbackSource;
    }

    //console.error("Canvas export failed. The canvas is likely tainted by a cross-origin image.", error);
    return null;
  }
}

export function extractCanvasArtworkSourceUrl(canvas: Canvas | null): string | null {
  if (!canvas) return null;

  try {
    const objects = canvas.getObjects();
    for (const obj of objects) {
      const typed = obj as FabricObject & {
        type?: string;
        data?: { __internal?: boolean };
        getSrc?: () => string;
        src?: string;
      };

      if (typed.data?.__internal) continue;
      const isImageLike = typed.type === "image" || typed.type === "group";
      if (!isImageLike) continue;

      if (typeof typed.getSrc === "function") {
        const src = typed.getSrc();
        if (typeof src === "string" && src.trim()) return src;
      }

      if (typeof typed.src === "string" && typed.src.trim()) {
        return typed.src;
      }
    }
  } catch {
    // ignore extraction errors
  }

  return null;
}