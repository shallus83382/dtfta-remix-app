import { useCallback, useEffect, useState } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useRevalidator } from "react-router";
import {
  Badge,
  BlockStack,
  Card,
  InlineStack,
  Page,
  Text,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import AppHeroBanner from "../common/AppHeroBanner";
import SquareCardForm from "../components/wallet/SquareCardForm";
import type { WalletCard } from "../types/wallet";
import { brandColors } from "../lib/brand-theme";

type LoaderData = {
  shop: string;
  squareApplicationId: string;
  squareLocationId: string;
  squareEnvironment: "sandbox" | "production";
  squareConfigured: boolean;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const squareApplicationId = process.env.SQUARE_APPLICATION_ID || "";
  const squareLocationId = process.env.SQUARE_LOCATION_ID || "";
  const envRaw = (process.env.SQUARE_ENVIRONMENT || "sandbox").toLowerCase();
  const squareEnvironment: "sandbox" | "production" =
    envRaw === "production" ? "production" : "sandbox";

  return {
    shop: session.shop,
    squareApplicationId,
    squareLocationId,
    squareEnvironment,
    squareConfigured: Boolean(squareApplicationId && squareLocationId),
  } satisfies LoaderData;
};

function formatExpiry(month: number, year: number) {
  const m = String(month).padStart(2, "0");
  const y = String(year).slice(-2);
  return `${m}/${y}`;
}

export default function WalletPage() {
  const loaderData = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const [cards, setCards] = useState<WalletCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardsError, setCardsError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const loadCards = useCallback(async () => {
    setCardsLoading(true);
    setCardsError("");
    try {
      const res = await fetch("/app/api/wallet-cards");
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof payload?.error === "string" ? payload.error : "Failed to load saved cards.",
        );
      }
      const list = Array.isArray(payload?.cards) ? payload.cards : [];
      setCards(
        list.map((c: Record<string, unknown>) => ({
          id: String(c.id ?? ""),
          brand: String(c.brand ?? "Card"),
          last4: String(c.last4 ?? "****"),
          expMonth: Number(c.expMonth ?? c.exp_month ?? 0),
          expYear: Number(c.expYear ?? c.exp_year ?? 0),
          isDefault: Boolean(c.isDefault ?? c.is_default),
        })),
      );
    } catch (e) {
      setCardsError(e instanceof Error ? e.message : "Failed to load saved cards.");
      setCards([]);
    } finally {
      setCardsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  const handleCardSaved = useCallback(() => {
    setShowAddForm(false);
    void loadCards();
    revalidator.revalidate();
  }, [loadCards, revalidator]);

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
    border: "1px solid rgba(255, 106, 0, 0.28)",
    background: "linear-gradient(145deg, #ffffff 0%, rgba(255, 106, 0, 0.08) 100%)",
    padding: 16,
    boxShadow: "0 14px 30px rgba(15,23,42,0.1)",
  } as const;

  return (
    <Page fullWidth>
      <div style={{ maxWidth: 1420, margin: "0 auto", width: "100%" }}>
        <BlockStack gap="500">
          <AppHeroBanner
            title="Wallet"
            subtitle="Add a payment card so DTFTA can bill your store automatically for each customer order."
            badges={
              <InlineStack gap="200">
                <Badge tone={loaderData.squareConfigured ? "success" : "warning"}>
                  {loaderData.squareConfigured ? "Square ready" : "Square not configured"}
                </Badge>
                <Badge tone="info">{loaderData.squareEnvironment}</Badge>
              </InlineStack>
            }
            minHeight={120}
          />

          <InlineStack align="start" gap="400" blockAlign="start">
            <div style={{ flex: "1", minWidth: 0, maxWidth: 980 }}>
              <BlockStack gap="400">
                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingMd">
                        Saved cards
                      </Text>
                      <button
                        type="button"
                        onClick={() => setShowAddForm((v) => !v)}
                        style={{
                          border: "none",
                          borderRadius: 8,
                          padding: "8px 14px",
                          background: "#f1f5f9",
                          color: brandColors.text,
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                      >
                        {showAddForm ? "Cancel" : "Add card"}
                      </button>
                    </InlineStack>

                    {cardsError ? (
                      <Text as="p" tone="critical">
                        {cardsError}
                      </Text>
                    ) : null}

                    {cardsLoading ? (
                      <Text as="p" tone="subdued">
                        Loading saved cards…
                      </Text>
                    ) : cards.length === 0 ? (
                      <div style={surfaceStyle}>
                        <Text as="p" variant="bodyMd" tone="subdued">
                          No card on file yet. Add a card to allow automatic billing when new orders are placed.
                        </Text>
                      </div>
                    ) : (
                      <BlockStack gap="300">
                        {cards.map((card) => (
                          <div key={card.id} style={surfaceStyle}>
                            <InlineStack align="space-between" blockAlign="center">
                              <BlockStack gap="100">
                                <Text as="span" variant="bodyMd" fontWeight="semibold">
                                  {card.brand} •••• {card.last4}
                                </Text>
                                <Text as="span" variant="bodySm" tone="subdued">
                                  Expires {formatExpiry(card.expMonth, card.expYear)}
                                </Text>
                              </BlockStack>
                              {card.isDefault ? <Badge tone="success">Default</Badge> : null}
                            </InlineStack>
                          </div>
                        ))}
                      </BlockStack>
                    )}
                  </BlockStack>
                </Card>

                {showAddForm ? (
                  <Card>
                    <BlockStack gap="400">
                      <Text as="h2" variant="headingMd">
                        Add a new card
                      </Text>
                      <SquareCardForm
                        applicationId={loaderData.squareApplicationId}
                        locationId={loaderData.squareLocationId}
                        environment={loaderData.squareEnvironment}
                        onCardSaved={handleCardSaved}
                        disabled={!loaderData.squareConfigured}
                      />
                    </BlockStack>
                  </Card>
                ) : null}
              </BlockStack>
            </div>

            <div style={{ minWidth: 280, maxWidth: 320, flexShrink: 0 }}>
              <div style={sidebarSurfaceStyle}>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    How it works
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                  DTFTA securely stores your payment method so we can automatically process production and shipping costs for your orders.
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                  Payments are securely processed. We never store full card details or CVV information — only limited details like your card brand and last 4 digits, in line with PCI security standards.
                  </Text>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm" tone="subdued">
                      • One default card per store
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      • Charged only when an order is processed
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      • Your customers are never charged by DTFTA
                    </Text>
                  </BlockStack>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Store: {loaderData.shop}
                  </Text>
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
