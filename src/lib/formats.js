function escapeWifi(value) {
  return String(value || "").replace(/([\\;,:"])/g, "\\$1");
}

export function buildWifiPayload({ ssid, password, security = "WPA", hidden = false }) {
  if (!ssid) return "";
  const type = security === "nopass" ? "nopass" : security === "WEP" ? "WEP" : "WPA";
  const pass = type === "nopass" ? "" : `P:${escapeWifi(password)};`;
  return `WIFI:T:${type};S:${escapeWifi(ssid)};${pass}H:${hidden ? "true" : "false"};;`;
}

function escapeVCard(value) {
  return String(value || "").replace(/([\\,;])/g, "\\$1").replace(/\n/g, "\\n");
}

export function buildVCardPayload({ firstName, lastName, org, title, phone, email, url, address }) {
  const fn = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (!fn && !org) return "";
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];
  lines.push(`N:${escapeVCard(lastName)};${escapeVCard(firstName)};;;`);
  lines.push(`FN:${escapeVCard(fn || org)}`);
  if (org) lines.push(`ORG:${escapeVCard(org)}`);
  if (title) lines.push(`TITLE:${escapeVCard(title)}`);
  if (phone) lines.push(`TEL;TYPE=CELL:${escapeVCard(phone)}`);
  if (email) lines.push(`EMAIL:${escapeVCard(email)}`);
  if (url) lines.push(`URL:${escapeVCard(url)}`);
  if (address) lines.push(`ADR;TYPE=WORK:;;${escapeVCard(address)};;;;`);
  lines.push("END:VCARD");
  return lines.join("\n");
}

export function buildEmailPayload({ to, subject, body }) {
  if (!to) return "";
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const qs = params.toString();
  return `mailto:${to}${qs ? "?" + qs : ""}`;
}

export function buildSmsPayload({ number, message }) {
  if (!number) return "";
  const params = new URLSearchParams();
  if (message) params.set("body", message);
  const qs = params.toString();
  return `sms:${number}${qs ? "?" + qs : ""}`;
}

export function buildPhonePayload({ number }) {
  if (!number) return "";
  return `tel:${number}`;
}

// wa.me requires digits only -- no leading +, spaces, or dashes -- so strip
// everything else rather than making the user format it correctly themselves.
export function buildWhatsAppPayload({ number, message }) {
  const digits = String(number || "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  const params = new URLSearchParams();
  if (message) params.set("text", message);
  const qs = params.toString();
  return `https://wa.me/${digits}${qs ? "?" + qs : ""}`;
}
