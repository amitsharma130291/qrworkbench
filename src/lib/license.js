// Client-side entitlement, backed by Dodo Payments' license key feature
// instead of an account system -- a purchase generates a license key, and
// these two endpoints (both public, no API key required) are how the
// browser activates and later revalidates it. Nothing about this touches
// our own server: no database, no accounts, just localStorage + Dodo.
const STORAGE_KEY = "qrw_license";

function apiBase() {
  return import.meta.env.PUBLIC_DODO_ENVIRONMENT === "live_mode"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";
}

export function getStoredLicense() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLicense(record) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

export function clearLicense() {
  localStorage.removeItem(STORAGE_KEY);
}

export function tierForProduct(productId) {
  if (productId && productId === import.meta.env.PUBLIC_DODO_PRODUCT_PRO_ID) return "pro";
  if (productId && productId === import.meta.env.PUBLIC_DODO_PRODUCT_SINGLE_ID) return "single";
  return null;
}

export function tierLabel(tier) {
  return tier === "pro" ? "Pro (lifetime)" : tier === "single" ? "Batch Pass" : "Unlocked";
}

function deviceName() {
  const platform = (typeof navigator !== "undefined" && navigator.platform) || "browser";
  return `QR Workbench – ${platform}`;
}

// Activates a license key against this browser. Dodo counts each call as a
// new device activation against the key's activation limit, so callers must
// only invoke this once per key (see getStoredLicense guard in callers) --
// never on every page load, or a low activation limit gets burned through
// by refreshes alone.
export async function activateLicense(licenseKey) {
  const res = await fetch(`${apiBase()}/licenses/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ license_key: licenseKey, name: deviceName() }),
  });

  if (!res.ok) {
    if (res.status === 404) throw new Error("That license key wasn't found. Double-check it and try again.");
    if (res.status === 403) throw new Error("This license key has reached its activation limit on other devices.");
    throw new Error("Couldn't activate that license key. Please try again.");
  }

  const data = await res.json();
  const productId = data.product?.product_id ?? null;
  const record = {
    licenseKey,
    instanceId: data.id,
    productId,
    tier: tierForProduct(productId),
    activatedAt: data.created_at ?? new Date().toISOString(),
  };
  saveLicense(record);
  return record;
}

// Revalidates an already-activated key without consuming another activation slot.
export async function isLicenseValid(record) {
  if (!record?.licenseKey) return false;
  try {
    const res = await fetch(`${apiBase()}/licenses/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ license_key: record.licenseKey, license_key_instance_id: record.instanceId }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.valid;
  } catch {
    // A network hiccup shouldn't lock out someone with a previously-valid
    // license -- fail open here and let the next visit re-check.
    return true;
  }
}
