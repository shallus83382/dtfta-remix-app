import type { DtftaPrintArea } from "../dtfta-products.server";
import type { DesignableRegion } from "../../components/DesignCanvas";
import {
  classifyPrintAreaUnit,
  physicalSpanInchesToBackendUnit,
} from "./print-units";

/**
 * Physical print size vs mockup region:
 * - {@link getPhysicalPrintSize} → labels / submission (inches, mm, …).
 * - {@link getDesignRegionFromPrintArea} → dashed clip on the shirt (logical ~500×500 coords).
 * If `area_width`/`area_height` are **physical** (e.g. 12×16 in), they must not be reused as Fabric
 * region sizes. `position_x` / `position_y` in the same `unit` are mapped to logical canvas via
 * {@link logicalPositionFromPrintArea} (optional `position_reference_width` / `position_reference_height`).
 */

export const DEFAULT_PRINT_AREA_DPI = 150;

function inchesFromDesignPixels(pxW: number, pxH: number, dpi: number) {
  const d = dpi > 0 ? dpi : DEFAULT_PRINT_AREA_DPI;
  return { width: pxW / d, height: pxH / d };
}

/**
 * When unit is inches, values above this on either axis are treated as **design pixels at DPI**,
 * not literal inch measurements (e.g. 100×150 coords vs 12×16 inch garment print).
 */
const INCH_PHYSICAL_MAX_PLAUSIBLE = 48;

/** Above this, mm values are treated as design pixels converted to mm (optional heuristic). */
const MM_PHYSICAL_MAX_PLAUSIBLE = 280;

/** Above this, cm values are treated as design pixels converted to cm. */
const CM_PHYSICAL_MAX_PLAUSIBLE = 90;

export function getPhysicalPrintSize(area: DtftaPrintArea): { width: number; height: number } {
  const w = Number(area.area_width || 0);
  const h = Number(area.area_height || 0);
  const safeW = Number.isFinite(w) && w > 0 ? w : 250;
  const safeH = Number.isFinite(h) && h > 0 ? h : 250;

  const explicitW = area.physical_print_width != null ? Number(area.physical_print_width) : NaN;
  const explicitH = area.physical_print_height != null ? Number(area.physical_print_height) : NaN;
  if (Number.isFinite(explicitW) && Number.isFinite(explicitH) && explicitW > 0 && explicitH > 0) {
    return { width: explicitW, height: explicitH };
  }

  const kind = classifyPrintAreaUnit(area.unit);
  const rawEmpty = !(area.unit ?? "").trim();
  const dpi =
    typeof area.print_area_dpi === "number" && Number.isFinite(area.print_area_dpi) && area.print_area_dpi > 0
      ? area.print_area_dpi
      : DEFAULT_PRINT_AREA_DPI;

  if (kind === "px" || rawEmpty) {
    return { width: safeW, height: safeH };
  }

  const maxDim = Math.max(safeW, safeH);

  if (kind === "in") {
    if (maxDim <= INCH_PHYSICAL_MAX_PLAUSIBLE) {
      return { width: safeW, height: safeH };
    }
    return inchesFromDesignPixels(safeW, safeH, dpi);
  }

  if (kind === "mm") {
    if (maxDim <= MM_PHYSICAL_MAX_PLAUSIBLE) {
      return { width: safeW, height: safeH };
    }
    const inc = inchesFromDesignPixels(safeW, safeH, dpi);
    return { width: inc.width * 25.4, height: inc.height * 25.4 };
  }

  if (kind === "cm") {
    if (maxDim <= CM_PHYSICAL_MAX_PLAUSIBLE) {
      return { width: safeW, height: safeH };
    }
    const inc = inchesFromDesignPixels(safeW, safeH, dpi);
    return { width: inc.width * 2.54, height: inc.height * 2.54 };
  }

  if (kind === "m") {
    if (maxDim <= 3) {
      return { width: safeW, height: safeH };
    }
    const inc = inchesFromDesignPixels(safeW, safeH, dpi);
    return { width: inc.width * 0.0254, height: inc.height * 0.0254 };
  }

  return { width: safeW, height: safeH };
}

/** Logical canvas width used by {@link DesignCanvas} for region math (before fluid scaling). */
const DESIGN_CANVAS_LOGICAL = 500;

/** Fallback garment span (in) when API omits `position_reference_*`. Override via API for accurate placement. */
export const DEFAULT_POSITION_REFERENCE_WIDTH_IN = 14;
export const DEFAULT_POSITION_REFERENCE_HEIGHT_IN = 18;

/** Minimum sensible mapping span (in) so small offsets (e.g. 5″) are not stretched across an unrealistically narrow 14″ reference. */
const MIN_POSITION_REFERENCE_WIDTH_IN = 20;
const MIN_POSITION_REFERENCE_HEIGHT_IN = 22;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function isEffectivelyZero(n: number): boolean {
  return Math.abs(n) < 1e-6;
}

/**
 * Reference width/height for mapping `position_x`/`position_y` onto logical 0–500 coords:
 * `logical = position / referenceSpan * 500`.
 *
 * Priority: explicit API `position_reference_*` (same unit as `unit`) → else derive at least
 * **min garment span**, **legacy defaults**, and **`position + area_width`** so the reference frame
 * covers the print placement (avoids treating 5″ offset as 5/14 of the whole shirt when the box is 3.5″ wide).
 */
function resolvedPositionReferenceSpan(area: DtftaPrintArea): { width: number; height: number } {
  const kind = classifyPrintAreaUnit(area.unit);
  const rawEmpty = !(area.unit ?? "").trim();
  if (kind === "px" || rawEmpty) {
    return { width: DESIGN_CANVAS_LOGICAL, height: DESIGN_CANVAS_LOGICAL };
  }

  const optW = area.position_reference_width != null ? Number(area.position_reference_width) : NaN;
  const optH = area.position_reference_height != null ? Number(area.position_reference_height) : NaN;
  if (
    Number.isFinite(optW) &&
    optW > 0 &&
    Number.isFinite(optH) &&
    optH > 0
  ) {
    return { width: optW, height: optH };
  }

  const pxVal = Number(area.position_x || 0);
  const pyVal = Number(area.position_y || 0);
  const aw = Number(area.area_width || 0);
  const ah = Number(area.area_height || 0);

  if (kind === "in") {
    const wIn = Math.max(
      MIN_POSITION_REFERENCE_WIDTH_IN,
      DEFAULT_POSITION_REFERENCE_WIDTH_IN,
      pxVal + aw
    );
    const hIn = Math.max(
      MIN_POSITION_REFERENCE_HEIGHT_IN,
      DEFAULT_POSITION_REFERENCE_HEIGHT_IN,
      pyVal + ah
    );
    return { width: wIn, height: hIn };
  }

  const minFromInches = physicalSpanInchesToBackendUnit(
    MIN_POSITION_REFERENCE_WIDTH_IN,
    MIN_POSITION_REFERENCE_HEIGHT_IN,
    area.unit
  );
  const defaultFromInches = physicalSpanInchesToBackendUnit(
    DEFAULT_POSITION_REFERENCE_WIDTH_IN,
    DEFAULT_POSITION_REFERENCE_HEIGHT_IN,
    area.unit
  );

  return {
    width: Math.max(minFromInches.width, defaultFromInches.width, pxVal + aw),
    height: Math.max(minFromInches.height, defaultFromInches.height, pyVal + ah),
  };
}

/**
 * Converts `position_x` / `position_y` from the print-area `unit` into logical canvas coords (0–500).
 * Backend-driven: `px` = design coords; `in`/`mm`/`cm`/`m` = same-unit offsets scaled by reference spans
 * (API `position_reference_*`, or defaults converted into that unit via {@link physicalSpanInchesToBackendUnit}).
 */
export function logicalPositionFromPrintArea(
  area: DtftaPrintArea,
  regionWidth: number,
  regionHeight: number
): { left: number; top: number } {
  const kind = classifyPrintAreaUnit(area.unit);
  const rawEmpty = !(area.unit ?? "").trim();
  const pxVal = Number(area.position_x || 0);
  const pyVal = Number(area.position_y || 0);

  if (kind === "px" || rawEmpty) {
    return {
      left: Number.isFinite(pxVal) ? pxVal : 0,
      top: Number.isFinite(pyVal) ? pyVal : 0,
    };
  }

  if (kind === "unknown") {
    const optW = area.position_reference_width != null ? Number(area.position_reference_width) : NaN;
    const optH = area.position_reference_height != null ? Number(area.position_reference_height) : NaN;
    const hasExplicitRef =
      Number.isFinite(optW) &&
      optW > 0 &&
      Number.isFinite(optH) &&
      optH > 0;
    if (!hasExplicitRef) {
      return {
        left: Number.isFinite(pxVal) ? pxVal : 0,
        top: Number.isFinite(pyVal) ? pyVal : 0,
      };
    }
  }

  const { width: refW, height: refH } = resolvedPositionReferenceSpan(area);

  let left = (pxVal / refW) * DESIGN_CANVAS_LOGICAL;
  let top = (pyVal / refH) * DESIGN_CANVAS_LOGICAL;

  const maxLeft = Math.max(0, DESIGN_CANVAS_LOGICAL - regionWidth);
  const maxTop = Math.max(0, DESIGN_CANVAS_LOGICAL - regionHeight);
  left = clamp(left, 0, maxLeft);
  top = clamp(top, 0, maxTop);

  return { left, top };
}

/**
 * True when `area_width`/`area_height` are treated as **physical** dimensions (same thresholds as
 * {@link getPhysicalPrintSize}), so they must **not** be used directly as mockup rectangle pixel sizes.
 */
export function isPhysicalSizeStoredInAreaFields(area: DtftaPrintArea): boolean {
  const w = Number(area.area_width || 0);
  const h = Number(area.area_height || 0);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return false;

  const kind = classifyPrintAreaUnit(area.unit);
  const rawEmpty = !(area.unit ?? "").trim();
  const maxDim = Math.max(w, h);

  if (kind === "px" || rawEmpty) return false;

  if (kind === "in") return maxDim <= INCH_PHYSICAL_MAX_PLAUSIBLE;
  if (kind === "mm") return maxDim <= MM_PHYSICAL_MAX_PLAUSIBLE;
  if (kind === "cm") return maxDim <= CM_PHYSICAL_MAX_PLAUSIBLE;
  if (kind === "m") return maxDim <= 3;
  return false;
}

/**
 * Mockup region preserving aspect ratio of physical width/height; position uses
 * {@link logicalPositionFromPrintArea} when non-zero.
 */
function designRegionFromPhysicalAspect(area: DtftaPrintArea, phyW: number, phyH: number): DesignableRegion {
  const aspect = phyW / phyH;
  const maxEdge = 280;

  let rw: number;
  let rh: number;

  if (!Number.isFinite(aspect) || aspect <= 0) {
    return { left: 125, top: 125, width: 250, height: 250 };
  }

  if (aspect >= 1) {
    rw = Math.min(maxEdge, 380);
    rh = rw / aspect;
  } else {
    rh = Math.min(maxEdge, 380);
    rw = rh * aspect;
  }

  rw = Math.round(rw * 100) / 100;
  rh = Math.round(rh * 100) / 100;

  const pxVal = Number(area.position_x || 0);
  const pyVal = Number(area.position_y || 0);

  if (isEffectivelyZero(pxVal) && isEffectivelyZero(pyVal)) {
    return {
      left: Math.max(0, (DESIGN_CANVAS_LOGICAL - rw) / 2),
      top: Math.max(0, (DESIGN_CANVAS_LOGICAL - rh) / 2),
      width: rw,
      height: rh,
    };
  }

  const { left, top } = logicalPositionFromPrintArea(area, rw, rh);
  return { left, top, width: rw, height: rh };
}

/**
 * Fabric {@link DesignableRegion}: where artwork is clipped on the mockup (not the physical inch size).
 */
export function getDesignRegionFromPrintArea(area: DtftaPrintArea): DesignableRegion {
  const dw =
    area.design_area_width != null ? Number(area.design_area_width) : NaN;
  const dh =
    area.design_area_height != null ? Number(area.design_area_height) : NaN;

  if (Number.isFinite(dw) && Number.isFinite(dh) && dw > 0 && dh > 0) {
    const hasExplicitDesignPos =
      area.design_position_x != null &&
      area.design_position_y != null &&
      String(area.design_position_x).trim() !== "" &&
      String(area.design_position_y).trim() !== "";

    if (hasExplicitDesignPos) {
      const lx = Number(area.design_position_x);
      const ly = Number(area.design_position_y);
      return {
        left: Number.isFinite(lx) ? lx : 0,
        top: Number.isFinite(ly) ? ly : 0,
        width: dw,
        height: dh,
      };
    }

    const { left, top } = logicalPositionFromPrintArea(area, dw, dh);
    return {
      left,
      top,
      width: dw,
      height: dh,
    };
  }

  const rawW = Number(area.area_width || 250);
  const rawH = Number(area.area_height || 250);
  const safeW = Number.isFinite(rawW) && rawW > 0 ? rawW : 250;
  const safeH = Number.isFinite(rawH) && rawH > 0 ? rawH : 250;

  if (isPhysicalSizeStoredInAreaFields(area)) {
    return designRegionFromPhysicalAspect(area, safeW, safeH);
  }

  const { left, top } = logicalPositionFromPrintArea(area, safeW, safeH);

  return {
    left,
    top,
    width: safeW,
    height: safeH,
  };
}
