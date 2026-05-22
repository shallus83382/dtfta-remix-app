/** Append Square Web Payments CSP directives (sandbox or production). */
export function appendSquareCspHeaders(
  headers: Headers,
  environment: string | undefined,
): void {
  const isProduction = (environment || "sandbox").toLowerCase() === "production";
  const squareCdn = isProduction
    ? "https://web.squarecdn.com"
    : "https://sandbox.web.squarecdn.com";
  const pciConnect = isProduction
    ? "https://pci-connect.squareup.com"
    : "https://pci-connect.squareupsandbox.com";

  const squareDirectives = [
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${squareCdn} https://cdn.shopify.com https://cdn.shopifycloud.com`,
    `frame-src 'self' ${squareCdn}`,
    `connect-src 'self' ${squareCdn} ${pciConnect}`,
    `style-src 'self' 'unsafe-inline' ${squareCdn}`,
    "font-src 'self' https://square-fonts-production-f.squarecdn.com https://d1g145x70srn7h.cloudfront.net",
  ].join("; ");

  const existing = headers.get("Content-Security-Policy");
  if (existing) {
    headers.set("Content-Security-Policy", `${existing}; ${squareDirectives}`);
  } else {
    headers.set("Content-Security-Policy", squareDirectives);
  }
}
