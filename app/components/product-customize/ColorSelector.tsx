import { InlineStack } from "@shopify/polaris";
import { brandColors, brandPalette } from "../../lib/brand-theme";

type ColorOption = {
  colorCode: string;
  colorName: string;
  /** Swatch from CRM `color_mockups` when available */
  hex?: string;
};

type Props = {
  colors: ColorOption[];
  selectedColor: string;
  onChange: (colorCode: string) => void;
};

const NEUTRAL_SWATCH = "#e2e8f0";

function resolveColorValue(color: ColorOption) {
  const candidates = [
    color.hex?.trim() ?? "",
    color.colorCode?.trim() ?? "",
    color.colorName?.trim() ?? "",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(candidate)) {
      return candidate;
    }
    if (/^[0-9a-fA-F]{6}$/.test(candidate)) {
      return `#${candidate}`;
    }
  }

  return NEUTRAL_SWATCH;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const safe =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;

  const value = Number.parseInt(safe, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function textColorForBackground(bg: string) {
  if (!bg.startsWith("#")) return "#ffffff";
  const { r, g, b } = hexToRgb(bg);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65 ? brandColors.text : "#ffffff";
}

export default function ColorSelector({
  colors,
  selectedColor,
  onChange,
}: Props) {
  if (!colors.length) return null;

  return (
    <InlineStack gap="200" blockAlign="center">
      {colors.map((color) => {
        const bg = resolveColorValue(color);
        const textColor = textColorForBackground(bg);
        const isSelected = selectedColor === color.colorCode;

        return (
          <button
            type="button"
            key={color.colorCode}
            onClick={() => onChange(color.colorCode)}
            style={{
              borderRadius: 10,
              border: isSelected
              ? `1px solid ${brandPalette.teal}`
              : `1px solid ${brandColors.surfaceBorder}`,
              height: 34,
              padding: "0 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 180ms ease",
              background: bg,
              color: textColor,
              boxShadow: isSelected
                ? "0 0 0 2px rgba(37,99,235,0.28), 0 8px 18px rgba(15,23,42,0.18)"
                : "none",
            }}
          >
            {color.colorName}
          </button>
        );
      })}
    </InlineStack>
  );
}