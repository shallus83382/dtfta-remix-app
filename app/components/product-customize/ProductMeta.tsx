import { InlineStack, Badge, Text } from "@shopify/polaris";

type Props = {
  product: {
    brand?: string;
    colors?: string[];
    sizes?: string[];
  };
  selectedColorName?: string;
};

export default function ProductMeta({ product, selectedColorName }: Props) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid #dbe7ff",
        background:
          "linear-gradient(135deg, rgba(239,246,255,0.92) 0%, rgba(255,255,255,1) 100%)",
        padding: 12,
      }}
    >
      <InlineStack gap="200" blockAlign="center">
        {product.brand ? <Badge>{product.brand}</Badge> : null}
        <Badge tone="info">Customizer</Badge>

        {selectedColorName ? (
          <Text as="span" variant="bodyMd">
            Selected color: {selectedColorName}
          </Text>
        ) : product.colors?.length ? (
          <Text as="span" variant="bodyMd">
            Colors: {product.colors.join(", ")}
          </Text>
        ) : null}

        {product.sizes?.length ? (
          <Text as="span" variant="bodyMd">
            Sizes: {product.sizes.join(", ")}
          </Text>
        ) : null}
      </InlineStack>

      <div style={{ marginTop: 8 }}>
        <Text as="p" variant="bodyMd">
          Choose color and placement to customize. Each placement loads its own base image from
          the API for accurate print positioning.
        </Text>
      </div>
    </div>
  );
}