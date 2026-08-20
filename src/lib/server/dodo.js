import DodoPayments from "dodopayments";

// One client per warm serverless instance -- cheap to construct, but no
// reason to rebuild it on every request within the same instance.
let cached;

export function getDodoClient() {
  const apiKey = import.meta.env.DODO_PAYMENTS_API_KEY?.trim();
  if (!apiKey) return null;
  if (!cached) {
    cached = new DodoPayments({
      bearerToken: apiKey,
      environment: import.meta.env.DODO_ENVIRONMENT?.trim() === "live_mode" ? "live_mode" : "test_mode",
    });
  }
  return cached;
}

// Product ids come from the Dodo dashboard (one-time-payment products
// created there, not via API). Both tiers share this map so
// create.js/verify.js don't hardcode env var names twice.
export const PRODUCTS = {
  batch: { id: import.meta.env.DODO_PRODUCT_ID_BATCH?.trim(), label: "Batch Pass" },
  pro: { id: import.meta.env.DODO_PRODUCT_ID_PRO?.trim(), label: "Pro" },
};

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
