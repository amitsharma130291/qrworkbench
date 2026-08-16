export const TOOLS = [
  { slug: "url", name: "URL QR", href: "/url-qr-code-generator" },
  { slug: "wifi", name: "WiFi QR", href: "/wifi-qr-code-generator" },
  { slug: "vcard", name: "vCard QR", href: "/vcard-qr-code-generator" },
  { slug: "email", name: "Email QR", href: "/email-qr-code-generator" },
  { slug: "sms", name: "SMS QR", href: "/sms-qr-code-generator" },
  { slug: "phone", name: "Phone QR", href: "/phone-qr-code-generator" },
  { slug: "pdf", name: "PDF QR", href: "/pdf-qr-code-generator" },
  { slug: "google-forms", name: "Google Forms QR", href: "/google-forms-qr-code-generator" },
  { slug: "facebook", name: "Facebook QR", href: "/facebook-qr-code-generator" },
  { slug: "instagram", name: "Instagram QR", href: "/instagram-qr-code-generator" },
  { slug: "linkedin", name: "LinkedIn QR", href: "/linkedin-qr-code-generator" },
];

// Hand-picked, not just "next 3 in the list" -- each generator links to the
// ones a real visitor doing that task is next most likely to need.
export const RELATED = {
  url: ["pdf", "google-forms", "wifi"],
  wifi: ["vcard", "phone", "url"],
  vcard: ["email", "phone", "wifi"],
  email: ["sms", "phone", "vcard"],
  sms: ["email", "phone", "wifi"],
  phone: ["sms", "email", "vcard"],
  pdf: ["google-forms", "url", "email"],
  "google-forms": ["pdf", "url", "email"],
  facebook: ["instagram", "linkedin", "url"],
  instagram: ["facebook", "linkedin", "url"],
  linkedin: ["facebook", "instagram", "url"],
};

export function relatedTools(slug) {
  const slugs = RELATED[slug] || [];
  return slugs.map((s) => TOOLS.find((t) => t.slug === s)).filter(Boolean);
}

export function toolBySlug(slug) {
  return TOOLS.find((t) => t.slug === slug);
}
