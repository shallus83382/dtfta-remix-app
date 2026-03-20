import type { DtftaPrintArea, DtftaVariant } from "../dtfta-products.server";
import type { DesignableRegion } from "../../components/DesignCanvas";

export const DEFAULT_DESIGN_REGION: DesignableRegion = {
  left: 125,
  top: 125,
  width: 250,
  height: 250,
};

export function normalizePlacementKey(value: string): string {
  return value.trim().toLowerCase();
}

export function getRegionFromPrintArea(area?: DtftaPrintArea): DesignableRegion {
  if (!area) return DEFAULT_DESIGN_REGION;

  return {
    left: Number(area.position_x || 0),
    top: Number(area.position_y || 0),
    width: Number(area.area_width || 250),
    height: Number(area.area_height || 250),
  };
}

export function normalizeApiVariants(input: unknown): DtftaVariant[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item): DtftaVariant | null => {
      if (!item || typeof item !== "object") return null;

      const variant = item as Record<string, unknown>;

      const colorCode =
        typeof variant.colorCode === "string" ? variant.colorCode : "";
      const colorName =
        typeof variant.colorName === "string" ? variant.colorName : "";
      const size = typeof variant.size === "string" ? variant.size : "";
      const sku = typeof variant.sku === "string" ? variant.sku : "";

      if (!colorCode || !colorName || !size || !sku) return null;

      const normalized: DtftaVariant = {
        colorCode,
        colorName,
        size,
        sku,
        is_active:
          typeof variant.is_active === "boolean" ? variant.is_active : true,
      };

      if (typeof variant.id === "number") {
        normalized.id = variant.id;
      }

      return normalized;
    })
    .filter((item): item is DtftaVariant => item !== null);
}