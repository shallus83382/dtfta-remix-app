import { InlineStack, Button } from "@shopify/polaris";

type ColorOption = {
  colorCode: string;
  colorName: string;
};

type Props = {
  colors: ColorOption[];
  selectedColor: string;
  onChange: (colorCode: string) => void;
};

export default function ColorSelector({
  colors,
  selectedColor,
  onChange,
}: Props) {
  if (!colors.length) return null;

  return (
    <InlineStack gap="200" blockAlign="center">
      {colors.map((color) => (
        <Button
          key={color.colorCode}
          variant={selectedColor === color.colorCode ? "primary" : "secondary"}
          onClick={() => onChange(color.colorCode)}
        >
          {color.colorName}
        </Button>
      ))}
    </InlineStack>
  );
}