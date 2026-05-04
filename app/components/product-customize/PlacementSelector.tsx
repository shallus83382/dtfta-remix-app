import { InlineStack } from "@shopify/polaris";
import type { DtftaPrintArea } from "../../lib/dtfta-products.server";
import { normalizePlacementKey } from "../../lib/product-customize/helpers";
import {
  brandAccentSelectionGradient,
  brandColors,
} from "../../lib/brand-theme";

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
          <button
            type="button"
            key={area.id}
            onClick={() => onChange(key)}
            style={{
              borderRadius: 10,
              border: placement === key ? "1px solid transparent" : "1px solid #cbd5e1",
              height: 34,
              padding: "0 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 180ms ease",
              background:
                placement === key ? brandAccentSelectionGradient : brandColors.canvas,
              color: placement === key ? "#ffffff" : brandColors.text,
              boxShadow:
                placement === key
                  ? "0 8px 18px rgba(255, 106, 0, 0.32)"
                  : "none",
            }}
          >
            {area.title}
          </button>
        );
      })}
    </InlineStack>
  );
}