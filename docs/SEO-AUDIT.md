# QR Workbench: five new pages and site content SEO audit

Date: 18 September 2026. Changes are on `feat/qr-tools-seo-audit`, awaiting review and publication.

## Outcome

Built all five requested pages with practical workflows, distinct content, contextual internal links, and promotion of the existing $7 Batch Pass and $39 lifetime Pro. Added real XLSX import to both workspaces, website validation mode, free captioned PNG/SVG downloads, and a plain-text generator.

The built site contains **36 HTML pages**, of which **32 are indexable** and included in the sitemap. The repeatable HTML audit reports **zero failures** for its metadata, canonical, heading, JSON-LD parsing, internal-link/anchor, and sitemap checks. This is a statement about those checks, not a guarantee of Google indexing or rankings.

## Audit of the five new pages

| Route | Editorial words* | Contextual inbound pages* | Distinct value |
|---|---:|---:|---|
| `/bulk-wifi-qr-code-generator` | 523 | 7 | Per-network credentials, batch-wide security settings, credential distribution, and router testing. |
| `/bulk-url-qr-code-generator` | 527 | 8 | Website-specific syntax validation and traceable named outputs. |
| `/qr-code-generator-from-excel` | 610 | 10 | Native XLSX import, worksheet selection, formulas, and stored versus displayed values. |
| `/qr-code-generator-with-text` | 442 | 8 | Visible caption outside the pattern, combined image export, and readable labeling. |
| `/text-qr-code-generator` | 422 | 6 | Offline message inside the pattern, preserved line breaks, and capacity handling. |

*Editorial counts exclude shared navigation, footer, pricing promotions, and tool-shell controls. Counts are descriptive, not minimum SEO requirements. Inbound counts exclude self-links and shared navigation/footer/promotion links; each source page is counted once.*

All five have one H1, a unique title and description, a self-referencing www canonical, crawlable server-rendered content, visible FAQs matching FAQ JSON-LD, and sitemap inclusion. The workflow pages have visible Home breadcrumbs and matching BreadcrumbList data; the text generator uses the existing tool breadcrumb layout.

The navigation and footer expose every new page. Contextual links connect WiFi → bulk WiFi, URL → validated bulk URLs, CSV → Excel, inventory → captions/text/Excel, and labels → single captioned downloads. New pages link back to their single tools, adjacent workflows, labels, and pricing where relevant. The homepage provides production-workflow discovery.

Paid promotion uses the repository’s current entitlements: 20 free codes per batch; $7 for one file and worksheet up to 5,000; $39 once for lifetime Pro, repeated batches, batch logos, and PDF label export. Single text and captioned image downloads remain free. Batch Pass is explicitly distinguished from Pro PDF export.

## Verified issues fixed

| Finding | Fix |
|---|---|
| Bulk, CSV, and vCard copy implied no export limits. | Replaced with actual free/Batch Pass/Pro limits and the 20 MB import limit. |
| Existing bulk and CSV pages said native Excel import was unavailable. | Implemented .xlsx import and worksheet selection in both bulk and label workspaces; updated contradictory guidance. |
| CSV parser broke quoted multiline messages and could silently overwrite duplicate headers. | Added quoted multiline parsing, escaped-quote support, BOM handling, preserved cell whitespace, and unique/nonempty-header validation. |
| Caption previews could be mistaken for captions in individual bulk exports. | Explained the output distinction and provided actual combined captioned PNG/SVG exports. |
| Inventory guidance implied a visible damage percentage guarantees scanning. | Replaced that claim with codeword-recovery limits and physical print testing. |
| Logo copy promised reliable scanning after overlays. | Replaced guarantees with scan-testing instructions and modest-logo guidance. |
| Spotify copy guaranteed public playback without an account. | Qualified playback/sign-in behavior by device, account, region, and platform rules. |
| Three workflow guides described themselves in structured data as standalone software. | Changed business-card, inventory, and CSV guide schema to WebPage; retained visible FAQ schema. |
| Documentation was a “coming soon” stub. | Replaced with usable import, mapping, format, export, and plan instructions; retained noindex. |
| Bulk sidebar linked to a nonexistent #generate anchor. | Added the actual generation anchor. |
| Several descriptions were verbose and risked unclear snippets. | Rewrote 11 descriptions into concise, task-specific summaries. |
| Shared social-image alternative text and homepage title used the old format count. | Replaced count-specific wording with current product descriptions. |
| Imported spreadsheet headings and captions were inserted as HTML. | Switched to literal DOM option/text creation; verified markup stays inert. |
| Oversized input could leave generator errors unhandled. | Disabled downloads on failure and allowed recovery after shortening input. |
| XLSX worksheet changes needed purchase-scope and checkout-resume handling. | Scoped new Excel jobs to file plus worksheet; retained existing CSV file hashes and restored mapping/type/security after checkout. |

## Duplicate, thin, and scaled-content assessment

No duplicate titles or descriptions, identical indexable pages, or broken internal page/fragment links were found in the built output. Similarity testing compares five-word shingles in editorial content after shared interface material is removed. The largest pairwise Jaccard overlap is **4.9%** (general bulk versus bulk vCard). That metric cannot detect semantic duplicates by itself.

The most important intent overlaps were reviewed separately. General bulk is the cross-format hub; bulk URL adds a URL-validation mode; WiFi and vCard build different structured payloads. CSV explains text-file rules; Excel covers native workbook behavior and worksheet selection. Encoded text and printed captions solve different tasks. Label sheets create paginated PDFs, while captioned downloads create one combined image. Business-card and inventory pages explain placement decisions and production contexts. These distinctions support keeping the pages separate rather than adding redirects or cross-page canonicals.

No indexable placeholder or empty tool page was found. Existing indexed pages combine functioning tools or specific workflow guidance with relevant input, destination, or printing decisions. The documentation placeholder was fixed. `/bulk`, `/labels`, `/docs`, and `/404` remain noindex and excluded from the sitemap; those exclusions were verified. Word count alone was not used to decide whether content is thin.

There is no evidence in this review that the five additions are merely synonym pages. They have distinct workflows, examples, limitations, and outputs. Shared layouts and common pricing do not alone establish scaled-content abuse. Future mass/multiple/batch, sticker/label-maker, or non-expiring synonyms should be consolidated unless they add a demonstrably different user task. This review cannot determine Google’s spam classification or infer all publishing history.

## Route-by-route content decisions

Each indexable page below was retained for the stated task. Company/legal pages serve identity, contact, or policy needs rather than tool-keyword expansion.

| Indexed route | Purpose supporting retention |
|---|---|
| `/` | Tool discovery, single generation, production demonstrations, and plan selection. |
| `/about` | Product ownership, browser processing, and the static QR model. |
| `/bulk-qr-code-generator` | General batch production across text, links, WiFi, and vCards. |
| `/bulk-url-qr-code-generator` | Website-specific syntax validation and traceable named outputs. |
| `/bulk-vcard-qr-code-generator` | Contact-field mapping and one properly formatted contact payload per person. |
| `/bulk-wifi-qr-code-generator` | Per-network credentials, batch-wide security settings, credential distribution, and router testing. |
| `/contact` | Working contact form and support expectations. |
| `/disclaimer` | Limits of QR availability, third-party destinations, and printing advice. |
| `/email-qr-code-generator` | Recipient, subject, body, and mail-client behavior. |
| `/facebook-qr-code-generator` | Page versus Event versus Group destination selection. |
| `/google-forms-qr-code-generator` | Form access, short links, prefill links, and scan destination testing. |
| `/instagram-qr-code-generator` | Profile versus post/reel links and username changes. |
| `/linkedin-qr-code-generator` | Personal versus company profile links and profile visibility. |
| `/pdf-qr-code-generator` | Hosted-document links, permissions, and stable file access. |
| `/phone-qr-code-generator` | Country-code formatting and dialer prompt behavior. |
| `/pricing` | Current Free, Batch Pass, and lifetime Pro entitlements. |
| `/privacy-policy` | Data handling and third-party service disclosures. |
| `/qr-code-generator-for-business-cards` | Contact versus portfolio choice, card sizing, design placement, and team production. |
| `/qr-code-generator-for-inventory` | SKU/asset records, placement identifiers, print materials, and label production. |
| `/qr-code-generator-from-csv` | CSV delimiters, quoted fields, headers, missing values, and filenames. |
| `/qr-code-generator-from-excel` | Native XLSX import, worksheet selection, formulas, and stored versus displayed values. |
| `/qr-code-generator-with-text` | Visible caption outside the pattern, combined image export, and readable labeling. |
| `/qr-code-label-generator` | A4/Letter grid, stock alignment, pagination, captions, and Pro PDF export. |
| `/sms-qr-code-generator` | Number and prefilled message with SMS-device caveats. |
| `/spotify-qr-code-generator` | Share destinations, standard QR versus Spotify Codes, and playback caveats. |
| `/terms` | Service and purchase terms. |
| `/text-qr-code-generator` | Offline message inside the pattern, preserved line breaks, and capacity handling. |
| `/url-qr-code-generator` | One website destination, static URL limitations, and print/download choices. |
| `/vcard-qr-code-generator` | One contact payload with mapped personal details. |
| `/whatsapp-qr-code-generator` | Digits-only wa.me addressing and prefilled chat messages. |
| `/wifi-qr-code-generator` | One SSID/password connection payload, encryption choice, and hidden-network input. |
| `/youtube-qr-code-generator` | Video/channel/playlist links and timestamps. |

## Live-site verification before publication

Crawled all 27 deployed sitemap URLs plus app/help/error routes and host, slash, query, redirect, and robots cases: 39 HTTP checks. The deployed sitemap pages returned 200 with unique metadata and one H1. The non-www HTTPS origin redirects to www; HTTP redirects to HTTPS; a non-www HTTP request takes two redirects. The batch synonym returns 301 to bulk. Trailing-slash tool requests return 308 to the slashless route. A query variant retains its clean canonical. Missing pages and /404 return HTTP 404. The robots file is available and references the sitemap. Existing valid redirects were preserved.

The live crawl is a pre-publication snapshot. It does not contain the five new URLs. The new sitemap and HTML checks apply to the locally built proposed changes.

## Validation

- Production build passed.
- Six data/encoding tests passed.
- Fourteen browser checks passed against the production assets, including mobile layouts, XLSX import in both workspaces, worksheet changes, leading-zero text IDs, URL filtering, literal spreadsheet markup, the free 20-row export cap, and invalid-upload handling.
- Exported text, website, WiFi, and captioned QR images were decoded programmatically and matched the intended payloads.
- Captioned SVG parsed without XML errors; PNG and SVG included the caption and preserved the encoded URL.
- Desktop caption-tool and mobile WiFi-page screenshots were visually inspected.
- HTML SEO audit and whitespace/diff checks passed.

Run `npm test`, start a local server and run `npm run test:browser`, then run `npm run build` and `npm run audit:seo`. Browser tests use installed Microsoft Edge by default. Set TEST_BASE_URL to test another local preview. The SEO command requires Python. Raw measurements are in `seo-audit-results.json`; deployed responses are in `live-seo-snapshot.json`.

## Remaining verification after publication

After merge/deployment, verify the five live URLs and sitemap, then use Search Console URL Inspection to confirm Google-selected canonicals and request indexing where appropriate. Search Console coverage, manual actions, external plagiarism/backlinks, keyword volumes, real-user Core Web Vitals, and paid checkout transactions were not available or tested in this content-focused audit. No live purchase was made. Those omissions are not represented as passed checks.

## Policy references

- [Google: duplicate URL consolidation](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google: scaled-content abuse and spam policies](https://developers.google.com/search/docs/essentials/spam-policies)
- [Google: SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
