import { InlineStack } from "@shopify/polaris";

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
        <button
          type="button"
          key={color.colorCode}
          onClick={() => onChange(color.colorCode)}
          style={{
            borderRadius: 10,
            border:
              selectedColor === color.colorCode
                ? "1px solid transparent"
                : "1px solid #cbd5e1",
            height: 34,
            padding: "0 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 180ms ease",
            background:
              selectedColor === color.colorCode
                ? "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)"
                : "#f8fafc",
            color: selectedColor === color.colorCode ? "#ffffff" : "#0f172a",
            boxShadow:
              selectedColor === color.colorCode
                ? "0 8px 18px rgba(29,78,216,0.28)"
                : "none",
          }}
        >
          {color.colorName}
        </button>
      ))}
    </InlineStack>
  );
}