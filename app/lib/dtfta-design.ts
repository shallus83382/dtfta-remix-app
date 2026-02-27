/**
 * Design export and placement types for DTFTA product customizer.
 * Aligned with Developer Guide: dtfta_print_plan (e.g. FRONT:12x16|BACK:12x16), artwork URL(s) per placement.
 */

export type PlacementKey = "front" | "back";

export const PLACEMENT_LABELS: Record<PlacementKey, string> = {
  front: "Front",
  back: "Back",
};

export interface DesignExport {
  printPlan: string;
  artworkUrls: Partial<Record<PlacementKey, string>>;
}

/** Build print plan string e.g. FRONT:12x16|BACK:12x16 */
export function buildPrintPlan(dimensions: Partial<Record<PlacementKey, { width: number; height: number }>>): string {
  const parts: string[] = [];
  if (dimensions.front) {
    parts.push(`FRONT:${dimensions.front.width}x${dimensions.front.height}`);
  }
  if (dimensions.back) {
    parts.push(`BACK:${dimensions.back.width}x${dimensions.back.height}`);
  }
  return parts.join("|") || "";
}
