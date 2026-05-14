import { InlineStack } from "@shopify/polaris";
import { brandColors, brandPalette } from "../../lib/brand-theme";

type ColorOption = {
  colorCode: string;
  colorName: string;
};

type Props = {
  colors: ColorOption[];
  selectedColor: string;
  onChange: (colorCode: string) => void;
};

function resolveColorValue(color: ColorOption) {
  const normalize = (value: string) => value.trim().toLowerCase();
  const codeRaw = color.colorCode?.trim() ?? "";
  const nameRaw = color.colorName?.trim() ?? "";
  const candidates = [codeRaw, nameRaw].filter(Boolean);

  for (const candidate of candidates) {
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(candidate)) {
      return candidate;
    }

    if (/^[0-9a-fA-F]{6}$/.test(candidate)) {
      return `#${candidate}`;
    }
  }

  const lookup = `${normalize(codeRaw)} ${normalize(nameRaw)}`.trim();

  if (lookup.includes("black")) return "#111111";
  if (lookup.includes("navy")) return "#1e3a8a";
  if (lookup.includes("red")) return "#ff0000";
  if (lookup.includes("white")) return "#f8fafc";
  if (lookup.includes("blue")) return "#2563eb";
  if (lookup.includes("green")) return "#16a34a";
  if (lookup.includes("yellow")) return "#eab308";
  if (lookup.includes("orange")) return "#f97316";
  if (lookup.includes("pink")) return "#ec4899";
  if (lookup.includes("purple")) return "#9333ea";
  if (lookup.includes("clay")) return "#915728";
  if (lookup.includes("antique_gold")) return "#f69532";
  if (lookup.includes("banana_cream")) return "#fedd9d";
  if (lookup.includes("blue_jean")) return "#5a748b";
  if (lookup.includes("bone")) return "#e6e3dd";
  if (lookup.includes("cardinal")) return "#88303a";
  if (lookup.includes("classic_orange")) return "#f0542b";
  if (lookup.includes("cool_blue")) return "#284a81";
  if (lookup.includes("cream")) return "#e9e0cf";
  if (lookup.includes("dark_chocholate")) return "#392e2d";
  if (lookup.includes("desert_pink")) return "#cb9b8d";
  if (lookup.includes("forest_green")) return "#29484b";
  if (lookup.includes("gold")) return "#f69e00";
  if (lookup.includes("graphite_black")) return "#3a393e";
  if (lookup.includes("heather_gray")) return "#bab5b6";
  if (lookup.includes("heavy_metal")) return "#605a4f";
  if (lookup.includes("indigo")) return "#5a6568";
  if (lookup.includes("kelly_green")) return "#089d4f";
  if (lookup.includes("light_blue")) return "#b2cad0";
  if (lookup.includes("light_grey")) return "#b0b4b7";
  if (lookup.includes("light_olive")) return "#777b63";
  if (lookup.includes("light_pink")) return "#f1b9c1";
  if (lookup.includes("maroon")) return "#572831";
  if (lookup.includes("mauve")) return "#915655";
  if (lookup.includes("midnight_navy")) return "#282e41";
  if (lookup.includes("military_green")) return "#676344";
  if (lookup.includes("natural")) return "#efe6d4";
  if (lookup.includes("oatmeaL")) return "#d7d5c8";
  if (lookup.includes("oxblood")) return "#3a2a2b";
  if (lookup.includes("periblue")) return "#8499cb";
  if (lookup.includes("purple_rush")) return "#604084";
  if (lookup.includes("royal")) return "#1e5194";
  if (lookup.includes("royal_pine")) return "#3d5956";
  if (lookup.includes("sand")) return "#ccc7bb";
  if (lookup.includes("shiitake")) return "#6a5d59";
  if (lookup.includes("stonewash_denim")) return "#a2b4c5";
  if (lookup.includes("tahiti_blue")) return "#a2b4c5";
  if (lookup.includes("tan")) return "#b29c88";
  if (lookup.includes("teal")) return "#019595";
  if (lookup.includes("turquoise")) return "#0a8bb1";
  if (lookup.includes("warm_grey")) return "#8f8780";
  if (lookup.includes("watermelon")) return "#fa5077";
  if (lookup.includes("hot_pink")) return "#fa5077";

  if (lookup.includes("gray") || lookup.includes("grey")) return "#6b7280";
  if (lookup.includes("beige") || lookup.includes("cream")) return "#d6c8a6";
  if (lookup.includes("brown")) return "#92400e";

  const firstToken = normalize(codeRaw || nameRaw).split(/[\s/_-]+/).find(Boolean);
  if (firstToken && /^[a-zA-Z]+$/.test(firstToken)) {
    return firstToken;
  }

  return "#e2e8f0";
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