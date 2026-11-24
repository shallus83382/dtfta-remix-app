import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  publishCustomizeInit,
  publishCustomizeMediaBatch,
  publishCustomizeBatch,
  publishCustomizeFinalize,
} from "../lib/product-customize/customize-product.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    const step = String(formData.get("step") || "init");

    if (step === "init") {
      try {
        const result = await publishCustomizeInit(formData, shop);
        return Response.json(result, { status: result.ok ? 200 : 422 });
      } catch (err) {
        return Response.json(
          { ok: false, error: err instanceof Error ? err.message : "Failed to initialize product." },
          { status: 500 }
        );
      }
    }
  }

  const body = await request.json().catch(() => ({}));
  const step = body?.step;

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
