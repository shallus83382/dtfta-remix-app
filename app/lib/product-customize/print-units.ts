/**
 * Formatting helpers for measurement labels. **Physical print width/height** shown in the customizer come
 * from {@link getPhysicalPrintSize} (see `print-area-dimensions.ts`): canvas clipping still uses raw
 * `area_width`/`area_height` as design coordinates; physical sizes may be derived when `unit` is in/mm/cm.
 */

/** Normalizes catalog/API variants to a short label for display (e.g. `inch` → `in`). Unknown values keep their trimmed casing. */
export function normalizePrintUnitDisplay(unit: string | undefined | null): string {
  const raw = (unit ?? "").trim();
  const u = raw.toLowerCase();
  if (!u) return "";
  if (u === "inch" || u === "inches" || u === "in") return "in";
  if (
    u === "millimeter" ||
    u === "millimetre" ||
    u === "millimeters" ||
    u === "millimetres" ||
    u === "mm"
  ) {
    return "mm";
  }
  if (
    u === "centimeter" ||
    u === "centimetre" ||
    u === "centimeters" ||
    u === "centimetres" ||
    u === "cm"
  ) {
    return "cm";
  }
  if (u === "pixel" || u === "pixels" || u === "px") return "px";
  if (u === "point" || u === "points" || u === "pt") return "pt";
  if (u === "meter" || u === "meters" || u === "metre" || u === "metres" || u === "m") return "m";
  return raw;
}

/**
 * Kind of length unit from the backend (`unit` field). Used for conversion — values are never “fixed”
 * to one display unit; everything keys off whatever the API sends.
 */
export type PrintAreaUnitKind =
  | "px"
  | "in"
  | "mm"
  | "cm"
  | "m"
  | "pt"
  | "unknown";

/** Maps backend `unit` strings (any casing/aliases) to a stable kind for branching. */
export function classifyPrintAreaUnit(unit: string | undefined | null): PrintAreaUnitKind {
  const n = normalizePrintUnitDisplay(unit).toLowerCase();
  if (!n) return "unknown";
  if (n === "px") return "px";
  if (n === "in") return "in";
  if (n === "mm") return "mm";
  if (n === "cm") return "cm";
  if (n === "m") return "m";
  if (n === "pt") return "pt";
  return "unknown";
}

/**
 * Converts a physical span expressed in **inches** into the backend’s `unit` (cm, mm, m, in).
 * Used only for default reference spans when the API does not send `position_reference_*`.
 * For `px` / `pt` / `unknown`, returns the inch values unchanged (callers should not use this for px positions).
 */
export function physicalSpanInchesToBackendUnit(
  widthInches: number,
  heightInches: number,
  unitFromBackend: string | undefined | null
): { width: number; height: number } {
  const kind = classifyPrintAreaUnit(unitFromBackend);
  switch (kind) {
    case "mm":
      return { width: widthInches * 25.4, height: heightInches * 25.4 };
    case "cm":
      return { width: widthInches * 2.54, height: heightInches * 2.54 };
    case "m":
      return { width: widthInches * 0.0254, height: heightInches * 0.0254 };
    case "in":
      return { width: widthInches, height: heightInches };
    default:
      return { width: widthInches, height: heightInches };
  }
}

function decimalsForNormalizedUnit(normalizedLabel: string): number {
  switch (normalizedLabel) {
    case "in":
      return 3;
    case "mm":
      return 2;
    case "cm":
      return 3;
    case "px":
      return 1;
    case "pt":
      return 1;
    case "m":
      return 4;
    default:
      return 3;
  }
}

function trimFixedDecimalString(value: number, maxDecimals: number): string {
  let s = value.toFixed(maxDecimals);
  if (s.includes(".")) {
    s = s.replace(/0+$/, "").replace(/\.$/, "");
  }
  return s || "0";
}

/**
 * Formats a measurement for UI. Precision depends on the **product print-area unit** (`unitFromProduct`),
 * not a fixed preference for inches.
 */
export function formatPrintMeasurement(
  value: number,
  unitFromProduct: string | undefined | null
): string {
  if (!Number.isFinite(value)) return "—";

  const normalized = normalizePrintUnitDisplay(unitFromProduct);
  const decimals = decimalsForNormalizedUnit(normalized);
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return trimFixedDecimalString(rounded, decimals);
}
