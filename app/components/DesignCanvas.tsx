import { useRef, useEffect, useCallback, useState } from "react";
import type { Canvas, FabricObject, Rect } from "fabric";

const CANVAS_SIZE = 500;
const MIN_CANVAS_SIZE = 280;
const MIN_CANVAS_HEIGHT = 280;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.15;

export interface DesignableRegion {
  left: number;
  top: number;
  size: number;
}

const DEFAULT_REGION: DesignableRegion = {
  left: 125,
  top: 125,
  size: 250,
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
}: DesignCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const regionRectRef = useRef<Rect | null>(null);
  const backgroundImageRef = useRef<FabricObject | null>(null);

  const [canvasDimensions, setCanvasDimensions] = useState<{ w: number; h: number } | number>(
    fillWidth ? 0 : CANVAS_SIZE
  );
  const hasDimensions = fillWidth
    ? typeof canvasDimensions === "object" && canvasDimensions.w > 0 && canvasDimensions.h > 0
    : true;
  const width =
    fillWidth && typeof canvasDimensions === "object"
      ? canvasDimensions.w
      : !fillWidth
        ? CANVAS_SIZE
        : CANVAS_SIZE;
  const height =
    fillWidth && typeof canvasDimensions === "object"
      ? canvasDimensions.h
      : !fillWidth
        ? CANVAS_SIZE
        : CANVAS_SIZE;

  const [zoom, setZoom] = useState(1);

  const scaleX = width / CANVAS_SIZE;
  const scaleY = height / CANVAS_SIZE;
  const scale = Math.min(scaleX, scaleY);

  const region = designableRegion ?? DEFAULT_REGION;
  const regionSize = region.size * scale;
  const displayRegion = {
    left: (width - regionSize) / 2,
    top: (height - regionSize) / 2,
    size: regionSize,
  };

  useEffect(() => {
    if (!fillWidth || !wrapperRef.current) return;
    const el = wrapperRef.current;
    const updateSize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w <= 0) return;
      const cw = Math.max(MIN_CANVAS_SIZE, w);
      const ch = Math.max(
        MIN_CANVAS_HEIGHT,
        Math.min(h > 0 ? h : cw, cw)
      );
      setCanvasDimensions({ w: cw, h: ch });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fillWidth]);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    if (fillWidth && !hasDimensions) return;

    let mounted = true;
    let fabricCanvas: Canvas | null = null;
    const cw = width;
    const ch = height;

    import("fabric").then((fabric) => {
      if (!mounted || !containerRef.current) return;
      const canvasEl = document.createElement("canvas");
      canvasEl.width = cw;
      canvasEl.height = ch;
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(canvasEl);
      fabricCanvas = new fabric.Canvas(canvasEl, {
        width: cw,
        height: ch,
      });
      canvasRef.current = fabricCanvas;

      const r = displayRegion;
      const rect = new fabric.Rect({
        left: r.left,
        top: r.top,
        width: r.size,
        height: r.size,
        fill: "transparent",
        stroke: "#374151",
        strokeWidth: 2,
        strokeDashArray: [8, 8],
        selectable: false,
        evented: false,
      });
      fabricCanvas.add(rect);
      regionRectRef.current = rect;

      if (backgroundImageUrl) {
        fabric.FabricImage.fromURL(backgroundImageUrl).then((img) => {
          if (!mounted || !fabricCanvas) return;
          const imgW = (img as unknown as { width?: number }).width ?? 1;
          const imgH = (img as unknown as { height?: number }).height ?? 1;
          const scaleBg = Math.min(cw / imgW, ch / imgH);
          const scaledW = imgW * scaleBg;
          const scaledH = imgH * scaleBg;
          img.set({
            scaleX: scaleBg,
            scaleY: scaleBg,
            left: (cw - scaledW) / 2,
            top: (ch - scaledH) / 2,
            originX: "left",
            originY: "top",
            selectable: true,
            evented: true,
            lockScalingX: true,
            lockScalingY: true,
            lockRotation: true,
            hasControls: false,
            hasBorders: true,
          });
          fabricCanvas.add(img);
          backgroundImageRef.current = img;
          fabricCanvas.sendObjectToBack(img);
          fabricCanvas.requestRenderAll();
        });
      }
      fabricCanvas.requestRenderAll();
      onCanvasReady?.(fabricCanvas);
    });

    return () => {
      mounted = false;
      regionRectRef.current = null;
      backgroundImageRef.current = null;
      if (canvasRef.current) {
        canvasRef.current.dispose();
        canvasRef.current = null;
      }
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [onCanvasReady, backgroundImageUrl, width, height, hasDimensions]);

  useEffect(() => {
    if (!canvasRef.current || !regionRectRef.current) return;
    const rect = regionRectRef.current;
    rect.set({ left: displayRegion.left, top: displayRegion.top, width: displayRegion.size, height: displayRegion.size });
    rect.setCoords();
    canvasRef.current.requestRenderAll();
  }, [displayRegion.left, displayRegion.top, displayRegion.size]);

  const clampObjectToRegion = useCallback(
    (obj: FabricObject) => {
      if (!canvasRef.current) return;
      if (obj === backgroundImageRef.current || obj === regionRectRef.current) return;
      const r = displayRegion;
      const bound = obj.getBoundingRect();
      const w = bound.width;
      const h = bound.height;
      let left = (obj as unknown as { left?: number }).left ?? 0;
      let top = (obj as unknown as { top?: number }).top ?? 0;
      if (left < r.left) left = r.left;
      if (top < r.top) top = r.top;
      if (left + w > r.left + r.size) left = r.left + r.size - w;
      if (top + h > r.top + r.size) top = r.top + r.size - h;
      obj.set({ left, top });
      obj.setCoords();
      canvasRef.current.requestRenderAll();
    },
    [displayRegion]
  );

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const onMoving = (e: { target?: FabricObject }) => {
      if (e.target) clampObjectToRegion(e.target);
    };
    const onScaling = (e: { target?: FabricObject }) => {
      if (e.target) clampObjectToRegion(e.target);
    };
    const onModified = (e: { target?: FabricObject }) => {
      if (e.target) clampObjectToRegion(e.target);
    };
    canvas.on("object:modified", onModified);
    canvas.on("object:moving", onMoving);
    canvas.on("object:scaling", onScaling);
    return () => {
      canvas.off("object:moving", onMoving);
      canvas.off("object:scaling", onScaling);
      canvas.off("object:modified", onModified);
    };
  }, [clampObjectToRegion]);

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

  const applyZoom = useCallback((newZoom: number, point?: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas as Canvas & { zoomToPoint?: (pt: { x: number; y: number }, z: number) => void };
    const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
    const pt = point ?? { x: width / 2, y: height / 2 };
    if (c.zoomToPoint) {
      c.zoomToPoint(pt, z);
    } else {
      setZoomAtPoint(canvas, pt, z);
    }
    canvas.requestRenderAll();
    setZoom(z);
  }, [width, height, setZoomAtPoint]);

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const z = zoomRef.current;
    const pt = { x: width / 2, y: height / 2 };
    const c = canvas as Canvas & { zoomToPoint?: (p: { x: number; y: number }, zoomVal: number) => void };
    if (c.zoomToPoint) {
      c.zoomToPoint(pt, z);
    } else {
      setZoomAtPoint(canvas, pt, z);
    }
    canvas.requestRenderAll();
  }, [zoom, width, height, setZoomAtPoint]);

  const zoomContainerRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: WheelEvent) => {
    const canvas = canvasRef.current;
    const container = zoomContainerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const delta = -Math.sign(e.deltaY) * 0.1;
    setZoom((prev) => {
      const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, prev * (1 + delta)));
      const c = canvas as Canvas & { zoomToPoint?: (pt: { x: number; y: number }, z: number) => void };
      if (c.zoomToPoint) {
        c.zoomToPoint({ x, y }, newZoom);
      } else {
        setZoomAtPoint(canvas, { x, y }, newZoom);
      }
      canvas.requestRenderAll();
      return newZoom;
    });
    e.preventDefault();
  }, [setZoomAtPoint]);

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

  const regionCenterLeft = displayRegion.left + displayRegion.size / 2;
  const regionCenterTop = displayRegion.top + displayRegion.size / 2;

  const handleAddText = useCallback(() => {
    if (!canvasRef.current) return;
    import("fabric").then((fabric) => {
      const maxWidth = Math.max(100, displayRegion.size - 20);
      const text = new fabric.Textbox("Your text", {
        width: maxWidth,
        fontSize: 24,
        left: regionCenterLeft - maxWidth / 2,
        top: regionCenterTop - 14,
      });
      const canvas = canvasRef.current;
      canvas?.add(text);
      if (backgroundImageRef.current) canvas?.sendObjectToBack(backgroundImageRef.current);
      canvas?.requestRenderAll();
    });
  }, [displayRegion.size, regionCenterLeft, regionCenterTop]);

  const handleAddImage = useCallback(
    (file: File) => {
      if (!canvasRef.current) return;
      const url = URL.createObjectURL(file);
      import("fabric").then((fabric) => {
        fabric.FabricImage.fromURL(url).then((img) => {
          if (!img || !canvasRef.current) return;
          const w = (img as unknown as { width?: number }).width ?? 1;
          const h = (img as unknown as { height?: number }).height ?? 1;
          const maxDim = displayRegion.size - 20;
          const imgScale = Math.min(maxDim / w, maxDim / h, 1);
          img.set({
            scaleX: imgScale,
            scaleY: imgScale,
            left: regionCenterLeft - (w * imgScale) / 2,
            top: regionCenterTop - (h * imgScale) / 2,
          });
          const canvas = canvasRef.current;
          canvas.add(img);
          if (backgroundImageRef.current) canvas.sendObjectToBack(backgroundImageRef.current);
          canvas.requestRenderAll();
          URL.revokeObjectURL(url);
        });
      });
    },
    [displayRegion.size, regionCenterLeft, regionCenterTop]
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

  const maxPos = CANVAS_SIZE - 50;
  const maxSizeVal = CANVAS_SIZE;

  const content = (
    <>
      <div style={{ marginBottom: 8, fontWeight: 600 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Zoom:</span>
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoom <= ZOOM_MIN}
          style={{
            padding: "4px 10px",
            cursor: zoom <= ZOOM_MIN ? "not-allowed" : "pointer",
            fontWeight: 600,
            minWidth: 32,
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
            padding: "4px 10px",
            cursor: zoom >= ZOOM_MAX ? "not-allowed" : "pointer",
            fontWeight: 600,
            minWidth: 32,
          }}
          aria-label="Zoom in"
        >
          +
        </button>
      </div>
      <div
        ref={zoomContainerRef}
        style={{
          border: "1px solid #d1d5db",
          background: "#fff",
          overflow: "hidden",
          cursor: "crosshair",
        }}
      >
        <div ref={containerRef} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={handleAddText} style={{ padding: "6px 12px", cursor: "pointer" }}>
          Add text
        </button>
        <label style={{ padding: "6px 12px", cursor: "pointer", background: "#f3f4f6", borderRadius: 4 }}>
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
        <button type="button" onClick={handleDeleteSelected} style={{ padding: "6px 12px", cursor: "pointer" }}>
          Delete selected
        </button>
        <button type="button" onClick={handleClear} style={{ padding: "6px 12px", cursor: "pointer" }}>
          Clear
        </button>
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ marginBottom: 6, fontWeight: 600, fontSize: 12 }}>Design area position (px)</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span>Left</span>
            <input
              type="number"
            min={0}
            max={maxPos}
            value={region.left}
              onChange={(e) => onDesignableRegionChange?.({ ...region, left: Number(e.target.value) || 0 })}
              style={{ width: 56 }}
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span>Top</span>
            <input
              type="number"
            min={0}
            max={maxPos}
            value={region.top}
              onChange={(e) => onDesignableRegionChange?.({ ...region, top: Number(e.target.value) || 0 })}
              style={{ width: 56 }}
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span>Size</span>
            <input
              type="number"
            min={50}
            max={maxSizeVal}
            value={region.size}
              onChange={(e) => onDesignableRegionChange?.({ ...region, size: Number(e.target.value) || 100 })}
              style={{ width: 56 }}
            />
          </label>
        </div>
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
        <span>Print size (in):</span>
        <input
          type="number"
          min={1}
          max={24}
          value={printWidth}
          onChange={(e) => onPrintDimensionsChange?.(Number(e.target.value) || 12, printHeight)}
          style={{ width: 56 }}
        />
        <span>×</span>
        <input
          type="number"
          min={1}
          max={24}
          value={printHeight}
          onChange={(e) => onPrintDimensionsChange?.(printWidth, Number(e.target.value) || 16)}
          style={{ width: 56 }}
        />
      </div>
    </>
  );

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 12,
        background: "#fafafa",
        ...(fillWidth ? { width: "100%", minWidth: 0, boxSizing: "border-box" } : {}),
      }}
    >
      {fillWidth ? (
        <div ref={wrapperRef} style={{ width: "100%", minWidth: 0, height: "100%", minHeight: 0 }}>
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
  const el = (canvas as unknown as { lowerCanvasEl?: HTMLCanvasElement }).lowerCanvasEl;
  if (!el) return null;
  return el.toDataURL("image/png");
}
