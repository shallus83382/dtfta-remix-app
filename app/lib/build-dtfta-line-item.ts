type BuildDtftaLineItemArgs = {
  templateId: string | number;
  productKey: string;
  garmentBrand: string;
  garmentStyle: string;
  color: string;
  size: string;
  printPlan?: string;
  artworksByPlacement?: Record<
    string,
    {
      id?: string | number;
      title?: string;
      artwork_url?: string;
      custom_product_variant_id?: string | number | null;
      meta?: Record<string, unknown> | null;
    }
  >;
};

export function buildDtftaLineItem(input: BuildDtftaLineItemArgs) {
  const base = {
    _dtfta_type: "APPAREL_POD",
    _dtfta_template_id: String(input.templateId),
    _dtfta_product_key: input.productKey,
    _dtfta_garment_brand: input.garmentBrand,
    _dtfta_garment_style: input.garmentStyle,
    _dtfta_garment_color: input.color,
    _dtfta_garment_size: input.size,
    _dtfta_print_plan: input.printPlan || "",
  };

  const artworkProps = Object.entries(input.artworksByPlacement || {}).reduce(
    (acc, [placement, artwork]) => {
      if (!artwork) return acc;

      const safePlacement = placement
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

      if (!safePlacement) return acc;

      // if (artwork.id != null) {
      //   acc[`dtfta_artwork_${safePlacement}`] = String(artwork.id);
      // }

      if (artwork.artwork_url) {
        acc[`_dtfta_artwork_${safePlacement}_url`] = String(artwork.artwork_url);
      }

      // if (artwork.title) {
      //   acc[`dtfta_artwork_${safePlacement}_title`] = String(artwork.title);
      // }

      return acc;
    },
    {} as Record<string, string>,
  );

  return {
    ...base,
    ...artworkProps,
  };
}