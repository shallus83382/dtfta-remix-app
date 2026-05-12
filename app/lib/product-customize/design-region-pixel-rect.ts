/**
 * Maps the logical design region (default 500×500 editor space) to integer pixel
 * bounds on an actual Fabric canvas. Uses floor/ceil so partial edge pixels are
 * included; clamps to the canvas so export + mockup composite use the same rect
 * and avoid sub-pixel mismatch clipping at the print-area border.
 *
 * {@link DESIGN_REGION_EDGE_BLEED_PX} — same value pads Fabric clip, export crop,
 * and mockup composite rect so they stay aligned.
 */
export const DESIGN_REGION_EDGE_BLEED_PX = 2;

export const DESIGN_LOGICAL_CANVAS_SIZE = 500;

export type RegionLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function designRegionToPixelRect(
  region: RegionLike,
  canvasWidth: number,
  canvasHeight: number,
  logicalSize: number = DESIGN_LOGICAL_CANVAS_SIZE,
  /** Expand crop outward (canvas px) to match a slightly larger on-canvas clip / anti-alias bleed. */
  outsetPx: number = 0
): { left: number; top: number; width: number; height: number } {
  const cw = Math.max(1, Math.round(canvasWidth));
  const ch = Math.max(1, Math.round(canvasHeight));
  const out = Math.max(0, Math.round(outsetPx));
  const scaleX = cw / logicalSize;
  const scaleY = ch / logicalSize;

  const leftF = region.left * scaleX;
  const topF = region.top * scaleY;
  const rightF = (region.left + region.width) * scaleX;
  const bottomF = (region.top + region.height) * scaleY;

  const left = Math.max(0, Math.floor(leftF) - out);
  const top = Math.max(0, Math.floor(topF) - out);
  const right = Math.min(cw, Math.ceil(rightF) + out);
  const bottom = Math.min(ch, Math.ceil(bottomF) + out);

  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}
