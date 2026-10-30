# A&H Junk Removal — website

Fast, Houston-local lead site for **A&H Junk Removal**. Built with **Astro 6** (static pages) + one serverless
function (`/api/quote`) that sends quote requests into **GoHighLevel**. Hosted on **Vercel**.

- Home page: hero quote form above the fold on every device, trust bar, services, how-it-works, gallery,
  pricing, reviews, service-area map + ZIP checker, why-us, FAQ, CTA.
- Sub-pages: `/services/[slug]` (10), `/areas/[slug]` (25), `/privacy`, `/terms`, `/thank-you`, `404`.
- No UI framework, no jQuery, no map embeds. Total client JS on the home page ≈ 9 KB gzipped.

## Quick start

```bash
npm install
npm run dev          # http://localhost:4321  (quote form runs in mock mode — nothing leaves your machine)
npm test             # unit + API tests (GHL / Resend calls are mocked)
npm run build        # production build (.vercel/output)
```

Node ≥ 22.12. Astro 6 is used (Astro 7 needs Node ≥ 22.23).

## Where things live

| What | File |
|---|---|
| **All business facts** (name, phone, hours, rating, pricing, socials, owner, …) | `src/data/business.ts` |
| Services + quote-form item chips | `src/data/services.ts` |
| Service areas, ZIPs, map positions, area-page copy | `src/data/areas.ts` |
| Reviews (edit freely) | `src/data/reviews.json` |
| FAQ (also emitted as FAQPage JSON-LD) | `src/data/faq.ts` |
| Gallery photos / captions / before-after pairs | `src/data/gallery.ts` |
| Quote form (markup / behavior) | `src/components/quote/QuoteForm.astro`, `src/scripts/quote-form.ts` |
| Validation rules shared by browser + server | `src/lib/quote.ts` (+ zod schema in `src/lib/quote-schema.ts`) |
| Form handler | `src/pages/api/quote.ts` |
| GoHighLevel client (api / webhook / mock) | `src/lib/ghl.ts`, field mapping in `src/lib/lead.ts` |
| Fallback email (Resend) / photo storage (Vercel Blob) | `src/lib/email.ts`, `src/lib/photos.ts` |
| Brand tokens, type, buttons | `src/styles/global.css` |

Change a phone number, price or hour in `business.ts` and it updates everywhere — page copy, footer, JSON-LD,
sticky bar, form success message.

## Environment variables

Copy `.env.example` → `.env.local` (gitignored) for local work. In production set the same keys in
**Vercel → Project → Settings → Environment Variables**. Never commit real values; never prefix server keys
with `PUBLIC_`.

| Key | Needed for |
|---|---|
| `GHL_MODE` | `api` \| `webhook` \| `mock`. Leave blank to auto-pick (api if token + location exist). |
| `GHL_PRIVATE_TOKEN`, `GHL_LOCATION_ID`, `GHL_API_VERSION` | GoHighLevel API v2 |
| `GHL_PIPELINE_ID`, `GHL_STAGE_NEW_LEAD_ID` | Opportunity in "Website Leads → New Lead" |
| `GHL_CF_*` | Contact custom-field IDs (items, load size, timing, photos, UTM, gclid, SMS consent, …) |
| `GHL_INBOUND_WEBHOOK_URL` | Only for `GHL_MODE=webhook` |
| `RESEND_API_KEY`, `FALLBACK_EMAIL_TO`, `FALLBACK_EMAIL_FROM` | Backup email if GHL fails |
| `BLOB_READ_WRITE_TOKEN` | Storing quote photos (Vercel → Storage → Blob) |
| `PUBLIC_GA4_ID`, `PUBLIC_GADS_ID`, `PUBLIC_GADS_LEAD_LABEL`, `PUBLIC_GADS_CALL_LABEL` | Analytics / Ads conversions (optional) |

### Hooking up GoHighLevel

In the **sub-account** (not agency view):

1. **Private Integration Token** — Settings → Private Integrations → Create → "A&H Website". Scopes:
   `contacts.write`, `contacts.readonly`, `opportunities.write`, `opportunities.readonly`,
   `locations/customFields.readonly`. Copy the token (shown once) straight into `.env.local` / Vercel.
2. **Location ID** — from the URL: `app.gohighlevel.com/v2/location/<LOCATION_ID>/…`
3. **Pipeline** — create "Website Leads" with stages New Lead → Contacted → Quoted → Booked → Completed → Lost.
4. **Contact custom fields** (single/multi-line text): Items, Load Size, Timing, Preferred Contact, Notes,
   Photos, UTM Source, UTM Medium, UTM Campaign, GCLID, Landing Page, SMS Consent.
5. Run `npm run ghl:discover` — it lists pipelines, stages and fields (read-only) and prints the `GHL_*` lines
   to paste into `.env.local` and Vercel.
6. Submit a test quote with a test phone number, confirm the contact (tags + fields), note and opportunity,
   then delete the test contact.

**Token rotation:** revoke in Settings → Private Integrations, create a new one, update Vercel env, redeploy.

**Simpler alternative:** a GHL Workflow with the *Inbound Webhook* trigger. Set `GHL_MODE=webhook` and
`GHL_INBOUND_WEBHOOK_URL`; the function posts a flat JSON payload (`first_name`, `phone`, `items`,
`load_size`, `summary`, …) that you map in the workflow.

### What happens on submit

1. Validate (same rules as the browser), honeypot + 3-second fill check, 5 requests / 10 min per IP,
   duplicate guard (same phone in the same minute).
2. Upload photos (client already resized them to ≤ 1600 px JPEG) to Vercel Blob → public, unguessable URLs.
3. GHL: upsert contact (E.164 phone, tags `website-lead`, `quote-request`, `junk-*`, `when-*`,
   `zip-in-area`/`zip-check-needed`, custom fields) → note with a readable summary → opportunity
   (value from load size: 150 / 300 / 550 / 1,100 / 0).
4. 8 s timeout per call, 2 retries with backoff on 429/5xx (honors `Retry-After`).
5. Any GHL failure → fallback email with the full lead to `FALLBACK_EMAIL_TO`; the customer **still sees
   success**. Logs mask phone numbers and never include the token.

### GHL automations to set up (in GHL, not code)

- **Trigger:** Contact Tag Added = `website-lead` (or Opportunity Created in Website Leads).
- **Speed-to-lead text** (within 1 min): "Hey {first}, this is A&H Junk Removal 🚛 — got your quote request
  for {items}. Reply with any photos and we'll get you a price fast!"
- **Internal alert** to the owner's phone with the summary + contact link.
- **After-hours branch** (outside 7 AM–7 PM CT): "We'll reach out at 7 AM."
- Requires SMS (LC Phone + A2P 10DLC registration) on the sub-account. The form's consent line and the
  Privacy Policy's "we don't share mobile numbers" clause are written for A2P review.

## Deploying (Vercel)

1. Import the repo in Vercel (framework preset: Astro — auto-detected).
2. Add the env vars above (Production + Preview).
3. Create a Blob store (Storage → Blob) and connect it — this sets `BLOB_READ_WRITE_TOKEN`.
4. Point the domain. Old WordPress paths (`/home-page`, `/contact`, `/about`, …) 301 via `astro.config.mjs`
   `redirects` — add any other indexed WP URLs there.

## Quality checks

```bash
npm test                       # 28 unit/API tests incl. simulated GHL outage
npm run dev & npm run qa       # Playwright + axe walk-through of the acceptance checklist;
                               # saves screenshots to docs/screens/
```

Last run (local, Lighthouse 13 mobile on the production build):

| Page | Perf | A11y | Best Pr. | SEO | LCP (slow 4G sim.) | CLS |
|---|---|---|---|---|---|---|
| `/` | 100 | 100 | 100 | 100 | 1.8 s | 0 |
| `/areas/bellaire/` | 100 | 100 | 100 | 100 | 1.6 s | 0 |
| `/services/estate-cleanouts/` | 98–99 | 100 | 100 | 100 | 2.3 s | 0 |

Maintenance scripts: `npm run images` (favicons + OG image from the logo), `scripts/subset-fonts.sh`
(self-hosted, subset WOFF2 — needs `pip install fonttools brotli`).

## Open items for the owner — `TODO(owner)`

Search the code for `TODO(owner)`; everything is in `src/data/` unless noted.

1. **Google Business Profile** — rename it to "A&H Junk Removal" (NAP consistency), then paste the rating,
   review count, "read reviews" link and "leave a review" link into `business.google`. While
   `reviewCount` is `null`, no count is shown and no `aggregateRating` is emitted in JSON-LD.
2. **Real Google reviews** → `reviews.json` (set `"source": "google"` only for reviews copied from Google).
3. **Pricing** — confirm $150 / $550 / $1,100 starting prices and the "confirmed on-site before we lift"
   policy (the old site said both "what we quote is what you pay" and "final quote on-site").
4. **Owner** — first name, photo, short story, founding year (`business.owner`, `foundedYear`). The owner
   card stays hidden until a name is set.
5. **Real job photos** — especially before/after pairs. Add `after` to an item in `gallery.ts` and it becomes
   a drag-to-compare slider. Only caption a Houston neighborhood once you confirm where the job was.
6. **Texts** — confirm (346) 599-8378 accepts SMS (the "Text a Photo" buttons use it).
7. **Response promise** — success screen says "within 15 minutes during business hours"
   (`business.responseMinutes`).
8. **Services to confirm** — storm/flood, yard/fence/shed, move-out, mattress (marked `confirm: true`).
9. **Areas to confirm** — the 16 added areas beyond the original 9 (`primary: false` in `areas.ts`), and
   write a real local paragraph for each area page (`TODO(copy)`).
10. **What we can't take** list, payment methods (FAQ), appliance-disconnect policy.
11. **Insurance carrier / license # / badges** (BBB, Nextdoor, Angi …) — text "Licensed & Insured" only for now.
12. **Socials** — add URLs to `business.socials`; icons render only when a URL exists.
13. **"Hablamos Español"** — set `business.spanish = true` if the crew speaks Spanish.
14. **Transparent logo (PNG/SVG)** — the header uses the square logo as a rounded tile for now.
15. **Privacy Policy / Terms** — have them reviewed before launch.
