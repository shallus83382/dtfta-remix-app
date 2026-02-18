import crypto from "crypto";

// Create HMAC signature header for requests to external API (Laravel).
// Uses EXTERNAL_API_SECRET from env. Signature = HMAC_SHA256(secret, timestamp + body)
export function createExternalApiHeaders(body: unknown = "", extraHeaders: Record<string, string> = {}) {
  const secret = process.env.EXTERNAL_API_SECRET || "";
  const timestamp = String(Date.now());
  const payload = typeof body === "string" ? body : JSON.stringify(body || "");
  const signature = secret
    ? crypto.createHmac("sha256", secret).update(timestamp + payload).digest("hex")
    : "";

  return {
    "Content-Type": "application/json",
    "X-App-Timestamp": timestamp,
    "X-App-Signature": signature,
    ...extraHeaders,
  };
}

