import { useCallback, useEffect, useRef, useState } from "react";
import { BlockStack, InlineStack, Text } from "@shopify/polaris";
import { brandPrimaryButtonBg } from "../../lib/brand-theme";
import { loadSquareSdk } from "../../lib/square-sdk.client";

type Props = {
  applicationId: string;
  locationId: string;
  environment: "sandbox" | "production";
  onCardSaved?: (sourceId: string) => void;
  disabled?: boolean;
};

export default function SquareCardForm({
  applicationId,
  locationId,
  environment,
  onCardSaved,
  disabled = false,
}: Props) {
  const cardRef = useRef<SquareWebPayments.Card | null>(null);
  const initGeneration = useRef(0);
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const configMissing = !applicationId.trim() || !locationId.trim();

  useEffect(() => {
    if (configMissing || disabled) return;

    const generation = ++initGeneration.current;
    let cancelled = false;

    const initCard = async () => {
      try {
        await loadSquareSdk(environment);
        if (cancelled || generation !== initGeneration.current) return;

        if (!window.Square) {
          setSdkError("Square Web Payments SDK is not available.");
          return;
        }

        const payments = window.Square.payments(applicationId, locationId);
        const card = await payments.card();
        if (cancelled || generation !== initGeneration.current) {
          await card.destroy();
          return;
        }

        await card.attach("#square-card-container");
        if (cancelled || generation !== initGeneration.current) {
          await card.destroy();
          return;
        }

        cardRef.current = card;
        setSdkReady(true);
        setSdkError("");
      } catch (err) {
        if (!cancelled) {
          setSdkError(
            err instanceof Error ? err.message : "Could not initialize Square card form.",
          );
          setSdkReady(false);
        }
      }
    };

    void initCard();

    return () => {
      cancelled = true;
      void cardRef.current?.destroy();
      cardRef.current = null;
      setSdkReady(false);
    };
  }, [applicationId, locationId, environment, configMissing, disabled]);

  const handleSaveCard = useCallback(async () => {
    if (!cardRef.current || submitting) return;
    setSubmitting(true);
    setFormError("");
    setSuccessMessage("");

    try {
      const result = await cardRef.current.tokenize();
      if (result.status !== "OK" || !result.token) {
        const msg =
          result.errors?.map((e) => e.message).join(" ") ||
          "Card could not be verified. Check the details and try again.";
        setFormError(msg);
        return;
      }

      const res = await fetch("/app/api/wallet-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: result.token }),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFormError(
          typeof payload?.error === "string"
            ? payload.error
            : "Unable to save card. Please try again.",
        );
        return;
      }

      setSuccessMessage(
        payload?.pending
          ? "Card verified with Square. Backend save is pending."
          : "Card saved successfully.",
      );
      onCardSaved?.(result.token);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong while saving the card.");
    } finally {
      setSubmitting(false);
    }
  }, [onCardSaved, submitting]);

  if (configMissing) {
    return (
      <div
        style={{
          borderRadius: 10,
          border: "1px solid #fecaca",
          backgroundColor: "#fff1f2",
          padding: 12,
        }}
      >
        <Text as="p" tone="critical">
          Square is not configured. Set SQUARE_APPLICATION_ID and SQUARE_LOCATION_ID in your app
          environment, then restart the server.
        </Text>
      </div>
    );
  }

  return (
    <BlockStack gap="400">
      <Text as="p" variant="bodyMd" tone="subdued">
        Enter your card below. Card details are handled securely by Square — they are not stored on
        our servers.
      </Text>

      <div
        id="square-card-container"
        style={{
          minHeight: sdkReady ? 56 : 120,
          borderRadius: 10,
          border: "1px solid #dbe3ec",
          background: "#ffffff",
          padding: 12,
        }}
      />

      {!sdkReady && !sdkError ? (
        <Text as="p" variant="bodySm" tone="subdued">
          Loading secure card form…
        </Text>
      ) : null}

      {sdkError ? (
        <Text as="p" tone="critical">
          {sdkError}
        </Text>
      ) : null}

      {formError ? (
        <Text as="p" tone="critical">
          {formError}
        </Text>
      ) : null}

      {successMessage ? (
        <div
          style={{
            borderRadius: 10,
            border: "1px solid #bbf7d0",
            backgroundColor: "#ecfdf5",
            padding: 12,
          }}
        >
          <Text as="p" tone="success">
            {successMessage}
          </Text>
        </div>
      ) : null}

      <InlineStack align="end">
        <button
          type="button"
          disabled={!sdkReady || submitting || disabled}
          onClick={() => void handleSaveCard()}
          style={{
            border: "none",
            borderRadius: 10,
            padding: "10px 18px",
            background: brandPrimaryButtonBg,
            color: "#ffffff",
            fontWeight: 600,
            fontSize: 14,
            cursor: !sdkReady || submitting || disabled ? "not-allowed" : "pointer",
            opacity: !sdkReady || submitting || disabled ? 0.65 : 1,
          }}
        >
          {submitting ? "Saving…" : "Save card"}
        </button>
      </InlineStack>
    </BlockStack>
  );
}
