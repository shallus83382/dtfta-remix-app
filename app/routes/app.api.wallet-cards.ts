import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { createExternalApiHeaders } from "../lib/external-api.server";

/** Saved cards for the shop (backend wiring comes next). */
export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const API_BASE = process.env.EXTERNAL_API_BASE || "/api";
  const endpoint = `${API_BASE.replace(/\/$/, "")}/wallet/cards?shop=${encodeURIComponent(shop)}`;
  const headers = createExternalApiHeaders("", { "X-Shop": shop });

  try {
    const response = await fetch(endpoint, { headers });
    if (response.status === 404) {
      return Response.json({ ok: true, cards: [] });
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return Response.json(
        { ok: false, error: payload?.message || "Failed to load saved cards.", cards: [] },
        { status: response.status },
      );
    }
    const cards = Array.isArray(payload?.data?.cards) ? payload.data.cards : [];
    return Response.json({ ok: true, cards });
  } catch {
    return Response.json({ ok: true, cards: [] });
  }
}

/** Save or delete a saved payment card. */
export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const API_BASE = process.env.EXTERNAL_API_BASE || "/api";

  if (request.method === "DELETE") {
    const body = await request.json().catch(() => ({}));
    const cardIdRaw = body?.cardId ?? body?.card_id;
    const cardId =
      typeof cardIdRaw === "number"
        ? cardIdRaw
        : typeof cardIdRaw === "string"
          ? Number.parseInt(cardIdRaw, 10)
          : NaN;

    if (!Number.isFinite(cardId) || cardId <= 0) {
      return Response.json({ ok: false, error: "Missing or invalid card id." }, { status: 400 });
    }

    const payload = { shop, cardId };
    const headers = createExternalApiHeaders(payload, { "X-Shop": shop });
    const endpoint = `${API_BASE.replace(/\/$/, "")}/wallet/cards/${cardId}`;

    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.success === false) {
        return Response.json(
          { ok: false, error: data?.message || "Failed to remove card." },
          { status: response.status },
        );
      }

      const cards = Array.isArray(data?.data?.cards) ? data.data.cards : [];
      return Response.json({ ok: true, cards });
    } catch (error) {
      return Response.json(
        {
          ok: false,
          error: error instanceof Error ? error.message : "Failed to remove card.",
        },
        { status: 500 },
      );
    }
  }

  if (request.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  const body = await request.json().catch(() => ({}));
  const sourceId = typeof body?.sourceId === "string" ? body.sourceId.trim() : "";

  if (!sourceId) {
    return Response.json({ ok: false, error: "Missing card token from Square." }, { status: 400 });
  }

  const endpoint = `${API_BASE.replace(/\/$/, "")}/wallet/cards`;
  const payload = { shop, sourceId };
  const headers = createExternalApiHeaders(payload, { "X-Shop": shop });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));

    if (response.status === 404) {
      return Response.json({
        ok: true,
        message: "Card token received. Connect the Laravel wallet API to persist cards in Square.",
        pending: true,
      });
    }

    if (!response.ok) {
      return Response.json(
        { ok: false, error: data?.message || "Failed to save card." },
        { status: response.status },
      );
    }

    return Response.json({ ok: true, card: data?.data?.card ?? null });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to save card.",
      },
      { status: 500 },
    );
  }
}
