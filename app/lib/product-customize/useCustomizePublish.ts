import { useCallback, useEffect, useRef, useState } from "react";
import { useFetcher, useLocation } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import type { CustomizeSubmitResult } from "./types";

type UseCustomizePublishArgs = {
  buildFormData: () => Promise<
    | { ok: true; formData: FormData }
    | { ok: false; error: string }
  >;
};

export type PublishNotice = {
  type: "success" | "error";
  text: string;
};

function showToast(
  shopify: ReturnType<typeof useAppBridge>,
  message: string,
  isError = false
) {
  try {
    shopify.toast.show(message, isError ? { isError: true } : undefined);
  } catch {
    // The on-page notice still shows when App Bridge cannot display a toast.
  }
}

export function useCustomizePublish({
  buildFormData,
}: UseCustomizePublishArgs) {
  const fetcher = useFetcher<CustomizeSubmitResult>();
  const routerLocation = useLocation();
  const shopify = useAppBridge();
  const isBuilding = useRef(false);
  const awaitingResult = useRef(false);
  const sawBusy = useRef(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishNotice, setPublishNotice] = useState<PublishNotice | null>(null);

  const handleSubmit = useCallback(async () => {
    if (isBuilding.current || fetcher.state !== "idle") return;

    isBuilding.current = true;
    setIsPublishing(true);
    setPublishNotice(null);
    awaitingResult.current = false;
    sawBusy.current = false;

    try {
      const result = await buildFormData();

      if (!result.ok) {
        setIsPublishing(false);
        setPublishNotice({ type: "error", text: result.error });
        showToast(shopify, result.error, true);
        return;
      }

      const actionUrl = new URL(
        `${routerLocation.pathname}${routerLocation.search}`,
        window.location.origin
      );
      // Artwork generation can outlast the session token captured when the page loaded.
      actionUrl.searchParams.set("id_token", await shopify.idToken());

      awaitingResult.current = true;
      fetcher.submit(result.formData, {
        method: "POST",
        action: `${actionUrl.pathname}${actionUrl.search}`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to prepare product";
      setIsPublishing(false);
      setPublishNotice({ type: "error", text: message });
      showToast(shopify, message, true);
    } finally {
      isBuilding.current = false;
    }
  }, [buildFormData, fetcher, routerLocation.pathname, routerLocation.search, shopify]);

  useEffect(() => {
    if (fetcher.state !== "idle") {
      sawBusy.current = true;
      return;
    }

    if (!awaitingResult.current || !sawBusy.current) return;

    awaitingResult.current = false;
    sawBusy.current = false;
    setIsPublishing(false);

    const data = fetcher.data;
    if (!data || typeof data.ok !== "boolean") {
      const text =
        "Add to Store finished without a response. The request may have expired before it was accepted. Try again.";
      setPublishNotice({ type: "error", text });
      showToast(shopify, text, true);
      return;
    }

    if (!data.ok) {
      const text = data.error || "Could not add product to store";
      setPublishNotice({ type: "error", text });
      showToast(shopify, text, true);
      return;
    }

    const text = data.productId
      ? "Product created"
      : "Product created, but Shopify did not return a product id.";
    setPublishNotice({ type: "success", text });
    showToast(shopify, text);

    if (!data.productId) return;

    try {
      shopify.intents.invoke?.("edit:shopify/Product", {
        value: data.productId,
      });
    } catch {
      // The success notice stays on the page when the product editor cannot open.
    }
  }, [fetcher.state, fetcher.data, shopify]);

  return {
    fetcher,
    handleSubmit,
    isPublishing,
    publishNotice,
  };
}
