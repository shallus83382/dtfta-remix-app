import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { createExternalApiHeaders } from "../lib/external-api.server";

type ArtworkRecord = {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  source?: "upload" | "listing" | "library";
  createdAt?: string;
};

function normalizeArtworkRecord(input: unknown): ArtworkRecord | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;

  const idRaw = row.id ?? row.artworkId ?? row.uuid ?? row.key;
  const nameRaw = row.name ?? row.fileName ?? row.title ?? "Artwork";
  const urlRaw = row.url ?? row.imageUrl ?? row.fileUrl ?? row.path;
  const mimeTypeRaw = row.mimeType ?? row.mime ?? row.contentType;
  const sourceRaw = row.source;
  const createdAtRaw = row.createdAt ?? row.created_at ?? row.uploadedAt;

  const id = typeof idRaw === "string" || typeof idRaw === "number" ? String(idRaw) : "";
  const name = typeof nameRaw === "string" ? nameRaw : "Artwork";
  const url = typeof urlRaw === "string" ? urlRaw : "";
  const mimeType = typeof mimeTypeRaw === "string" ? mimeTypeRaw : undefined;
  const source =
    sourceRaw === "upload" || sourceRaw === "listing" || sourceRaw === "library"
      ? sourceRaw
      : undefined;
  const createdAt = typeof createdAtRaw === "string" ? createdAtRaw : undefined;

  if (!id || !url) return null;

  return { id, name, url, mimeType, source, createdAt };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const productKey = url.searchParams.get("productKey") ?? "";
  const placement = url.searchParams.get("placement") ?? "";
  const colorCode = url.searchParams.get("colorCode") ?? "";
  const cursor = url.searchParams.get("cursor") ?? "";
  const limit = url.searchParams.get("limit") ?? "60";
  const search = url.searchParams.get("search") ?? "";
  const type = url.searchParams.get("type") ?? "all";
  const sort = url.searchParams.get("sort") ?? "recent";

  const API_BASE = process.env.EXTERNAL_API_BASE || "/api";
  const endpoint = `${API_BASE.replace(/\/$/, "")}/artworks/list`;

  const upstreamQuery = new URLSearchParams({
    shop_id: shop,
    store: shop,
    productKey,
    placement,
    colorCode,
    cursor,
    limit,
    search,
    type,
    sort,
  });

  const headers = createExternalApiHeaders("", { "X-Shop": shop });

  try {
    const res = await fetch(`${endpoint}?${upstreamQuery.toString()}`, { headers });
    const raw = await res.json().catch(() => ({}));

    if (!res.ok) {
      return Response.json(
        {
          ok: false,
          error: raw?.message || raw?.error || `Artwork API error: ${res.status}`,
          items: [] as ArtworkRecord[],
        },
        { status: res.status }
      );
    }

    const rows: unknown[] = Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.items)
        ? raw.items
        : [];

    const items = rows.reduce<ArtworkRecord[]>((acc, row) => {
      const normalized = normalizeArtworkRecord(row);
      if (normalized) acc.push(normalized);
      return acc;
    }, []);

    const nextCursor =
      typeof raw?.nextCursor === "string"
        ? raw.nextCursor
        : typeof raw?.meta?.nextCursor === "string"
          ? raw.meta.nextCursor
          : "";

    return Response.json({
      ok: true,
      items,
      nextCursor,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load artworks",
        items: [] as ArtworkRecord[],
      },
      { status: 500 }
    );
  }
}
