import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { createExternalApiHeaders } from "../lib/external-api.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const API_BASE = process.env.EXTERNAL_API_BASE || "/api";
  const endpoint = `${API_BASE.replace(/\/$/, "")}/billing/approve`;
  const appUrl = (process.env.SHOPIFY_APP_URL || "").replace(/\/$/, "");
  const returnUrl = appUrl ? `${appUrl}/billing/return` : "";
  const body = {
    shop,
    returnUrl,
  };
  const headers = createExternalApiHeaders(body, { "X-Shop": shop });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      return Response.json(
        {
          ok: false,
          error: payload?.message || `Billing approve request failed: ${response.status}`,
        },
        { status: response.status }
      );
    }

    return Response.json({
      ok: true,
      confirmationUrl:
        typeof payload?.data?.confirmation_url === "string" ? payload.data.confirmation_url : "",
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to create billing approval URL",
      },
      { status: 500 }
    );
  }
}

