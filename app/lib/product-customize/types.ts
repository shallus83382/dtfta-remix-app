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

export type VariantArtworkPayload = {
  variantId: string;
  variantSku: string;
  colorCode: string;
  colorName: string;
  printPlan: string;
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
