import { useCallback, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import type { CustomizeSubmitResult } from "./types";

type UseCustomizePublishArgs = {
  buildFormData: () => Promise<
    | {
        ok: true;
        formData: FormData;
        secondaryMockups?: Array<{ placement: string; color: string; data_url: string }>;
      }
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

type ProductMockup = {
  placement: string;
  color: string;
  data_url: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function collectProductMockups(
  formData: FormData,
  secondaryMockups: ProductMockup[]
): ProductMockup[] {
  const rawArtworkUrls = formData.get("artworkUrls");
  if (typeof rawArtworkUrls !== "string") {
    throw new Error("Generated product artwork is missing.");
  }

  let artworkUrls: unknown;
  try {
    artworkUrls = JSON.parse(rawArtworkUrls);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Generated product artwork is invalid: ${error.message}`
        : "Generated product artwork is invalid."
    );
  }
  if (!isRecord(artworkUrls)) {
    throw new Error("Generated product artwork is not a valid object.");
  }

  const primaryMockups = Object.values(artworkUrls).flatMap((value) => {
    if (!isRecord(value)) return [];
    const color = value.colorCode;
    const placement = value.placement;
    const dataUrl =
      typeof value.artworkUrl === "string" && value.artworkUrl
        ? value.artworkUrl
        : value.customArtworkUrl;
    if (!dataUrl) return [];
    if (
      typeof color !== "string" ||
      typeof placement !== "string" ||
      typeof dataUrl !== "string" ||
      !dataUrl.startsWith("data:image/")
    ) {
      throw new Error("A generated product mockup is not a valid image.");
    }

    return [{ color, placement, data_url: dataUrl }];
  });

  const uniqueMockups = new Map<string, ProductMockup>();
  for (const mockup of [...primaryMockups, ...secondaryMockups]) {
    if (!mockup.data_url.startsWith("data:image/")) {
      throw new Error("A generated product mockup is not a valid image.");
    }
    uniqueMockups.set(`${mockup.color}:${mockup.placement}`, mockup);
  }

  return Array.from(uniqueMockups.values());
}

async function postShopifyProductSyncStep(
  payload: Record<string, unknown>
): Promise<void> {
  const response = await fetch("/app/api/products-publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || "Failed to sync the Shopify product.");
  }
}

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
        const fallback = initRes.status === 413
          ? "Upload too large (HTTP 413) — please reduce mockup images."
          : `Failed to initialize product in Shopify (HTTP ${initRes.status}).`;
        throw new Error(initData?.error || fallback);
      }

      const customProductId = initData.data?.custom_product_id;
      const shopifyProductId = initData.data?.shopify_product_id;
      const totalVariants = Number(initData.data?.total_variants || 0);
      const totalBatches = Number(initData.data?.total_batches || 0);
      const batchSize = Number(initData.data?.batch_size || 25);

      // Step 2: Upload Secondary Color Mockups in Chunks of 5 (15% to 40%)
      const secondaryMockups = result.secondaryMockups || [];
      if (secondaryMockups.length > 0) {
        const MEDIA_CHUNK_SIZE = 5;
        const totalMediaChunks = Math.ceil(secondaryMockups.length / MEDIA_CHUNK_SIZE);

        for (let c = 0; c < totalMediaChunks; c++) {
          const chunk = secondaryMockups.slice(c * MEDIA_CHUNK_SIZE, (c + 1) * MEDIA_CHUNK_SIZE);
          const currentCount = Math.min((c + 1) * MEDIA_CHUNK_SIZE, secondaryMockups.length);
          const percent = Math.round(15 + ((c + 1) / totalMediaChunks) * 25);
          setPublishProgress({
            percent,
            message: `Uploading color mockups: ${currentCount} / ${secondaryMockups.length}...`,
          });

          const mediaRes = await fetch("/app/api/products-publish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              step: "media",
              custom_product_id: customProductId,
              mockups: chunk,
            }),
          });

          const mediaData = await mediaRes.json().catch(() => null);
          if (!mediaRes.ok || !mediaData?.ok) {
            const errorMsg = mediaData?.error || `Failed to upload color mockups chunk ${c + 1}`;
            setPublishProgress(null);
            return { ok: false, error: errorMsg };
          }
        }
      }

      // Step 3: Create Variants in Batches (40% to 90%)
      if (totalBatches > 0) {
        for (let i = 0; i < totalBatches; i++) {
          const currentCount = Math.min((i + 1) * batchSize, totalVariants);
          const percent = Math.round(40 + ((i + 1) / totalBatches) * 50);
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

      if (
        (typeof shopifyProductId !== "string" && typeof shopifyProductId !== "number") ||
        !String(shopifyProductId).trim()
      ) {
        throw new Error(
          "The publish API did not return a Shopify product ID for variant and image sync."
        );
      }

      const productId = String(shopifyProductId);
      const productSyncToken = initData.productSyncToken;
      if (typeof productSyncToken !== "string" || !productSyncToken) {
        throw new Error(
          "The publish API did not authorize selected variant and image sync."
        );
      }
      const productMockups = collectProductMockups(
        result.formData,
        result.secondaryMockups ?? []
      );

      setPublishProgress({
        percent: 96,
        message: "Removing unselected product variants...",
      });
      await postShopifyProductSyncStep({
        step: "filter-variants",
        sync_token: productSyncToken,
      });

      for (let index = 0; index < productMockups.length; index += 5) {
        const batch = productMockups.slice(index, index + 5);
        setPublishProgress({
          percent: 98,
          message: `Fixing product images: ${Math.min(index + batch.length, productMockups.length)} / ${productMockups.length}...`,
        });
        await postShopifyProductSyncStep({
          step: "shopify-media",
          sync_token: productSyncToken,
          mockups: batch,
          replace_existing: index === 0,
        });
      }

      // Step 4: Complete!
      setPublishProgress({ percent: 100, message: "Product created successfully!" });
      setIsPublishing(false);
      setPublishNotice({ type: "success", text: "Product created" });
      showToast(shopify, "Product created");

      if (shopifyProductId) {
        try {
          shopify.intents.invoke?.("edit:shopify/Product", {
            value: productId,
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
