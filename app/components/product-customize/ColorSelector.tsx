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
  return luminance > 0.65 ? "#0f172a" : "#ffffff";
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
              border: isSelected ? "1px solid #1d4ed8" : "1px solid rgba(15,23,42,0.14)",
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