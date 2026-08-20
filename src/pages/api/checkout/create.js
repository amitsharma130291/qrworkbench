// Creates a Dodo Payments checkout session server-side (the API key can't
// live in browser code). No database involved: the client hangs onto the
// returned sessionId itself and re-verifies it live against Dodo's API at
// export time -- see verify.js.
export const prerender = false;

import { getDodoClient, PRODUCTS, jsonResponse } from "../../../lib/server/dodo.js";

export async function POST({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }

  const { tier, jobId } = body ?? {};
  if (tier !== "batch" && tier !== "pro") {
    return jsonResponse({ error: "Unknown pricing tier." }, 400);
  }
  // A Batch Pass is scoped to the specific upload it was bought for -- Pro
  // isn't, so it doesn't need a jobId.
  if (tier === "batch" && (typeof jobId !== "string" || !jobId.trim())) {
    return jsonResponse({ error: "Missing job reference for a Batch Pass purchase." }, 400);
  }

  const client = getDodoClient();
  const product = PRODUCTS[tier];
  if (!client || !product.id) {
    console.error(`Dodo Payments not configured for tier "${tier}" (missing API key or product id).`);
    return jsonResponse({ error: "Payments aren't set up yet -- check back soon." }, 500);
  }

  const origin = new URL(request.url).origin;
  try {
    const session = await client.checkoutSessions.create({
      product_cart: [{ product_id: product.id, quantity: 1 }],
      metadata: { tier, jobId: jobId ?? "" },
      return_url: `${origin}/bulk?checkout=return`,
    });
    // Confirmed against the SDK's CheckoutSessionResponse type: the id field
    // is session_id (not id -- that's only on the *retrieve* response shape).
    return jsonResponse({
      checkoutUrl: session.checkout_url,
      sessionId: session.session_id,
    });
  } catch (err) {
    console.error("Dodo checkout session creation failed:", err);
    return jsonResponse({ error: "Couldn't start checkout. Please try again." }, 502);
  }
}
