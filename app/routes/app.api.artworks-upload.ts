import crypto from "crypto";
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

function createTimestampSignature(secret: string, timestamp: string): string {
  if (!secret) return "";
  return crypto.createHmac("sha256", secret).update(timestamp).digest("hex");
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ ok: false, error: "Missing file" }, { status: 422 });
  }

  const API_BASE = process.env.EXTERNAL_API_BASE || "/api";
  const endpoint = `${API_BASE.replace(/\/$/, "")}/artworks/upload`;
  const timestamp = String(Date.now());
  const signature = createTimestampSignature(process.env.EXTERNAL_API_SECRET || "", timestamp);

  const uploadForm = new FormData();
  uploadForm.set("file", file);
  uploadForm.set("shop_id", shop);
  uploadForm.set("store", shop);
  uploadForm.set("productKey", String(formData.get("productKey") ?? ""));
  uploadForm.set("placement", String(formData.get("placement") ?? ""));
  uploadForm.set("colorCode", String(formData.get("colorCode") ?? ""));
  uploadForm.set("source", "upload");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "X-Shop": shop,
        "X-App-Timestamp": timestamp,
        "X-App-Signature": signature,
      },
      body: uploadForm,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return Response.json(
        {
          ok: false,
          error: payload?.message || payload?.error || `Artwork upload failed: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const item = payload?.item ?? payload?.data ?? null;
    return Response.json({
      ok: true,
      item: item
        ? {
            id: String(item.id ?? ""),
            name: String(item.name ?? "Artwork"),
            url: String(item.url ?? ""),
            createdAt: typeof item.createdAt === "string" ? item.createdAt : undefined,
            source: typeof item.source === "string" ? item.source : "upload",
          }
        : null,
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
