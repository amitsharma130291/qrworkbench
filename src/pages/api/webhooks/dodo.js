// Reliability backstop, per Dodo's own guidance: always fulfill on
// payment.succeeded from the webhook, not the browser redirect -- the
// redirect can be missed if the customer closes the tab, whereas the webhook
// is retried until acknowledged. The main unlock path (verify.js, called
// right after the redirect back) doesn't strictly need it -- it re-asks
// Dodo's API directly. This route is what actually issues the license key
// and emails it (to the customer and, as a standing record, to the owner) --
// the redirect path only unlocks the current browser, it never emails
// anything, so there's exactly one place a purchase results in an email.
export const prerender = false;

import { Webhook } from "standardwebhooks";
import { buildLicenseKey, buildRecoveryUrl, sendLicenseEmails } from "../../../lib/server/license.js";

export async function POST({ request }) {
  const secret = import.meta.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim();
  if (!secret) {
    console.error("DODO_PAYMENTS_WEBHOOK_KEY not configured.");
    return new Response(JSON.stringify({ error: "Webhook not configured." }), { status: 500 });
  }

  // Signature verification needs the exact raw bytes Dodo signed -- must read
  // as text before any JSON parsing, not re-serialize after the fact.
  const rawBody = await request.text();
  const headers = {
    "webhook-id": request.headers.get("webhook-id") || "",
    "webhook-signature": request.headers.get("webhook-signature") || "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") || "",
  };

  let event;
  try {
    const webhook = new Webhook(secret);
    await webhook.verify(rawBody, headers);
    event = JSON.parse(rawBody);
  } catch (err) {
    console.error("Dodo webhook signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature." }), { status: 401 });
  }

  console.log("Dodo webhook received:", event.type);

  if (event.type === "payment.succeeded") {
    try {
      // event.data is a Payment object -- payment_id, metadata, and
      // customer.{email,name} are the fields this route depends on.
      const data = event.data ?? {};
      const metadata = data.metadata ?? {};
      const tier = metadata.tier === "pro" ? "pro" : "batch";
      const paymentId = data.payment_id;
      const customerEmail = data.customer?.email ?? null;
      const customerName = data.customer?.name ?? null;

      if (!paymentId) {
        console.error("Dodo webhook: payment.succeeded with no payment_id -- can't build a license key.", data);
      } else if (!customerEmail) {
        console.error("Dodo webhook: payment.succeeded with no customer email -- can't send it.", data);
      } else {
        const licenseKey = buildLicenseKey(tier, paymentId);
        const recoveryUrl = buildRecoveryUrl({ paymentId, jobId: metadata.jobId || null });
        await sendLicenseEmails({ customerEmail, customerName, tier, licenseKey, recoveryUrl, jobId: metadata.jobId || null });
      }
    } catch (err) {
      // Don't fail the webhook over a best-effort email -- Dodo would just
      // retry it, and the browser-redirect path may have already unlocked
      // this purchase in the customer's current session regardless.
      console.error("Dodo webhook: license email failed:", err);
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
