import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  publishCustomizeInit,
  publishCustomizeMediaBatch,
  publishCustomizeBatch,
  publishCustomizeFinalize,
} from "../lib/product-customize/customize-product.server";
import {
  retainSelectedShopifyVariants,
  syncShopifyProductMedia,
} from "../lib/product-customize/shopify-product-sync.server";
import {
  createProductSyncToken,
  parseSelectedVariantSkus,
  verifyProductSyncToken,
} from "../lib/product-customize/shopify-sync-token.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    const step = String(formData.get("step") || "init");

    if (step === "init") {
      try {
        const result = await publishCustomizeInit(formData, shop);
        if (!result.ok) {
          return Response.json(result, { status: 422 });
        }

        const publishData = result.data;
        if (
          !publishData ||
          typeof publishData !== "object" ||
          Array.isArray(publishData)
        ) {
          throw new Error("Publish API returned invalid product data.");
        }
        const shopifyProductId = (publishData as Record<string, unknown>)
          .shopify_product_id;
        if (
          (typeof shopifyProductId !== "string" &&
            typeof shopifyProductId !== "number") ||
          !String(shopifyProductId).trim()
        ) {
          throw new Error("Publish API did not return a Shopify product ID.");
        }

        const selectedSkus = parseSelectedVariantSkus(
          formData.get("selectedVariantSkus")?.toString() ?? null
        );
        const productSyncToken = createProductSyncToken(
          shop,
          String(shopifyProductId),
          selectedSkus
        );
        return Response.json(
          { ...result, productSyncToken },
          { status: 200 }
        );
      } catch (err) {
        return Response.json(
          {
            ok: false,
            error:
              err instanceof Error
                ? err.message
                : "Failed to initialize product.",
          },
          { status: 500 }
        );
      }
    }
  }

  const body = await request.json().catch(() => ({}));
  const step = body?.step;

  if (step === "shopify-media") {
    try {
      if (
        !Array.isArray(body?.mockups) ||
        body.mockups.some(
          (mockup: unknown) =>
            !mockup ||
            typeof mockup !== "object" ||
            typeof (mockup as Record<string, unknown>).placement !== "string" ||
            typeof (mockup as Record<string, unknown>).color !== "string" ||
            typeof (mockup as Record<string, unknown>).data_url !== "string"
        )
      ) {
        throw new Error("Invalid Shopify mockup payload.");
      }

      const result = await syncShopifyProductMedia(
        admin,
        verifyProductSyncToken(String(body?.sync_token ?? ""), shop).productId,
        body.mockups,
        body?.replace_existing === true
      );
      return Response.json({ ok: true, data: result });
    } catch (error) {
      return Response.json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to sync product mockups to Shopify.",
        },
        { status: 422 }
      );
    }
  }

  if (step === "filter-variants") {
    try {
      const syncToken = verifyProductSyncToken(
        String(body?.sync_token ?? ""),
        shop
      );

      const result = await retainSelectedShopifyVariants(
        admin,
        syncToken.productId,
        syncToken.selectedSkus
      );
      return Response.json({ ok: true, data: result });
    } catch (error) {
      return Response.json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to remove unselected product variants.",
        },
        { status: 422 }
      );
    }
  }

  if (step === "media") {
    const customProductId = Number(body?.custom_product_id);
    const mockups = Array.isArray(body?.mockups) ? body.mockups : [];
    const result = await publishCustomizeMediaBatch(customProductId, mockups, shop);
    return Response.json(result, { status: result.ok ? 200 : 422 });
  }

  if (step === "batch") {
    const customProductId = Number(body?.custom_product_id);
    const batchIndex = Number(body?.batch_index);
    const batchSize = Number(body?.batch_size || 25);
    const result = await publishCustomizeBatch(customProductId, batchIndex, batchSize, shop);
    return Response.json(result, { status: result.ok ? 200 : 422 });
  }

  if (step === "finalize") {
    const customProductId = Number(body?.custom_product_id);
    const result = await publishCustomizeFinalize(customProductId, shop);
    return Response.json(result, { status: result.ok ? 200 : 422 });
  }

  return Response.json({ ok: false, error: "Invalid publish step" }, { status: 400 });
}
