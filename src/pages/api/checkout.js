// Creates a Dodo Payments checkout session and redirects straight to it.
// Kept server-side because it needs the secret API key -- everything else
// about entitlement (activation, validation) is done with Dodo's public,
// keyless license endpoints directly from the browser (see src/lib/license.js).
export const prerender = false;

function apiBase() {
  return import.meta.env.PUBLIC_DODO_ENVIRONMENT === "live_mode"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";
}

export async function GET({ url, redirect }) {
  const productId = url.searchParams.get("productId");
  if (!productId) {
    return new Response("Missing productId.", { status: 400 });
  }

  const apiKey = import.meta.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) {
    console.error("DODO_PAYMENTS_API_KEY not configured.");
    return new Response("Checkout isn't configured yet. Please try again later.", { status: 500 });
  }
  // Built from the incoming request itself rather than a configured env var,
  // so this is automatically correct on localhost and in production without
  // needing to be kept in sync.
  const returnUrl = new URL("/checkout/success", url.origin).toString();

  let res;
  try {
    res = await fetch(`${apiBase()}/checkouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        product_cart: [{ product_id: productId, quantity: 1 }],
        return_url: returnUrl,
      }),
    });
  } catch (err) {
    console.error("Dodo checkout session request failed:", err);
    return new Response("Couldn't start checkout. Please try again.", { status: 502 });
  }

  if (!res.ok) {
    console.error("Dodo checkout session error:", res.status, await res.text());
    return new Response("Couldn't start checkout. Please try again.", { status: 502 });
  }

  const session = await res.json();
  if (!session.checkout_url) {
    console.error("Dodo checkout session response missing checkout_url:", session);
    return new Response("Couldn't start checkout. Please try again.", { status: 502 });
  }

  return redirect(session.checkout_url, 302);
}
