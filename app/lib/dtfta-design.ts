/**
 * Design export and placement types for DTFTA product customizer.
 * Supports dynamic placement keys while remaining compatible with front/back.
 */

export type PlacementKey = string;

export interface PlacementDimensions {
  width: number;
  height: number;
}

export interface DesignExport {
  printPlan: string;
  artworkUrls: Partial<Record<PlacementKey, string>>;
}

/** Build print plan string e.g. FRONT:12x16|BACK:12x16 */
export function buildPrintPlan(
  dimensions: Partial<Record<PlacementKey, PlacementDimensions>>
): string {
  const parts: string[] = [];

  for (const [placement, value] of Object.entries(dimensions)) {
    if (!value) continue;
    parts.push(`${placement.toUpperCase()}:${value.width}x${value.height}`);
  }

  return parts.join("|") || "";
}