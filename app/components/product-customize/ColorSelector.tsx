import { brandColors, brandPalette } from "../../lib/brand-theme";
import VariantInclusionCheckbox from "./VariantInclusionCheckbox";

type ColorOption = {
  colorCode: string;
  colorName: string;
  /** Swatch from CRM `color_mockups` when available */
  hex?: string;
};

type Props = {
  colors: ColorOption[];
  selectedColor: string;
  selectedColors?: string[];
  artworkColors?: string[];
  onChange: (colorCode: string, additive?: boolean) => void;
  onToggleArtworkColor?: (colorCode: string) => void;
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
  selectedColors = [selectedColor],
  artworkColors = [selectedColor],
  onChange,
  onToggleArtworkColor,
}: Props) {
  if (!colors.length) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
      {colors.map((color) => {
        const bg = resolveColorValue(color);
        const isActive = selectedColor === color.colorCode;
        const isPriceSelected = selectedColors.includes(color.colorCode);
        const isArtworkSelected = artworkColors.includes(color.colorCode);

        return (
          <div
            key={color.colorCode}
            style={{ position: "relative", width: 30, height: 30 }}
          >
            <button
              type="button"
              aria-label={color.colorName}
              aria-pressed={isPriceSelected}
              title={`${color.colorName} (Ctrl/Cmd-click to select for bulk pricing)`}
              onClick={(event) =>
                onChange(
                  color.colorCode,
                  event.ctrlKey || event.metaKey
                )
              }
              style={{
                borderRadius: 4,
                border: isActive
                  ? `2px solid ${brandPalette.teal}`
                  : isPriceSelected
                    ? "2px solid #f97316"
                    : `1px solid ${brandColors.surfaceBorder}`,
                width: 30,
                height: 30,
                padding: 0,
                cursor: "pointer",
                transition: "all 180ms ease",
                background: bg,
                boxShadow: isActive
                  ? "0 0 0 2px rgba(37,99,235,0.24)"
                  : isPriceSelected
                    ? "0 0 0 2px rgba(249,115,22,0.2)"
                    : "0 1px 2px rgba(15,23,42,0.12)",
              }}
            />
            {onToggleArtworkColor ? (
              <VariantInclusionCheckbox
                checked={isArtworkSelected}
                label={`Include ${color.colorName} when adding to store`}
                onChange={() => onToggleArtworkColor(color.colorCode)}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}