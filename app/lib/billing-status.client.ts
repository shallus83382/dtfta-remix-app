import type { BillingStatus } from "../types";

export const BILLING_STATUS_CHANGED_EVENT = "dtfta-billing-status-changed";

export type BillingStatusFetchResult = BillingStatus & {
  error?: string;
};

export async function fetchBillingStatusFromApi(): Promise<BillingStatusFetchResult> {
  const res = await fetch("/app/api/billing-status");
  const payload = await res.json().catch(() => ({}));
  const isOk = Boolean(payload?.ok ?? payload?.success);

  if (!res.ok || !isOk) {
    return {
      status: "inactive",
      required: true,
      lineItemId: null,
      error:
        (typeof payload?.error === "string" && payload.error) ||
        (typeof payload?.message === "string" && payload.message) ||
        "Failed to load billing status.",
    };
  }

  const normalizedStatus =
    payload?.billingStatus ?? payload?.data?.billing_status ?? payload?.billing_status ?? "inactive";
  const normalizedRequired =
    payload?.isBillingRequired ?? payload?.data?.is_billing_required ?? payload?.is_billing_required ?? false;
  const normalizedLineItemId =
    payload?.lineItemId ?? payload?.data?.line_item_id ?? payload?.line_item_id ?? null;

  const status: BillingStatus["status"] =
    normalizedStatus === "active" || normalizedStatus === "blocked"
      ? normalizedStatus
      : "inactive";

  return {
    status,
    required: Boolean(normalizedRequired),
    lineItemId: normalizedLineItemId,
  };
}

export function notifyBillingStatusChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(BILLING_STATUS_CHANGED_EVENT));
  }
}
