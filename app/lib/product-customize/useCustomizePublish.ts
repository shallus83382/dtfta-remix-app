import { useCallback, useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import type { CustomizeSubmitResult } from "./types";

type UseCustomizePublishArgs = {
  buildFormData: () =>
    | { ok: true; formData: FormData }
    | { ok: false; error: string };
};

export function useCustomizePublish({
  buildFormData,
}: UseCustomizePublishArgs) {
  const fetcher = useFetcher<CustomizeSubmitResult>();
  const shopify = useAppBridge();
  const successHandled = useRef(false);

  const handleSubmit = useCallback(() => {
    const result = buildFormData();

    if (!result.ok) {
      shopify.toast.show(result.error);
      return;
    }

    fetcher.submit(result.formData, { method: "POST" });
  }, [buildFormData, fetcher, shopify]);

  useEffect(() => {
    if (fetcher.state === "idle") {
      successHandled.current = false;
    }
  }, [fetcher.state]);

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