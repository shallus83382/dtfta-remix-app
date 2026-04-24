export const brandPalette = {
  blue: '#3498db',
  green: '#2ecc71',
  pink: '#ff4da6',
  orange: '#ff7a00',
  teal: '#47b0a1',
  coral: '#f6626e',
  violet: '#7f73ef',
  magenta: '#ee5499',
  sky: '#1f97dd',
} as const;

/** Primary CTA fill used across onboarding, settings, orders, and dashboard. */
export const brandPrimaryGradient = `linear-gradient(135deg, ${brandPalette.orange} 0%, ${brandPalette.pink} 100%)`;

/** Drop shadow tuned to the warm primary gradient (coral tint). */
export const brandPrimaryCtaShadow = '0 8px 18px rgba(246, 98, 110, 0.28)';
