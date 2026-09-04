// Shared server-side license logic: no database, because a license key
// literally embeds the Dodo payment id that proves it. Verifying a key is
// just parsing it back apart and asking Dodo's API "did this payment
// succeed, and for which tier/job" -- see redeem.js and verify.js.
import nodemailer from "nodemailer";

const SITE_URL = "https://www.qrworkbench.com";
const SITE_NAME = "QR Workbench";
// Falls back to the original literal so nothing breaks if OWNER_EMAIL isn't
// set yet -- but set it in .env so this and api/contact.js (the other place
// that used to hardcode the same address) both read from one source.
export const OWNER_EMAIL = import.meta.env.OWNER_EMAIL || "amitsharma00261@gmail.com";
const TIER_LABEL = { batch: "Batch Pass ($7)", pro: "Pro ($39 lifetime)" };

export function buildLicenseKey(tier, paymentId) {
  return `QRW-${tier.toUpperCase()}-${paymentId}`;
}

// Case-insensitive on the fixed "QRW-BATCH-"/"QRW-PRO-" prefix (so a phone
// keyboard's autocapitalize doesn't break pasting), but the payment id
// itself is captured verbatim -- Dodo ids are case-sensitive.
export function parseLicenseKey(rawKey) {
  const trimmed = String(rawKey || "").trim();
  const match = trimmed.match(/^qrw-(batch|pro)-(.+)$/i);
  if (!match) return null;
  return { tier: match[1].toLowerCase(), paymentId: match[2] };
}

export function buildRecoveryUrl({ sessionId, paymentId, jobId }) {
  // Points at /pricing (not /bulk) -- that's where the standalone "Already
  // purchased?" box lives, so a customer clicking this from their email
  // lands somewhere that explains itself, not straight into the tool.
  const url = new URL("/pricing", SITE_URL);
  url.searchParams.set("checkout", "recover");
  if (sessionId) url.searchParams.set("sessionId", sessionId);
  else if (paymentId) url.searchParams.set("paymentId", paymentId);
  if (jobId) url.searchParams.set("jobId", jobId);
  return url.toString();
}

function getTransporter() {
  const gmailUser = import.meta.env.GMAIL_USER?.trim();
  const gmailPass = import.meta.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (!gmailUser || !gmailPass) return null;
  return { transporter: nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailPass } }), gmailUser };
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function customerHtml({ label, licenseKey, recoveryUrl, scopeNote, isResend }) {
  const heading = isResend ? "Here's your license key" : "Thanks for your purchase";
  const intro = isResend
    ? "You asked for your QR Workbench license key to be resent — here it is."
    : `${escapeHtml(label)} is unlocked — here's your license key for whenever you need to restore access.`;
  // Claiming "already active" only makes sense right after a purchase --
  // someone requesting a resend is asking specifically *because* it isn't
  // active wherever they are, so the same claim there would be simply
  // wrong, not just unnecessary.
  const activationNote = isResend
    ? `Click below to activate your ${escapeHtml(label)} license in this browser — it only takes a second.`
    : `<strong>Your ${escapeHtml(label)} is already active</strong> in the browser you checked out in — there's nothing else to do there. If you don't see it unlocked, switched devices, or cleared your browser, click below to reactivate it instantly.`;
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#111111">
    <p style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#E63312;margin:0 0 10px">QR Workbench</p>
    <h1 style="font-size:22px;margin:0 0 10px">${heading}</h1>
    <p style="font-size:14px;line-height:1.6;color:#4A4C4F;margin:0 0 20px">${intro}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F8F5;border:1px solid #D9D9D4;border-radius:8px;margin:0 0 20px">
      <tr>
        <td style="padding:16px 20px;border-bottom:1px solid #D9D9D4;font-size:13px;color:#4A4C4F">Product</td>
        <td style="padding:16px 20px;border-bottom:1px solid #D9D9D4;font-size:13px;font-weight:700;text-align:right">${escapeHtml(label)}</td>
      </tr>
      <tr>
        <td style="padding:16px 20px;font-size:13px;color:#4A4C4F">License key</td>
        <td style="padding:16px 20px;font-size:14px;font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;text-align:right">${escapeHtml(licenseKey)}</td>
      </tr>
    </table>

    <p style="font-size:13px;line-height:1.6;color:#4A4C4F;margin:0 0 18px">${activationNote}</p>

    <a href="${recoveryUrl}" style="display:inline-block;background:#111111;color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:6px;margin:0 0 26px">Reactivate license</a>

    <p style="font-size:13px;font-weight:700;margin:0 0 8px">How to recover access if you ever lose this email</p>
    <ol style="font-size:13px;line-height:1.7;color:#4A4C4F;margin:0 0 20px;padding-left:18px">
      <li>Click <strong>Reactivate license</strong> above, on any device — it unlocks instantly, no login.</li>
      <li>Or go to the <a href="${SITE_URL}/pricing">pricing page</a>, open <strong>"Already purchased?"</strong>, and paste: <strong>${escapeHtml(licenseKey)}</strong></li>
      <li>Lost the key itself, not just this email? On that same page, click <strong>"Forgot your key?"</strong>, enter the email you paid with, and every key tied to it gets re-sent automatically.</li>
    </ol>

    <p style="font-size:13px;color:#4A4C4F;margin:0 0 20px">${escapeHtml(scopeNote)}</p>

    <hr style="border:none;border-top:1px solid #D9D9D4;margin:0 0 16px" />
    <p style="font-size:12.5px;color:#4A4C4F;margin:0">Questions about your purchase? Just reply to this email.</p>
  </div>`;
}

function customerText({ label, licenseKey, recoveryUrl, scopeNote, isResend }) {
  const intro = isResend
    ? "You asked for your QR Workbench license key to be resent — here it is."
    : `${label} is unlocked — here's your license key for whenever you need to restore access.`;
  const activationNote = isResend
    ? `Click the link below to activate your ${label} license in this browser -- it only takes a second.`
    : `Your ${label} is already active in the browser you checked out in -- there's nothing else to do there. If you don't see it unlocked, switched devices, or cleared your browser, use the link below to reactivate it instantly.`;
  return [
    intro,
    "",
    `Product: ${label}`,
    `License key: ${licenseKey}`,
    "",
    activationNote,
    "",
    `Reactivate license: ${recoveryUrl}`,
    "",
    "How to recover access if you ever lose this email:",
    "1. Click the reactivate link above, on any device -- unlocks instantly, no login.",
    `2. Or go to ${SITE_URL}/pricing, open "Already purchased?", and paste: ${licenseKey}`,
    `3. Lost the key itself? On that same page, click "Forgot your key?", enter the email you paid with, and every key tied to it gets re-sent automatically.`,
    "",
    scopeNote,
    "",
    "Questions about your purchase? Just reply to this email.",
  ].join("\n");
}

/**
 * Emails the license key + recovery steps to the customer, and a copy to the
 * site owner as a standing record (the owner's inbox doubles as the audit
 * trail there is no database for). Called from verify.js right after a
 * checkout redirect confirms payment (the common case), from the webhook as
 * a backstop for a closed-tab purchase, and from /api/license/recover on a
 * resend request. Deliberately not deduplicated between the first two --
 * an occasional duplicate purchase-confirmation email is a much smaller
 * problem than a purchase that emails nothing at all.
 */
export async function sendLicenseEmails({ customerEmail, customerName, tier, licenseKey, recoveryUrl, jobId, isResend = false }) {
  const result = { configured: false, customerSent: false, customerError: null, ownerSent: false, ownerError: null };
  const setup = getTransporter();
  if (!setup) {
    console.error("Can't send license email: GMAIL_USER/GMAIL_APP_PASSWORD not configured.");
    return result;
  }
  result.configured = true;
  const { transporter, gmailUser } = setup;
  const label = TIER_LABEL[tier] || "purchase";
  const scopeNote =
    tier === "batch"
      ? "This key unlocks the one CSV you uploaded when you paid. If it doesn't unlock automatically, re-upload that same file first."
      : "Pro is unlimited, so this key works for every batch you upload, on any device.";

  const subject = isResend ? "Your QR Workbench license key (resent)" : `Your QR Workbench ${label} license key`;
  const templateArgs = { label, licenseKey, recoveryUrl, scopeNote, isResend };

  if (customerEmail) {
    try {
      await transporter.sendMail({
        from: `"QR Workbench" <${gmailUser}>`,
        to: customerEmail,
        replyTo: OWNER_EMAIL,
        subject,
        text: customerText(templateArgs),
        html: customerHtml(templateArgs),
      });
      result.customerSent = true;
    } catch (err) {
      console.error("License email to customer failed:", err);
      result.customerError = String(err?.message || err);
    }
  }

  // Owner's inbox doubles as the order ledger across every site using this
  // same pattern (barcodeflow, etc.) sending to the same address -- Website
  // and Product need to be explicit, unambiguous fields here, not just
  // folded into a sentence, so they're identifiable/filterable at a glance.
  try {
    await transporter.sendMail({
      from: `"QR Workbench" <${gmailUser}>`,
      to: OWNER_EMAIL,
      subject: `[${SITE_NAME}] Order — ${label} — ${licenseKey}`,
      text: `New order on ${SITE_NAME} (${SITE_URL}).\n\nWebsite: ${SITE_NAME} (${SITE_URL})\nProduct: ${label}\nLicense key: ${licenseKey}\nCustomer: ${customerName || "(no name given)"} <${customerEmail || "no email"}>\nJob id: ${jobId || "n/a"}\n${isResend ? "(This was a resend, not a new purchase.)" : ""}`,
      html: `<p>New order on <strong>${escapeHtml(SITE_NAME)}</strong> (${escapeHtml(SITE_URL)}).</p><ul><li>Website: ${escapeHtml(SITE_NAME)} (${escapeHtml(SITE_URL)})</li><li>Product: ${escapeHtml(label)}</li><li>License key: ${escapeHtml(licenseKey)}</li><li>Customer: ${escapeHtml(customerName || "(no name given)")} &lt;${escapeHtml(customerEmail || "no email")}&gt;</li><li>Job id: ${escapeHtml(jobId || "n/a")}</li></ul>${isResend ? "<p><em>This was a resend, not a new purchase.</em></p>" : ""}`,
    });
    result.ownerSent = true;
  } catch (err) {
    console.error("License email to owner failed:", err);
    result.ownerError = String(err?.message || err);
  }

  return result;
}
