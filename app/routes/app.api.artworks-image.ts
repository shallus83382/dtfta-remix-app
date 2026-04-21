import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  const reqUrl = new URL(request.url);
  const source = reqUrl.searchParams.get("url") ?? "";

  if (!source) {
    return new Response("Missing url query param", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(source);
  } catch {
    return new Response("Invalid image URL", { status: 400 });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return new Response("Unsupported protocol", { status: 400 });
  }

  // Prevent open proxy abuse by allowing only known storage hosts.
  const allowedHosts = new Set([
    "dtfta-storage-352196746036-us-east-1-an.s3.amazonaws.com",
    "d315otl6ckb9m2.cloudfront.net",
  ]);
  if (!allowedHosts.has(parsed.hostname)) {
    return new Response("Host not allowed", { status: 403 });
  }

  try {
    const upstream = await fetch(parsed.toString());
    if (!upstream.ok) {
      return new Response("Failed to load image", { status: upstream.status });
    }

    const body = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new Response("Image proxy request failed", { status: 502 });
  }
}
