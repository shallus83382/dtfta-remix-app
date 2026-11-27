import { createHmac, timingSafeEqual } from "node:crypto";

type ProductSyncTokenPayload = {
  shop: string;
  productId: string;
  selectedSkus: string[];
  expiresAt: number;
};

function getTokenSecret(): string {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    throw new Error("Shopify API secret is unavailable for product sync.");
  }
  return secret;
}

export function parseSelectedVariantSkus(raw: string | null): string[] {
  if (raw === null) {
    throw new Error("Selected product variants are missing.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Selected product variants are invalid.");
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length === 0 ||
    parsed.some((sku) => typeof sku !== "string" || !sku.trim())
  ) {
    throw new Error("Select at least one valid product variant.");
  }

  const skus = Array.from(new Set(parsed.map((sku: string) => sku.trim())));
  if (skus.length !== parsed.length) {
    throw new Error("Selected product variants must have unique SKUs.");
  }
  return skus;
}

export function createProductSyncToken(
  shop: string,
  productId: string,
  selectedSkus: string[]
): string {
  const payload: ProductSyncTokenPayload = {
    shop,
    productId,
    selectedSkus,
    expiresAt: Date.now() + 60 * 60 * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  );
  const signature = createHmac("sha256", getTokenSecret())
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyProductSyncToken(
  token: string,
  shop: string
): ProductSyncTokenPayload {
  const [encodedPayload, providedSignature, ...extra] = token.split(".");
  if (!encodedPayload || !providedSignature || extra.length) {
    throw new Error("Product sync authorization is invalid.");
  }

  const expectedSignature = createHmac("sha256", getTokenSecret())
    .update(encodedPayload)
    .digest();
  const actualSignature = Buffer.from(providedSignature, "base64url");
  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    throw new Error("Product sync authorization is invalid.");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    );
  } catch {
    throw new Error("Product sync authorization is invalid.");
  }
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    !("shop" in payload) ||
    !("productId" in payload) ||
    !("selectedSkus" in payload) ||
    !("expiresAt" in payload)
  ) {
    throw new Error("Product sync authorization is invalid.");
  }

  const verified = payload as ProductSyncTokenPayload;
  if (
    verified.shop !== shop ||
    typeof verified.productId !== "string" ||
    !verified.productId.trim() ||
    !Array.isArray(verified.selectedSkus) ||
    verified.selectedSkus.length === 0 ||
    verified.selectedSkus.some(
      (sku) => typeof sku !== "string" || !sku.trim()
    ) ||
    typeof verified.expiresAt !== "number" ||
    verified.expiresAt <= Date.now()
  ) {
    throw new Error("Product sync authorization is invalid or expired.");
  }

  return verified;
}
