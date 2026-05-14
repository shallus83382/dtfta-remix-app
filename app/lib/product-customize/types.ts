import type { Product } from "../../types";
import type { DtftaPrintArea, DtftaVariant } from "../dtfta-products.server";
import type { DesignableRegion } from "../../components/DesignCanvas";

export type ProductWithApiFields = Product & {
  productKey?: string;
  colors?: string[];
  sizes?: string[];
  print_areas?: DtftaPrintArea[];
  variants?: DtftaVariant[];
  status?: string;
  description?: string | null;
  images?: string[];
  brandCode?: string;
  style?: string;
  created_at?: string;
  updated_at?: string;
};

export type PrintableAreaPayload = {
  id?: number;
  title: string;
  placement: string;
  artwork: string;
  printSize: {
    width: number;
    height: number;
  };
  designableRegion: DesignableRegion;
  unit?: string | null;
  backgroundImage?: string | null;
  editorState?: unknown;
};

/** Serialized design-layer metrics for API storage (matches editor layer summaries; preview omitted for large data URLs). */
export type ArtworkLayerMeta = {
  layerId: string;
  kind: "image" | "text" | "vector" | "other";
  label: string;
  /** Product print-area unit (e.g. in, cm) for interpreting numeric fields */
  unit?: string;
  left: number;
  top: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  rotation: number;
  centerXMin: number;
  centerXMax: number;
  centerYMin: number;
  centerYMax: number;
  /** Library asset id when this layer was inserted from the artwork library */
  libraryArtworkId?: string;
  /** Same id as {@link libraryArtworkId}; sent for APIs that expect `artworkId` */
  artworkId?: string;
  previewUrl?: string | null;
};

export type ArtworkUrlPayload = {
  colorCode: string;
  placement: string;
  artworkUrl: string;
  customArtworkUrl?: string;
  /** Stable id from `/app/api/artworks` when the merchant picked a library asset */
  libraryArtworkId?: string;
  /** Per-layer placement and size in print-area units, keyed by layer id */
  layersMeta?: ArtworkLayerMeta[];
  designableRegion: DesignableRegion;
  printSize: {
    width: number;
    height: number;
  };
};

export type CustomizeSubmitResult =
  | {
      ok: true;
      productId: string;
      handle?: string;
    }
  | {
      ok: false;
      error: string;
    };

export type PlacementPrintSize = {
  width: number;
  height: number;
};

export type PlacementPrintSizeMap = Record<string, PlacementPrintSize>;
export type PlacementRegionMap = Record<string, DesignableRegion>;
export type PlacementCanvasStateMap = Record<string, unknown>;
