const PENDING_KEY = "qrw_pending_checkout";
const PAYMENT_KEY = "qrw_payment_v1";

export function newJobId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `job-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * A Batch Pass purchase is scoped to "this job" -- deriving the id from the
 * file's own bytes (not a random uuid) means re-uploading the identical file
 * later always reproduces the same id. That's what makes the webhook-driven
 * email recovery link work with no database: if a customer pays and closes
 * the tab before the redirect completes, the webhook still emails them a
 * link tied to the jobId Dodo has in its metadata, and re-uploading the same
 * spreadsheet re-derives that same id client-side.
 */
export async function jobIdFromFile(file) {
  if (!crypto.subtle) return newJobId();
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export async function startCheckout(tier, jobId) {
  const res = await fetch("/api/checkout/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tier, jobId: tier === "batch" ? jobId : undefined }),
  });
  const data = await res.json();
  if (!res.ok || !data.checkoutUrl) {
    throw new Error(data.error || "Couldn't start checkout.");
  }
  // Survives the round trip to Dodo's hosted checkout and back since
  // sessionStorage is same-origin and untouched by the third-party redirect --
  // this is how we recognize "we just came back from paying" without Dodo
  // needing to echo anything through the return_url itself.
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ sessionId: data.sessionId, tier, jobId }));
  window.location.href = data.checkoutUrl;
}

function consumePendingCheckout() {
  const raw = sessionStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(PENDING_KEY);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getStoredPayment() {
  try {
    return JSON.parse(localStorage.getItem(PAYMENT_KEY) || "null");
  } catch {
    return null;
  }
}

function storePayment(payment) {
  localStorage.setItem(PAYMENT_KEY, JSON.stringify(payment));
}

export function clearStoredPayment() {
  localStorage.removeItem(PAYMENT_KEY);
}

async function verify({ sessionId, paymentId, jobId, sendEmail = false }) {
  const params = new URLSearchParams();
  if (sessionId) params.set("sessionId", sessionId);
  if (paymentId) params.set("paymentId", paymentId);
  if (jobId) params.set("jobId", jobId);
  // Only the "we just came back from checkout" call sets this -- the
  // pre-export re-check (verifyAccessForJob) hits this same endpoint on
  // every export and must never re-trigger a purchase-confirmation email.
  if (sendEmail) params.set("sendEmail", "1");
  const res = await fetch(`/api/checkout/verify?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Couldn't verify payment.");
  return data;
}

// A customer who closes the tab right after paying (before the redirect back
// completes) never hits the sessionStorage path below -- the webhook handler
// emails them a link in that case, shaped like ?checkout=recover&sessionId=..
// (or &paymentId=..) &jobId=... . Reading it here means "click the email
// link" and "get redirected back by Dodo" both resolve through one function.
function consumeRecoveryParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("checkout") !== "recover") return null;
  const sessionId = params.get("sessionId");
  const paymentId = params.get("paymentId");
  const jobId = params.get("jobId");
  if (!sessionId && !paymentId) return null;
  const url = new URL(window.location.href);
  ["checkout", "sessionId", "paymentId", "jobId"].forEach((k) => url.searchParams.delete(k));
  window.history.replaceState({}, "", url);
  return { sessionId, paymentId, jobId };
}

/**
 * Call once on page load. Resolves either a just-completed Dodo checkout
 * redirect (sessionStorage) or a webhook-emailed recovery link (URL params),
 * confirms the payment against Dodo's API, and remembers it.
 */
export async function resolvePendingCheckout() {
  // Only the sessionStorage path is "we just paid, this is the first
  // confirmation" -- the URL-param path means they clicked a link from an
  // email they already have, so sending another one would be redundant.
  const freshCheckout = consumePendingCheckout();
  const pending = freshCheckout || consumeRecoveryParams();
  if (!pending) return null;
  const result = await verify({ ...pending, sendEmail: Boolean(freshCheckout) });
  if (result.ok) {
    const payment = {
      sessionId: result.sessionId ?? pending.sessionId,
      tier: result.tier,
      jobId: result.jobId,
      paymentId: result.paymentId,
      licenseKey: result.licenseKey,
    };
    storePayment(payment);
    return payment;
  }
  return { failed: true, status: result.status };
}

/**
 * Manual unlock: paste in a license key from the purchase/recovery email.
 * Works on any device, since the key is fully self-verifying against Dodo --
 * no dependency on this browser's sessionStorage/localStorage history.
 */
export async function redeemLicenseKey(licenseKey, jobId) {
  const res = await fetch("/api/license/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ licenseKey, jobId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Couldn't verify that license key.");
  if (!data.ok) {
    const messages = {
      job_mismatch: "That key unlocks a different file — re-upload the original file, or use a Pro key instead.",
      key_mismatch: "That license key's tier doesn't match its id — check you copied it correctly.",
      failed: "That payment hasn't gone through yet.",
    };
    throw new Error(messages[data.status] || "That license key isn't valid yet.");
  }
  const payment = { sessionId: null, paymentId: data.paymentId, tier: data.tier, jobId: data.jobId, licenseKey: data.licenseKey };
  storePayment(payment);
  return payment;
}

/** "Forgot your key" -- always resolves to a generic message, whether or not
 * anything was actually found for that email. */
export async function requestLicenseRecovery(email) {
  const res = await fetch("/api/license/recover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Couldn't process that request.");
  return data.message;
}

/**
 * Call right before allowing an export. Re-checks the stored payment live
 * against Dodo rather than trusting localStorage indefinitely -- there's no
 * database, so this call *is* the license check, every time.
 */
export async function verifyAccessForJob(jobId) {
  const stored = getStoredPayment();
  if (!stored) return null;
  if (stored.tier === "batch" && stored.jobId !== jobId) {
    // A Batch Pass purchase only ever covers the job it was bought for.
    return null;
  }
  try {
    const result = await verify({ sessionId: stored.sessionId, paymentId: stored.paymentId, jobId });
    if (result.ok) return { ...stored, tier: result.tier };
    clearStoredPayment();
    return null;
  } catch {
    // A network hiccup shouldn't lock out someone who already paid -- fail
    // open on the last-known-good record. Real fraud (never actually paid)
    // is still caught, because resolvePendingCheckout() never stores a
    // payment unless Dodo confirmed it at least once.
    return stored;
  }
}
