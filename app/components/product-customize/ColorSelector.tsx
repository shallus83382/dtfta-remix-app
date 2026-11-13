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
  const apiHex = color.hex?.trim() ?? "";
  if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(apiHex)) {
    return apiHex;
  }
  if (/^[0-9a-fA-F]{6}$/.test(apiHex)) {
    return `#${apiHex}`;
  }
  return NEUTRAL_SWATCH;
}

export default function ColorSelector({
  colors,
  selectedColor,
  onChange,
}: Props) {
  if (!colors.length) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
      {colors.map((color) => {
        const bg = resolveColorValue(color);
        const isSelected = selectedColor === color.colorCode;

        return (
          <button
            type="button"
            key={color.colorCode}
            aria-label={color.colorName}
            title={color.colorName}
            onClick={() => onChange(color.colorCode)}
            style={{
              borderRadius: 4,
              border: isSelected
                ? `2px solid ${brandPalette.teal}`
                : `1px solid ${brandColors.surfaceBorder}`,
              width: 30,
              height: 30,
              padding: 0,
              cursor: "pointer",
              transition: "all 180ms ease",
              background: bg,
              boxShadow: isSelected
                ? "0 0 0 2px rgba(37,99,235,0.24)"
                : "0 1px 2px rgba(15,23,42,0.12)",
            }}
          />
        );
      })}
    </div>
  );
}