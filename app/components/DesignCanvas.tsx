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

  const getRegionCenter = () => {
    const rect = regionRectRef.current;
    if (!rect) return { x: width / 2, y: height / 2 };
  
    return {
      x: (rect.left ?? 0) + (rect.width ?? 0) / 2,
      y: (rect.top ?? 0) + (rect.height ?? 0) / 2,
    };
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
        
      // Create centered design region rectangle
      const rect = new fabric.Rect({
        left: region.left * scale,
        top: region.top * scale,
        width: region.size * scale,
        height: region.size * scale,
        originX: "left",
        originY: "top",
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
          if (!mounted || !canvasRef.current) return;
    
          const canvas = canvasRef.current;
    
          const imgW = (img as unknown as { width?: number }).width ?? 1;
          const imgH = (img as unknown as { height?: number }).height ?? 1;
    
          const scaleBg = Math.min(cw / imgW, ch / imgH);
    
          const scaledW = imgW * scaleBg;
          const scaledH = imgH * scaleBg;
    
          img.set({
            scaleX: scaleBg,
            scaleY: scaleBg,
            originX: "center",
            originY: "center",
            left: cw / 2,
            top: ch / 2,
            selectable: false,
            evented: false,
            lockScalingX: true,
            lockScalingY: true,
            lockRotation: true,
            hasControls: false,
            hasBorders: true,
          });
    
          canvas.add(img);
          canvas.sendObjectToBack(img);
          backgroundImageRef.current = img;
          positionRegionRect();
          canvas.requestRenderAll();
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

  const positionRegionRect = useCallback(() => {
    const canvas = canvasRef.current;
    const rect = regionRectRef.current;
    const bg = backgroundImageRef.current as (FabricObject & {
      getScaledWidth?: () => number;
      getScaledHeight?: () => number;
    }) | null;
  
    if (!canvas || !rect) return;
  
    const scaledSize = region.size * scale;
  
    // if background exists, center the region on the image
    if (bg) {
      const bgWidth =
        typeof bg.getScaledWidth === "function"
          ? bg.getScaledWidth()
          : (bg.getBoundingRect().width ?? scaledSize);
  
      const bgHeight =
        typeof bg.getScaledHeight === "function"
          ? bg.getScaledHeight()
          : (bg.getBoundingRect().height ?? scaledSize);
  
      const bgLeft = (bg.left ?? 0) - bgWidth / 2;
      const bgTop = (bg.top ?? 0) - bgHeight / 2;
  
      const left = bgLeft + (bgWidth - scaledSize) / 2;
      const top = bgTop + (bgHeight - scaledSize) / 2;
  
      rect.set({
        originX: "left",
        originY: "top",
        left,
        top,
        width: scaledSize,
        height: scaledSize,
      });
  
      rect.setCoords();
      canvas.requestRenderAll();
  
      // optional: sync visible rect back to parent state
      onDesignableRegionChange?.({
        left: Math.round(left / scale),
        top: Math.round(top / scale),
        size: region.size,
      });
  
      return;
    }
  
    // fallback if no background image
    rect.set({
      originX: "left",
      originY: "top",
      left: region.left * scale,
      top: region.top * scale,
      width: scaledSize,
      height: scaledSize,
    });
  
    rect.setCoords();
    canvas.requestRenderAll();
  }, [region.left, region.top, region.size, scale, onDesignableRegionChange]);

  const clampObjectToRegion = useCallback((obj: FabricObject) => {
    const canvas = canvasRef.current;
    const regionRect = regionRectRef.current;
  
    if (!canvas || !regionRect) return;
    if (obj === backgroundImageRef.current || obj === regionRect) return;
  
    obj.setCoords();
    regionRect.setCoords();
  
    const objBounds = obj.getBoundingRect();
    const regionBounds = regionRect.getBoundingRect();
  
    const marginX = regionBounds.width;
    const marginY = regionBounds.height;
  
    let dx = 0;
    let dy = 0;
  
    if (objBounds.left + objBounds.width < regionBounds.left - marginX) {
      dx = (regionBounds.left - marginX) - (objBounds.left + objBounds.width);
    }
  
    if (objBounds.left > regionBounds.left + regionBounds.width + marginX) {
      dx = (regionBounds.left + regionBounds.width + marginX) - objBounds.left;
    }
  
    if (objBounds.top + objBounds.height < regionBounds.top - marginY) {
      dy = (regionBounds.top - marginY) - (objBounds.top + objBounds.height);
    }
  
    if (objBounds.top > regionBounds.top + regionBounds.height + marginY) {
      dy = (regionBounds.top + regionBounds.height + marginY) - objBounds.top;
    }
  
    if (dx !== 0 || dy !== 0) {
      obj.set({
        left: (obj.left ?? 0) + dx,
        top: (obj.top ?? 0) + dy,
      });
      obj.setCoords();
      canvas.requestRenderAll();
    }
  }, []);

  useEffect(() => {
    positionRegionRect();
  }, [positionRegionRect]);

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
  
    canvas.on("object:moving", onMoving);
    canvas.on("object:scaling", onScaling);
    canvas.on("object:modified", onModified);
  
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
        left: centerX,
        top: centerY,
        originX: "center",
        originY: "center",
        textAlign: "center",
        clipPath: clipPath ?? undefined,
      });
  
      canvas.add(text);
      canvas.setActiveObject(text);
      text.setCoords();
      canvas.requestRenderAll();
    });
  }, [buildRegionClipPath]);

  const handleAddImage = useCallback((file: File) => {
    if (!canvasRef.current || !regionRectRef.current) return;
  
    const url = URL.createObjectURL(file);
  
    import("fabric").then(async (fabric) => {
      const clipPath = await buildRegionClipPath();
  
      fabric.FabricImage.fromURL(url).then((img) => {
        if (!img || !canvasRef.current || !regionRectRef.current) return;
  
        const canvas = canvasRef.current!;
        const rect = regionRectRef.current!;
  
        const centerX = (rect.left ?? 0) + (rect.width ?? 0) / 2;
        const centerY = (rect.top ?? 0) + (rect.height ?? 0) / 2;
  
        const w = img.width ?? 1;
        const h = img.height ?? 1;
        const maxDim = Math.max(50, (rect.width ?? 0) - 20);
        const imgScale = Math.min(maxDim / w, maxDim / h, 1);
  
        img.set({
          left: centerX,
          top: centerY,
          scaleX: imgScale,
          scaleY: imgScale,
          originX: "center",
          originY: "center",
          clipPath: clipPath ?? undefined,
        });
  
        canvas.add(img);
        canvas.setActiveObject(img);
        img.setCoords();
        canvas.requestRenderAll();
  
        URL.revokeObjectURL(url);
      });
    });
  }, [buildRegionClipPath]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const rect = regionRectRef.current;
    if (!canvas || !rect) return;
  
    let cancelled = false;
  
    import("fabric").then((fabric) => {
      if (cancelled || !canvasRef.current || !regionRectRef.current) return;
  
      const currentRect = regionRectRef.current;
  
      const objects = canvas.getObjects();
      objects.forEach((obj) => {
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
  
        obj.set({
          clipPath: clip,
        });
        obj.setCoords();
      });
  
      canvas.requestRenderAll();
    });
  
    return () => {
      cancelled = true;
    };
  }, [region.left, region.top, region.size, scale]);

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
        <div ref={containerRef}  style={{ height: 500 }} />
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
