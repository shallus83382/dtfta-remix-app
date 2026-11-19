function sessionTokenExpiry(token: string): number | null {
  const segment = token.split(".")[1];
  if (!segment) return null;

  try {
    const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(
      Buffer.from(padded, "base64").toString("utf8")
    ) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

/**
 * App Bridge can send a stale Authorization bearer while Add to store puts a
 * newer session token in `id_token`. Shopify auth reads the header first, so
 * a long multi-placement publish was rejected with 401 Unauthorized.
 * Keep the token that expires later.
 */
export function requestWithFresherSessionToken(request: Request): Request {
  const urlToken = new URL(request.url).searchParams.get("id_token")?.trim() ?? "";
  const headerToken =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";

  if (!urlToken || !headerToken || urlToken === headerToken) {
    return request;
  }

  const urlExpiry = sessionTokenExpiry(urlToken);
  const headerExpiry = sessionTokenExpiry(headerToken);
  if (urlExpiry === null || headerExpiry === null || urlExpiry <= headerExpiry) {
    return request;
  }

  const headers = new Headers(request.headers);
  headers.set("authorization", `Bearer ${urlToken}`);
  return new Request(request, { headers });
}
