// "Forgot your license key" self-service resend: query Dodo directly for
// succeeded payments on our two products, and match by the customer email
// on each payment. No database: Dodo's own records are the lookup.
//
// Deliberately NOT using customers.list({email}) -> payments.list({customer_id})
// -- that depends on a hosted checkout actually creating a queryable Customer
// record, which isn't guaranteed. payments.list({product_id}) directly,
// filtered by payment.customer.email and payment.status client-side, only
// depends on fields confirmed present on PaymentListResponse (customer,
// metadata, payment_id, status) -- it does NOT carry product_cart, which is
// why filtering on payment.product_cart would silently match nothing (only
// retrieve() returns that field, not list()).
export const prerender = false;

import { getDodoClient, PRODUCTS, jsonResponse } from "../../../lib/server/dodo.js";
import { buildLicenseKey, buildRecoveryUrl, sendLicenseEmails } from "../../../lib/server/license.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ITEMS = 2000; // defensive cap against a runaway iterator, not a real limit at this volume

async function fetchSucceededPayments(client, productId) {
  const results = [];
  let count = 0;
  // status can't be combined with product_id in the same list() call --
  // that combination silently returns zero results. Neither can page_number
  // be passed explicitly at all (even the default value of 1 zeroes out
  // results that come back fine without it) -- both are real quirks in the
  // API/SDK. Async-iterating the page (the SDK's own pagination) avoids
  // page_number entirely; status is filtered here in JS instead.
  for await (const payment of client.payments.list({ product_id: productId, page_size: 100 })) {
    if (payment.status === "succeeded") results.push(payment);
    count += 1;
    if (count >= MAX_ITEMS) break;
  }
  return results;
}

export async function POST({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }

  const email = String(body?.email || "").trim();
  if (!EMAIL_RE.test(email)) {
    return jsonResponse({ error: "Enter a valid email address." }, 400);
  }

  const client = getDodoClient();
  if (!client) {
    console.error("Dodo Payments not configured (missing API key).");
    return jsonResponse({ error: "Payments aren't set up yet." }, 500);
  }

  // Always the same generic response regardless of what's found -- doesn't
  // confirm or deny whether an email has ever made a purchase.
  const generic = { ok: true, message: "If that email has a completed purchase, we've sent the license key(s) to it." };
  const productIds = [PRODUCTS.batch.id, PRODUCTS.pro.id].filter(Boolean);
  const target = email.toLowerCase();

  try {
    const allPayments = (await Promise.all(productIds.map((id) => fetchSucceededPayments(client, id)))).flat();
    const matches = allPayments.filter((p) => p.customer?.email?.toLowerCase() === target);
    console.log(`License recovery for ${email}: ${allPayments.length} succeeded payment(s) checked, ${matches.length} matched.`);

    for (const payment of matches) {
      const metadata = payment.metadata ?? {};
      const tier = metadata.tier === "pro" ? "pro" : "batch";
      const licenseKey = buildLicenseKey(tier, payment.payment_id);
      const recoveryUrl = buildRecoveryUrl({ paymentId: payment.payment_id, jobId: metadata.jobId || null });
      await sendLicenseEmails({
        customerEmail: email,
        customerName: payment.customer?.name,
        tier,
        licenseKey,
        recoveryUrl,
        jobId: metadata.jobId || null,
        isResend: true,
      });
    }
  } catch (err) {
    // Still return the generic message -- a lookup failure shouldn't reveal
    // anything different from "we found nothing" to the caller.
    console.error("License recovery lookup failed:", err);
  }

  return jsonResponse(generic);
}
