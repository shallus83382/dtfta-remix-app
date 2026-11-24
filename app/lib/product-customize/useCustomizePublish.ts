import { useCallback, useRef, useState } from "react";
import { useFetcher } from "react-router";
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

export type PublishProgress = {
  percent: number;
  message: string;
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
  const shopify = useAppBridge();
  const isBuilding = useRef(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishNotice, setPublishNotice] = useState<PublishNotice | null>(null);
  const [publishProgress, setPublishProgress] = useState<PublishProgress | null>(null);

  const handleSubmit = useCallback(async () => {
    if (isBuilding.current || isPublishing) return;

    isBuilding.current = true;
    setIsPublishing(true);
    setPublishNotice(null);
    setPublishProgress({ percent: 5, message: "Preparing product mockups..." });

    try {
      const result = await buildFormData();

      if (!result.ok) {
        setIsPublishing(false);
        setPublishProgress(null);
        setPublishNotice({ type: "error", text: result.error });
        showToast(shopify, result.error, true);
        return;
      }

      // Step 1: Initialize Base Product in Shopify
      setPublishProgress({ percent: 15, message: "Creating base product in Shopify..." });
      result.formData.set("step", "init");

      const initRes = await fetch("/app/api/products-publish", {
        method: "POST",
        body: result.formData,
      });

      const initData = await initRes.json().catch(() => null);
      if (!initRes.ok || !initData?.ok) {
        throw new Error(initData?.error || "Failed to create base product in Shopify.");
      }

      const customProductId = initData.data?.custom_product_id;
      const shopifyProductId = initData.data?.shopify_product_id;
      const totalVariants = Number(initData.data?.total_variants || 0);
      const totalBatches = Number(initData.data?.total_batches || 0);
      const batchSize = Number(initData.data?.batch_size || 25);

      // Step 2: Create Variants in Batches
      if (totalBatches > 0) {
        for (let i = 0; i < totalBatches; i++) {
          const currentCount = Math.min((i + 1) * batchSize, totalVariants);
          const percent = Math.round(20 + ((i + 1) / totalBatches) * 70);
          setPublishProgress({
            percent,
            message: `Adding variants: ${currentCount} / ${totalVariants} (${Math.round((currentCount / totalVariants) * 100)}%)...`,
          });

          const batchRes = await fetch("/app/api/products-publish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              step: "batch",
              custom_product_id: customProductId,
              batch_index: i,
              batch_size: batchSize,
            }),
          });

          const batchData = await batchRes.json().catch(() => null);
          if (!batchRes.ok || !batchData?.ok) {
            throw new Error(batchData?.error || `Failed to create variant batch ${i + 1}.`);
          }
        }
      }

      // Step 3: Finalize (Media & Shipping profile & Inventory setup)
      setPublishProgress({ percent: 95, message: "Finalizing mockups & shipping..." });
      const finalizeRes = await fetch("/app/api/products-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "finalize",
          custom_product_id: customProductId,
        }),
      });

      const finalizeData = await finalizeRes.json().catch(() => null);
      if (!finalizeRes.ok || !finalizeData?.ok) {
        throw new Error(finalizeData?.error || "Failed to finalize product setup in Shopify.");
      }

      // Step 4: Complete!
      setPublishProgress({ percent: 100, message: "Product created successfully!" });
      setIsPublishing(false);
      setPublishNotice({ type: "success", text: "Product created" });
      showToast(shopify, "Product created");

      if (shopifyProductId) {
        try {
          shopify.intents.invoke?.("edit:shopify/Product", {
            value: shopifyProductId,
          });
        } catch {
          // The success notice stays on the page when the product editor cannot open.
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add product to store";
      setIsPublishing(false);
      setPublishProgress(null);
      setPublishNotice({ type: "error", text: message });
      showToast(shopify, message, true);
    } finally {
      isBuilding.current = false;
    }
  }, [buildFormData, isPublishing, shopify]);

  return {
    fetcher,
    handleSubmit,
    isPublishing,
    publishNotice,
    publishProgress,
  };
}
