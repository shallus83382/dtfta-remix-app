import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { createExternalApiHeaders } from "../lib/external-api.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const API_BASE = process.env.EXTERNAL_API_BASE || "/api";
  const endpoint = `${API_BASE.replace(/\/$/, "")}/billing/status?shop=${encodeURIComponent(shop)}`;
  const headers = createExternalApiHeaders("", { "X-Shop": shop });

  try {
    const response = await fetch(endpoint, { headers });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return Response.json(
        {
          ok: false,
          error: payload?.message || `Billing status request failed: ${response.status}`,
        },
        { status: response.status }
      );
    }

    return Response.json({
      ok: true,
      billingStatus: payload?.data?.billing_status ?? "inactive",
      isBillingRequired: Boolean(payload?.data?.is_billing_required),
      lineItemId:
        typeof payload?.data?.line_item_id === "string" ? payload.data.line_item_id : null,
      activeSubscription: payload?.data?.active_subscription ?? null,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load billing status",
      },
      { status: 500 }
    );
  }
}

