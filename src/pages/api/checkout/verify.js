// The single source of truth for "has this browser paid": always asks Dodo
// directly rather than trusting a client-stored flag, so there's nothing to
// forge and nothing to keep in a database. Called once right after the
// checkout redirect returns, and again immediately before every ZIP export.
export const prerender = false;

import { getDodoClient, jsonResponse } from "../../../lib/server/dodo.js";
import { buildLicenseKey, buildRecoveryUrl, sendLicenseEmails } from "../../../lib/server/license.js";

export async function GET({ url }) {
  const sessionId = url.searchParams.get("sessionId");
  const paymentId = url.searchParams.get("paymentId");
  const jobId = url.searchParams.get("jobId") || "";
  const sendEmail = url.searchParams.get("sendEmail") === "1";
  if (!sessionId && !paymentId) {
    return jsonResponse({ error: "Missing sessionId or paymentId." }, 400);
  }

  const client = getDodoClient();
  if (!client) {
    console.error("Dodo Payments not configured (missing API key).");
    return jsonResponse({ error: "Payments aren't set up yet." }, 500);
  }

  try {
    // CheckoutSessionStatus (what checkoutSessions.retrieve returns) carries
    // payment_status and payment_id but NOT metadata. Only the underlying
    // Payment object has metadata, so a sessionId lookup is really "resolve
    // to a payment_id, then read the Payment" -- same as the recovery-link
    // path, which already has a paymentId and skips straight there.
    let resolvedPaymentId = paymentId;
    if (!resolvedPaymentId) {
      const session = await client.checkoutSessions.retrieve(sessionId);
      if (!session.payment_id) {
        return jsonResponse({ ok: false, status: session.payment_status || "pending" });
      }
      resolvedPaymentId = session.payment_id;
    }

    const payment = await client.payments.retrieve(resolvedPaymentId);
    const status = String(payment.status ?? "").toLowerCase();
    const metadata = payment.metadata ?? {};
    const tier = metadata.tier === "pro" ? "pro" : "batch";

    if (status !== "succeeded") {
      return jsonResponse({ ok: false, status: status || "unknown" });
    }
    // Only enforce the job match when the caller actually passed one -- a
    // bare recovery-link visit with no jobId (or no current job in play)
    // shouldn't be rejected outright.
    if (tier === "batch" && jobId && metadata.jobId && metadata.jobId !== jobId) {
      return jsonResponse({ ok: false, status: "job_mismatch" });
    }

    const licenseKey = buildLicenseKey(tier, payment.payment_id);

    if (sendEmail) {
      // Awaited, not fire-and-forget -- a serverless function can be frozen
      // or torn down the instant the response is sent, so an un-awaited
      // send might never actually go out. This is the primary send path
      // (the webhook is the backstop for a closed-tab purchase, not the
      // other way around).
      try {
        await sendLicenseEmails({
          customerEmail: payment.customer?.email ?? null,
          customerName: payment.customer?.name ?? null,
          tier,
          licenseKey,
          recoveryUrl: buildRecoveryUrl({ paymentId: payment.payment_id, jobId: metadata.jobId || null }),
          jobId: metadata.jobId || null,
        });
      } catch (err) {
        console.error("verify.js: license email failed:", err);
      }
    }

    return jsonResponse({
      ok: true,
      tier,
      jobId: metadata.jobId || null,
      paymentId: payment.payment_id,
      licenseKey,
    });
  } catch (err) {
    console.error("Dodo checkout/payment lookup failed:", err);
    return jsonResponse({ error: "Couldn't verify payment. Please try again." }, 502);
  }
}
