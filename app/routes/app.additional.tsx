import { Badge, BlockStack, Card, InlineStack, List, Page, Text } from "@shopify/polaris";
import AppHeroBanner from "../common/AppHeroBanner";
import { brandPalette } from "../lib/brand-theme";

export default function AdditionalPage() {
  const surfaceStyle = {
    borderRadius: 14,
    border: "1px solid #dbe3ec",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
    padding: 18,
    boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
  } as const;

  const sidebarSurfaceStyle = {
    position: "relative" as const,
    overflow: "hidden" as const,
    borderRadius: 16,
    border: "1px solid rgba(71,176,161,0.31)",
    background: "linear-gradient(145deg, #ffffff 0%, rgba(71,176,161,0.10) 100%)",
    padding: 16,
    boxShadow: "0 14px 30px rgba(15,23,42,0.1)",
  } as const;

  return (
    <Page fullWidth>
      <div style={{ maxWidth: 1420, margin: "0 auto", width: "100%" }}>
        <BlockStack gap="500">
          <AppHeroBanner
            title="Additional Page"
            subtitle="This page is now aligned with the DTFTA design system used across dashboard, settings, and onboarding."
            badges={<Badge tone="info">Design Updated</Badge>}
          />

          <InlineStack align="start" gap="400" blockAlign="start">
            <div style={{ flex: "1", minWidth: 0, maxWidth: 980 }}>
              <Card>
                <BlockStack gap="500">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Additional Module Overview
                    </Text>
                    <Badge tone="success">Ready</Badge>
                  </InlineStack>

                  <div style={surfaceStyle}>
                    <BlockStack gap="300">
                      <Text as="p" variant="bodyMd">
                        This module now uses the same layout language as the rest of the app:
                        elevated surfaces, readable spacing, and consistent typography.
                      </Text>
                      <List type="bullet">
                        <List.Item>Consistent hero and page width</List.Item>
                        <List.Item>Shared visual depth and card treatment</List.Item>
                        <List.Item>Sidebar accent style matching other routes</List.Item>
                      </List>
                    </BlockStack>
                  </div>
                </BlockStack>
              </Card>
            </div>

            <div style={{ minWidth: "280px", maxWidth: "320px", flexShrink: 0 }}>
              <div style={sidebarSurfaceStyle}>
                <div
                  style={{
                    position: "absolute",
                    top: -30,
                    right: -22,
                    width: 96,
                    height: 96,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(71,176,161,0.21) 0%, rgba(71,176,161,0) 72%)",
                    pointerEvents: "none",
                  }}
                />
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Style Guide
                    </Text>
                    <Badge tone="info">Reference</Badge>
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Keep new pages aligned with the existing UI system for visual consistency.
                  </Text>
                  <div
                    style={{
                      borderRadius: 10,
                      background: `linear-gradient(135deg, ${brandPalette.orange} 0%, ${brandPalette.pink} 100%)`,
                      color: "#ffffff",
                      padding: "10px 12px",
                      boxShadow: "0 10px 20px rgba(246,98,110,0.22)",
                    }}
                  >
                    <Text as="p" variant="bodySm" fontWeight="semibold">
                      Use brand gradient for key CTA actions
                    </Text>
                  </div>
                </BlockStack>
              </div>
            </div>
          </InlineStack>
          <div style={{ marginBottom: 32 }} />
        </BlockStack>
      </div>
    </Page>
  );
}
