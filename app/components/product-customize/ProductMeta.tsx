import { InlineStack, Badge, Text } from "@shopify/polaris";

type Props = {
  product: {
    brand?: string;
    colors?: string[];
    sizes?: string[];
  };
};

export default function ProductMeta({ product }: Props) {
  return (
    <>
      <InlineStack gap="200" blockAlign="center">
        {product.brand ? <Badge>{product.brand}</Badge> : null}

        {product.colors?.length ? (
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

      <Text as="p" variant="bodyMd">
        Choose a print area below. Each print area uses its own background image
        from the API.
      </Text>
    </>
  );
}