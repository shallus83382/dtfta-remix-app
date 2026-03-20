import { InlineStack, Button } from "@shopify/polaris";
import type { DtftaPrintArea } from "../../lib/dtfta-products.server";
import { normalizePlacementKey } from "../../lib/product-customize/helpers";

type Props = {
  printAreas: DtftaPrintArea[];
  placement: string;
  onChange: (placement: string) => void;
};

export default function PlacementSelector({
  printAreas,
  placement,
  onChange,
}: Props) {
  return (
    <InlineStack gap="200" blockAlign="center">
      {printAreas.map((area) => {
        const key = normalizePlacementKey(area.title);

        return (
          <Button
            key={area.id}
            variant={placement === key ? "primary" : "secondary"}
            onClick={() => onChange(key)}
          >
            {area.title}
          </Button>
        );
      })}
    </InlineStack>
  );
}