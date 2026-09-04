// The only non-static route on the site -- everything else is pre-rendered
// HTML with zero server cost, but sending email genuinely requires a server
// to hold the Gmail credentials and make the SMTP call.
export const prerender = false;

import nodemailer from "nodemailer";
import { OWNER_EMAIL } from "../../lib/server/license.js";

const MAX_LENGTHS = { name: 100, email: 254, subject: 150, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Same address license.js emails license keys/recovery from -- centralized
// there (via OWNER_EMAIL, itself sourced from the OWNER_EMAIL env var) so
// there's one place to change it instead of two literals drifting apart.
const RECIPIENT = OWNER_EMAIL;

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export async function POST({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body." }), { status: 400 });
  }

  const { name, email, subject, message, website } = body ?? {};

  // Honeypot: a field real users never see or fill in, hidden from screen
  // readers too (see contact.astro). Bots that blindly fill every field trip it.
  if (website) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const fields = { name, email, subject, message };
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value !== "string" || !value.trim()) {
      return new Response(JSON.stringify({ error: `${key[0].toUpperCase()}${key.slice(1)} is required.` }), { status: 400 });
    }
    if (value.length > MAX_LENGTHS[key]) {
      return new Response(JSON.stringify({ error: `${key[0].toUpperCase()}${key.slice(1)} is too long.` }), { status: 400 });
    }
  }
  if (!EMAIL_RE.test(email.trim())) {
    return new Response(JSON.stringify({ error: "Enter a valid email address." }), { status: 400 });
  }

  // Trimmed defensively: a copy-pasted env var value picking up a trailing
  // newline/space is the single most common cause of a Gmail 535 BadCredentials
  // rejection despite the credential itself being correct. Google displays the
  // app password as four space-separated groups for readability -- the actual
  // credential has no spaces, so strip all whitespace from it, not just the ends.
  const gmailUser = import.meta.env.GMAIL_USER?.trim();
  const gmailPass = import.meta.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (!gmailUser || !gmailPass) {
    // Fails loudly rather than silently pretending the message sent --
    // a misconfigured deploy should surface immediately, not swallow contact requests.
    console.error("GMAIL_USER / GMAIL_APP_PASSWORD not configured.");
    return new Response(JSON.stringify({ error: "Contact form isn't configured yet. Please try again later." }), { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass }
  });

  try {
    await transporter.sendMail({
      from: `"QR Workbench Contact Form" <${gmailUser}>`,
      to: RECIPIENT,
      replyTo: email.trim(),
      subject: `[QR Workbench] ${subject.trim()}`,
      text: `From: ${name.trim()} <${email.trim()}>\n\n${message.trim()}`,
      html: `<p><strong>From:</strong> ${escapeHtml(name.trim())} &lt;${escapeHtml(email.trim())}&gt;</p><p>${escapeHtml(message.trim()).replace(/\n/g, "<br>")}</p>`
    });
  } catch (err) {
    console.error("Contact form send failed:", err);
    return new Response(JSON.stringify({ error: "Couldn't send your message. Please try again." }), { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
