import type { Session } from "@shopify/shopify-api";
import { ApiVersion } from "@shopify/shopify-app-react-router/server";
import { createExternalApiHeaders } from "./external-api.server";

export async function syncInstallToLaravel(
  session: Session,
  options?: { endpoint?: string; extraPayload?: Record<string, unknown> }
) {
  const API_BASE = process.env.EXTERNAL_API_BASE || "/api";

  try {
    const shopRes = await fetch(
      `https://${session.shop}/admin/api/${ApiVersion.October25}/shop.json`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": session.accessToken || "",
        },
      }
    );

    const shopPayload = shopRes.ok ? await shopRes.json() : null;

    const payload = {
      shop_domain:
        session.shop || shopPayload?.shop?.myshopify_domain || null,
      shopify_access_token: session.accessToken || null,
      shop_name: shopPayload?.shop?.name || null,
      shop_email: shopPayload?.shop?.email || null,
      shop_owner: shopPayload?.shop?.shop_owner || null,
      ...options?.extraPayload,
    };

    const headers = createExternalApiHeaders(payload, {
      "X-Shopify-Topic": "app/installed",
      "X-Shop": session.shop
    });

    const url = `${API_BASE.replace(/\/$/, "")}/api/v1/webhooks/shopify`;
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Laravel install sync failed:", response.status, await response.text());
    }

    return response;
  } catch (err) {
    console.error("Failed to sync install to Laravel:", err);
    throw err;
  }
}

export async function syncUninstallToLaravel(shop: string) {
  const API_BASE = process.env.EXTERNAL_API_BASE || "/api";

  const headers = createExternalApiHeaders('', {
    "X-Shopify-Topic": "app/uninstalled",
    "X-Shop": shop
  });

  const url = `${API_BASE.replace(/\/$/, "")}/api/v1/webhooks/shopify`;
  const response = await fetch(url, {
    method: "POST",
    headers
  });

  if (!response.ok) {
    console.error("Laravel uninstall sync failed:", response.status, await response.text());
  }

  return response;
}
