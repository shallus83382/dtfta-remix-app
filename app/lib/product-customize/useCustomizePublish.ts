import { useCallback, useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import type { CustomizeSubmitResult } from "./types";

type UseCustomizePublishArgs = {
  buildFormData: () => Promise<
    | { ok: true; formData: FormData }
    | { ok: false; error: string }
  >;
};

export function useCustomizePublish({
  buildFormData,
}: UseCustomizePublishArgs) {
  const fetcher = useFetcher<CustomizeSubmitResult>();
  const shopify = useAppBridge();
  const successHandled = useRef(false);
  const errorHandled = useRef(false);
  const isBuilding = useRef(false);

  const handleSubmit = useCallback(async () => {
    if (isBuilding.current || fetcher.state !== "idle") return;

    isBuilding.current = true;

    try {
      const result = await buildFormData();

      if (!result.ok) {
        shopify.toast.show(result.error);
        return;
      }

      // Composing several print areas can outlast the session token from page load.
      // Put a fresh token on the page URL as well as the action URL so the publish
      // request and the following loader revalidation both present it.
      const sessionToken = await shopify.idToken();
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set("id_token", sessionToken);
      window.history.replaceState(
        window.history.state,
        "",
        `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
      );

      const actionUrl = new URL(
        `${currentUrl.pathname}${currentUrl.search}`,
        window.location.origin
      );

      fetcher.submit(result.formData, {
        method: "POST",
        action: `${actionUrl.pathname}${actionUrl.search}`,
      });
    } catch (error) {
      shopify.toast.show(
        error instanceof Error ? error.message : "Failed to prepare product",
        { isError: true }
      );
    } finally {
      isBuilding.current = false;
    }
  }, [buildFormData, fetcher, shopify]);

  useEffect(() => {
    if (fetcher.state === "idle") {
      successHandled.current = false;
      errorHandled.current = false;
    }
  }, [fetcher.state]);

  useEffect(() => {
    if (fetcher.data && fetcher.data.ok === false && !errorHandled.current) {
      errorHandled.current = true;
      shopify.toast.show(fetcher.data.error || "Could not add product to store", { isError: true });
    }
  }, [fetcher.data, shopify]);

  useEffect(() => {
    if (fetcher.data?.ok && fetcher.data.productId && !successHandled.current) {
      successHandled.current = true;
      shopify.toast.show("Product created");

      try {
        shopify.intents.invoke?.("edit:shopify/Product", {
          value: fetcher.data.productId,
        });
      } catch {
        // ignore
      }
    }
  }, [fetcher.data, shopify]);

  return {
    fetcher,
    handleSubmit,
  };
}
