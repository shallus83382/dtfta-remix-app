type BuildDtftaLineItemArgs = {
    templateId: string | number;
    productKey: string;
    garmentBrand: string;
    garmentStyle: string;
    color: string;
    size: string;
    printPlan?: string;
  };
  
  export function buildDtftaLineItem(input: BuildDtftaLineItemArgs) {
    return {
      dtfta_type: "APPAREL_POD",
      dtfta_template_id: String(input.templateId),
      dtfta_product_key: input.productKey,
      dtfta_garment_brand: input.garmentBrand,
      dtfta_garment_style: input.garmentStyle,
      dtfta_garment_color: input.color,
      dtfta_garment_size: input.size,
      dtfta_print_plan: input.printPlan || "",
    };
  }