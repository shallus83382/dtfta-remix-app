import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import { createExternalApiHeaders } from "./lib/external-api.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,

  future: {
    expiringOfflineAccessTokens: true,
  },

  // ✅ THIS IS THE CORRECT PLACE
  hooks: {
    afterAuth: async ({ session }) => {
      try {
        // 1️⃣ Fetch shop details directly using REST
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

        // 2️⃣ Prepare payload for Laravel
        const payload = {
          shop_domain:
            session.shop || shopPayload?.shop?.myshopify_domain || null,
          shopify_access_token: session.accessToken || null,
          refresh_token: (session as any).refreshToken || null,
          refresh_token_expires_at: (session as any).refreshTokenExpires
            ? new Date(
                (session as any).refreshTokenExpires
              ).toISOString()
            : null,
          shopify_scopes: (session as any).scope || null,
          shopify_api_version: ApiVersion.October25,
          fulfillment_service_id: null,
          location_id: null,
          status: "active",
        };

        // 3️⃣ Create secure headers
        const headers = createExternalApiHeaders(payload, {
          "X-Shop": session.shop,
        });

        const API_BASE = process.env.EXTERNAL_API_BASE || "/api";

        // 4️⃣ Send to Laravel
        const response = await fetch(`${API_BASE.replace(/\/$/, "")}/`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error("Failed to sync shop to Laravel:", err);
      }
    },
  },

  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders =
  shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
