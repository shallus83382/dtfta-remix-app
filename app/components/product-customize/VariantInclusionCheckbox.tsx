type Props = {
  checked: boolean;
  label: string;
  onChange: () => void;
};

export default function VariantInclusionCheckbox({
  checked,
  label,
  onChange,
}: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={onChange}
      style={{
        position: "absolute",
        top: -3,
        left: -3,
        boxSizing: "border-box",
        width: 10,
        height: 10,
        minWidth: 10,
        minHeight: 10,
        maxWidth: 10,
        maxHeight: 10,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        borderRadius: "50%",
        border: "1px solid #ffffff",
        background: checked ? "#0f766e" : "#ffffff",
        boxShadow: "0 0 0 1px #64748b",
        color: "#ffffff",
        fontSize: 7,
        lineHeight: 1,
        fontWeight: 700,
        cursor: "pointer",
        zIndex: 1,
      }}
    >
      {checked ? "✓" : null}
    </button>
  );
}
