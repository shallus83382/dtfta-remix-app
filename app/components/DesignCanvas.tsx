import { useRef, useEffect, useCallback, useState } from "react";
import { Select, InlineStack } from "@shopify/polaris";
import type { Canvas, FabricObject, Rect } from "fabric";

const CANVAS_SIZE = 500;
const MIN_CANVAS_SIZE = 280;
const MIN_CANVAS_HEIGHT = 280;
const CANVAS_ASPECT_RATIO = 0.72;
const MAX_CANVAS_WIDTH = 860;
const MAX_CANVAS_HEIGHT = 520;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.15;

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
    if (!rect) return null;

    const fabric = await import("fabric");

    return new fabric.Rect({
      left: rect.left ?? 0,
      top: rect.top ?? 0,
      width: rect.width ?? 0,
      height: rect.height ?? 0,
      originX: "left",
      originY: "top",
      absolutePositioned: true,
    });
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
      };

      fabricCanvas.on("object:moving", onMoving);
      fabricCanvas.on("object:scaling", onScaling);
      fabricCanvas.on("object:modified", onModified);

      cleanupListeners = () => {
        fabricCanvas.off("object:moving", onMoving);
        fabricCanvas.off("object:scaling", onScaling);
        fabricCanvas.off("object:modified", onModified);
      };

      fabricCanvas.requestRenderAll();
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

      canvas.getObjects().forEach((obj) => {
        if (obj === backgroundImageRef.current || obj === currentRect) return;

        const clip = new fabric.Rect({
          left: currentRect.left ?? 0,
          top: currentRect.top ?? 0,
          width: currentRect.width ?? 0,
          height: currentRect.height ?? 0,
          originX: "left",
          originY: "top",
          absolutePositioned: true,
        });

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

          const clip = new fabric.Rect({
            left: regionRectRef.current!.left ?? 0,
            top: regionRectRef.current!.top ?? 0,
            width: regionRectRef.current!.width ?? 0,
            height: regionRectRef.current!.height ?? 0,
            originX: "left",
            originY: "top",
            absolutePositioned: true,
          });

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
      text.setCoords();

      constrainScaleToRegion(text);
      clampObjectToRegion(text);

      canvas.setActiveObject(text);
      canvas.requestRenderAll();
    });
  }, [buildRegionClipPath, clampObjectToRegion, constrainScaleToRegion, textColor, fontFamily]);

  const handleAddImage = useCallback(
    async (file: File) => {
      if (!canvasRef.current || !regionRectRef.current) return;

      try {
        const dataUrl = await readFileAsDataUrl(file);
        const fabric = await import("fabric");
        const clipPath = await buildRegionClipPath();

        const img = await fabric.FabricImage.fromURL(dataUrl);

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
          data: { __internal: false, kind: "design" },
        });

        canvas.add(img);
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

  const maxLeft = CANVAS_SIZE - 1;
  const maxTop = CANVAS_SIZE - 1;
  const maxWidthVal = CANVAS_SIZE;
  const maxHeightVal = CANVAS_SIZE;

  const chipButtonStyle = {
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    height: 32,
    padding: "0 10px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    background: "#f8fafc",
    color: "#0f172a",
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
    color: "#0f172a",
  } as const;

  const content = (
    <>
      <div
        style={{
          marginBottom: 10,
          borderRadius: 10,
          border: "1px solid #dbe7ff",
          background:
            "linear-gradient(135deg, rgba(239,246,255,0.9) 0%, rgba(255,255,255,1) 100%)",
          padding: "8px 10px",
          fontWeight: 600,
          color: "#0f172a",
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
          border: "1px solid #e2e8f0",
          background: "#fcfdff",
          padding: 10,
        }}
      >
        <InlineStack gap="300" blockAlign="center">
        <span style={{ fontSize: 12, fontWeight: 600 }}>Zoom:</span>

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

        <span style={{ minWidth: 48, textAlign: "center", fontSize: 14 }}>
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


          <div style={{ minWidth: 220 }}>
            <Select
              label="Font family"
              labelInline
              options={FONT_FAMILY_OPTIONS}
              value={fontFamily}
              onChange={handleFontFamilyChange}
            />
          </div>

          <div style={{ minWidth: 220 }}>
            <Select
              label="Text color"
              labelInline
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
              background: "#fff",
              cursor: "pointer",
            }}
          />
        </InlineStack>
      </div>

      <div
        ref={zoomContainerRef}
        style={{
          border: "1px solid #e5eaf1",
          borderRadius: 10,
          background: "#fff",
          overflow: "hidden",
          cursor: "crosshair",
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
            accept="image/*"
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
        border: "1px solid #e8edf3",
        borderRadius: 12,
        padding: 10,
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

export function exportCanvasToDataUrl(canvas: Canvas | null): string | null {
  if (!canvas) return null;

  try {
    if (typeof (canvas as Canvas & { toDataURL?: (options?: unknown) => string }).toDataURL === "function") {
      return (canvas as Canvas & { toDataURL: (options?: unknown) => string }).toDataURL({
        format: "png",
        multiplier: 1,
      });
    }

    const el = (canvas as unknown as { lowerCanvasEl?: HTMLCanvasElement }).lowerCanvasEl;
    if (!el) return null;

    return el.toDataURL("image/png");
  } catch (error) {
    console.error("Canvas export failed. The canvas is likely tainted by a cross-origin image.", error);
    return null;
  }
}