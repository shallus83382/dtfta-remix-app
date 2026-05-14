import type { ReactNode } from "react";
import { BlockStack, Card, InlineStack, Text } from "@shopify/polaris";
import { brandPrimaryButtonBg, brandTextOnLightShadow } from "../lib/brand-theme";

type Props = {
  title: string;
  subtitle: string;
  badges?: ReactNode;
  rightSlot?: ReactNode;
  actions?: ReactNode;
  minHeight?: number;
};

const heroParticles = [
  { left: "6%", top: "16%", size: 7, delay: "0s", duration: "3.2s", dx: 12, dy: -14 },
  { left: "14%", top: "72%", size: 5, delay: "0.3s", duration: "3.8s", dx: -10, dy: -12 },
  { left: "24%", top: "36%", size: 6, delay: "0.7s", duration: "3.5s", dx: 14, dy: -9 },
  { left: "34%", top: "20%", size: 8, delay: "0.5s", duration: "4.1s", dx: -12, dy: -16 },
  { left: "42%", top: "74%", size: 6, delay: "1.1s", duration: "3.6s", dx: 11, dy: -10 },
  { left: "53%", top: "28%", size: 7, delay: "0.2s", duration: "3.4s", dx: -14, dy: -8 },
  { left: "62%", top: "64%", size: 5, delay: "1.3s", duration: "3.1s", dx: 9, dy: -12 },
  { left: "70%", top: "22%", size: 6, delay: "0.6s", duration: "4s", dx: -10, dy: -11 },
  { left: "78%", top: "58%", size: 7, delay: "0.9s", duration: "3.3s", dx: 12, dy: -13 },
  { left: "86%", top: "30%", size: 6, delay: "0.4s", duration: "3.7s", dx: -12, dy: -9 },
  { left: "92%", top: "70%", size: 5, delay: "1s", duration: "3.2s", dx: 8, dy: -11 },
] as const;

export default function AppHeroBanner({
  title,
  subtitle,
  badges,
  rightSlot,
  actions,
  minHeight = 170,
}: Props) {
  return (
    <Card padding="0">
      <div
        style={{
          background: brandPrimaryButtonBg,
          borderRadius: 14,
          padding: 30,
          color: "#ffffff",
          position: "relative",
          overflow: "hidden",
          minHeight,
        }}
      >
        <style>
          {`
            @keyframes dtftaHeroFloat {
              0% { transform: translate3d(0, 0, 0) scale(0.85); opacity: 0.24; }
              25% { transform: translate3d(var(--dx), calc(var(--dy) * 0.65), 0) scale(1.08); opacity: 0.72; }
              50% { transform: translate3d(calc(var(--dx) * -0.55), var(--dy), 0) scale(1.2); opacity: 1; }
              75% { transform: translate3d(calc(var(--dx) * 0.4), calc(var(--dy) * -0.45), 0) scale(1.04); opacity: 0.6; }
              100% { transform: translate3d(0, 0, 0) scale(0.85); opacity: 0.24; }
            }
            @keyframes dtftaHeroSweep {
              0% { transform: translateX(-18%); opacity: 0; }
              35% { opacity: 0.26; }
              100% { transform: translateX(118%); opacity: 0; }
            }
            @keyframes dtftaHeroNebula {
              0% { transform: scale(1) rotate(0deg); opacity: 0.18; }
              50% { transform: scale(1.08) rotate(10deg); opacity: 0.3; }
              100% { transform: scale(1) rotate(0deg); opacity: 0.18; }
            }
          `}
        </style>

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 18% 22%, rgba(255,255,255,0.14) 0%, transparent 42%), radial-gradient(circle at 82% 76%, rgba(255,255,255,0.1) 0%, transparent 45%)",
            animation: "dtftaHeroNebula 9.6s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "-20%",
            width: "40%",
            height: "100%",
            background:
              "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0) 100%)",
            animation: "dtftaHeroSweep 3.1s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -90,
            right: -70,
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 72%)",
            animation: "dtftaHeroNebula 4.3s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -110,
            left: -60,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)",
            animation: "dtftaHeroNebula 4.9s ease-in-out infinite",
          }}
        />
        {heroParticles.map((particle, index) => (
          <div
            key={`${particle.left}-${particle.top}-${index}`}
            style={{
              ["--dx" as string]: `${particle.dx}px`,
              ["--dy" as string]: `${particle.dy}px`,
              position: "absolute",
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.35) 68%, rgba(255,255,255,0.08) 100%)",
              boxShadow: "0 0 20px rgba(255,255,255,0.95), 0 0 36px rgba(255,255,255,0.4)",
              animation: `dtftaHeroFloat ${particle.duration} ease-in-out ${particle.delay} infinite`,
              pointerEvents: "none",
            }}
          />
        ))}

        <BlockStack gap="400">
          <BlockStack gap="200">
            <Text as="h1" variant="headingXl" tone="text-inverse">
              <span style={{ color: "#ffffff", textShadow: brandTextOnLightShadow }}>
                {title}
              </span>
            </Text>
            <Text as="p" tone="text-inverse" variant="bodyMd">
              <span style={{ color: "#ffffff", fontWeight: 500 }}>{subtitle}</span>
            </Text>
          </BlockStack>

          {(badges || rightSlot) && (
            <InlineStack align="space-between" blockAlign="center" gap="300">
              <InlineStack gap="200" blockAlign="center">
                {badges}
              </InlineStack>
              {rightSlot ?? <div />}
            </InlineStack>
          )}

          {actions ? <InlineStack gap="200">{actions}</InlineStack> : null}
        </BlockStack>
      </div>
    </Card>
  );
}
