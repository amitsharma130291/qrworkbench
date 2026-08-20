// Manual unlock path: paste in a license key (from the purchase email) to
// activate on a new device/browser where localStorage never had it. Fully
// self-verifying with no database -- the key contains the real Dodo
// payment_id, so redeeming it is just "look that payment up and check it
// actually succeeded."
export const prerender = false;

import { getDodoClient, jsonResponse } from "../../../lib/server/dodo.js";
import { buildLicenseKey, parseLicenseKey } from "../../../lib/server/license.js";

export async function POST({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }

  const parsedKey = parseLicenseKey(body?.licenseKey);
  const jobId = typeof body?.jobId === "string" ? body.jobId : "";
  if (!parsedKey) {
    return jsonResponse({ error: "That doesn't look like a valid license key." }, 400);
  }

  const client = getDodoClient();
  if (!client) {
    console.error("Dodo Payments not configured (missing API key).");
    return jsonResponse({ error: "Payments aren't set up yet." }, 500);
  }

  try {
    const payment = await client.payments.retrieve(parsedKey.paymentId);
    const status = String(payment.status ?? "").toLowerCase();
    const metadata = payment.metadata ?? {};
    const tier = metadata.tier === "pro" ? "pro" : "batch";

    if (tier !== parsedKey.tier) {
      return jsonResponse({ ok: false, status: "key_mismatch" });
    }
    if (status !== "succeeded") {
      return jsonResponse({ ok: false, status: status || "unknown" });
    }
    // Only enforce the job match when the caller actually has a job in play
    // (the bulk tool, mid-upload) -- redeeming from a context with no
    // current file should just confirm the key is real and remember it; the
    // real per-file scoping happens later, once there's an actual job to
    // compare against.
    if (tier === "batch" && jobId && metadata.jobId && metadata.jobId !== jobId) {
      return jsonResponse({ ok: false, status: "job_mismatch" });
    }

    return jsonResponse({
      ok: true,
      tier,
      jobId: metadata.jobId || null,
      paymentId: payment.payment_id,
      licenseKey: buildLicenseKey(tier, payment.payment_id),
    });
  } catch (err) {
    console.error("License redeem failed:", err);
    return jsonResponse({ error: "Couldn't verify that license key. Please try again." }, 502);
  }
}
