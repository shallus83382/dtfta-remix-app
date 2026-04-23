import { Badge, BlockStack, Card, Page, Text } from "@shopify/polaris";
import AppHeroBanner from "../common/AppHeroBanner";

export default function AdditionalPage() {
  return (
    <Page fullWidth>
      <div style={{ maxWidth: 1420, margin: "0 auto", width: "100%" }}>
      <BlockStack gap="500">
        <AppHeroBanner
          title="Additional Page"
          subtitle="This page is now aligned with the new DTFTA professional UI system."
          badges={<Badge tone="info">Design Updated</Badge>}
        />
      </BlockStack>
      </div>
    </Page>
  );
}
