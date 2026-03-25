import type { Session } from "@shopify/shopify-api";
import { ApiVersion } from "@shopify/shopify-app-react-router/server";
import { createExternalApiHeaders } from "./external-api.server";

type SyncWebhookOptions = {
  endpoint?: string;
  topic: string;
  shop: string;
  payload?: Record<string, unknown> | null;
  extraHeaders?: Record<string, string>;
};

async function sendWebhookToLaravel({
  endpoint = "/webhooks/shopify",
  topic,
  shop,
  payload = null,
  extraHeaders = {},
}: SyncWebhookOptions) {
  const API_BASE = process.env.EXTERNAL_API_BASE || "/api";
  const url = `${API_BASE.replace(/\/$/, "")}${endpoint}`;

  const headers = {
    ...createExternalApiHeaders(payload ?? "", {
      "X-Shopify-Topic": topic,
      "X-Shop": shop,
      ...extraHeaders,
    }),
    ...(payload ? { "Content-Type": "application/json" } : {}),
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });

  if (!response.ok) {
    console.error(
      `Laravel webhook sync failed for topic "${topic}":`,
      response.status,
      await response.text()
    );
  }

  return response;
}

async function getShopData(session: Session) {
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

    if (!shopRes.ok) {
      console.error("Failed to fetch shop data from Shopify:", shopRes.status);
      return null;
    }

    return await shopRes.json();
  } catch (err) {
    console.error("Failed to fetch shop data:", err);
    return null;
  }
}

export async function syncInstallToLaravel(
  session: Session,
  options?: {
    endpoint?: string;
    extraPayload?: Record<string, unknown>;
    extraHeaders?: Record<string, string>;
  }
) {
  try {
    const shopPayload = await getShopData(session);

    const payload = {
      shop_domain: session.shop || shopPayload?.shop?.myshopify_domain || null,
      shopify_access_token: session.accessToken || null,
      shop_name: shopPayload?.shop?.name || null,
      shop_email: shopPayload?.shop?.email || null,
      shop_owner: shopPayload?.shop?.shop_owner || null,
      ...options?.extraPayload,
    };

    return await sendWebhookToLaravel({
      endpoint: options?.endpoint,
      topic: "app/installed",
      shop: session.shop,
      payload,
      extraHeaders: options?.extraHeaders,
    });
  } catch (err) {
    console.error("Failed to sync install to Laravel:", err);
    throw err;
  }
}

export async function syncUninstallToLaravel(
  shop: string,
  options?: {
    endpoint?: string;
    extraPayload?: Record<string, unknown>;
    extraHeaders?: Record<string, string>;
  }
) {
  try {
    return await sendWebhookToLaravel({
      endpoint: options?.endpoint,
      topic: "app/uninstalled",
      shop,
      payload: options?.extraPayload ?? null,
      extraHeaders: options?.extraHeaders,
    });
  } catch (err) {
    console.error("Failed to sync uninstall to Laravel:", err);
    throw err;
  }
}

export async function syncShopifyTopicToLaravel(
  topic: string,
  shop: string,
  payload?: Record<string, unknown>,
  options?: {
    endpoint?: string;
    extraHeaders?: Record<string, string>;
  }
) {
  try {
    return await sendWebhookToLaravel({
      endpoint: options?.endpoint,
      topic,
      shop,
      payload: payload ?? null,
      extraHeaders: options?.extraHeaders,
    });
  } catch (err) {
    console.error(`Failed to sync topic "${topic}" to Laravel:`, err);
    throw err;
  }
}