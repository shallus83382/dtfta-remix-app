import { Badge, BlockStack, Card, Page, Text } from "@shopify/polaris";

export default function AdditionalPage() {
  return (
    <Page title="Additional" fullWidth>
      <BlockStack gap="500">
        <Card>
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(30,41,59,0.96) 0%, rgba(37,99,235,0.9) 55%, rgba(14,116,144,0.88) 100%)",
              borderRadius: 12,
              padding: 24,
              color: "#ffffff",
            }}
          >
            <BlockStack gap="200">
              <Text as="h2" variant="headingLg" tone="text-inverse">
                Additional Page
              </Text>
              <Text as="p" tone="text-inverse">
                This page is now aligned with the new DTFTA professional UI system.
              </Text>
              <div>
                <Badge tone="info">Design Updated</Badge>
              </div>
            </BlockStack>
          </div>
        </Card>
      </BlockStack>
    </Page>
  );
}
