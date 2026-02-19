import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { authenticate, apiVersion } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { createExternalApiHeaders } from "../lib/external-api.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // After successful OAuth/authentication, send shop details + access token to external Laravel API.
  if (session && session.shop) {
    try {
      // Fetch shop details from Shopify Admin API
      const shopRes = await fetch(`https://${session.shop}/admin/api/${apiVersion}/shop.json`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": session.accessToken || "",
        },
      });
      const shopPayload = shopRes.ok ? await shopRes.json() : null;

      const API_BASE = process.env.EXTERNAL_API_BASE || "/api";
      // Build the payload expected by Laravel (include refresh token and expiry)
      const payload = {
        shop_domain: session.shop || shopPayload?.shop?.myshopify_domain || null,
        shopify_access_token: session.accessToken || null,
        refresh_token: (session as any).refreshToken || null,
        refresh_token_expires_at: (session as any).refreshTokenExpires
          ? new Date((session as any).refreshTokenExpires).toISOString()
          : null,
        shopify_scopes: (session as any).scope || null,
        shopify_api_version: apiVersion || process.env.SHOPIFY_API_VERSION || null,
        fulfillment_service_id: null,
        location_id: null,
        status: "active",
      };

      // Include the full payload when creating the signature
      const headers = createExternalApiHeaders(payload, { "X-Shop": session.shop });

      // Upsert shop info in Laravel. Endpoint: POST /shops (adjust if your API differs)
      await fetch(`${API_BASE.replace(/\/$/, "")}/`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Failed to send shop info to external API:", err);
    }
  }

  return null;
};

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
