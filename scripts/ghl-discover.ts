/**
 * Lists the GoHighLevel pipelines/stages and contact custom fields for the sub-account
 * and prints ready-to-paste GHL_* env lines.
 *
 *   1. Put GHL_PRIVATE_TOKEN and GHL_LOCATION_ID in .env.local
 *   2. npm run ghl:discover
 *
 * Read-only — it never creates or changes anything in GHL. The token is never printed.
 */
const BASE = 'https://services.leadconnectorhq.com';
const token = process.env.GHL_PRIVATE_TOKEN?.trim();
const locationId = process.env.GHL_LOCATION_ID?.trim();
const version = process.env.GHL_API_VERSION?.trim() || '2021-07-28';

if (!token || !locationId) {
  console.error('Missing GHL_PRIVATE_TOKEN or GHL_LOCATION_ID. Add them to .env.local first.');
  process.exit(1);
}

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Version: version, Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<any>;
}

// Which GHL custom-field names map to which env var (case/space-insensitive match).
const wanted: Record<string, string[]> = {
  GHL_CF_ITEMS: ['items', 'item types', 'junk items'],
  GHL_CF_LOAD_SIZE: ['load size', 'size'],
  GHL_CF_TIMING: ['timing', 'when', 'pickup timing'],
  GHL_CF_PREFERRED_CONTACT: ['preferred contact', 'contact method'],
  GHL_CF_NOTES: ['notes', 'quote notes'],
  GHL_CF_PHOTOS: ['photos', 'photo urls'],
  GHL_CF_UTM_SOURCE: ['utm source'],
  GHL_CF_UTM_MEDIUM: ['utm medium'],
  GHL_CF_UTM_CAMPAIGN: ['utm campaign'],
  GHL_CF_GCLID: ['gclid'],
  GHL_CF_LANDING_PAGE: ['landing page', 'page url'],
  GHL_CF_SMS_CONSENT: ['sms consent'],
};
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const lines: string[] = [`GHL_LOCATION_ID=${locationId}`, `GHL_API_VERSION=${version}`];

try {
  const { pipelines = [] } = await get(`/opportunities/pipelines?locationId=${encodeURIComponent(locationId)}`);
  console.log('\nPipelines:');
  for (const p of pipelines) {
    console.log(`  • ${p.name}  (${p.id})`);
    for (const s of p.stages ?? []) console.log(`      – ${s.name}  (${s.id})`);
  }
  const web = pipelines.find((p: any) => norm(p.name) === 'website leads') ?? pipelines[0];
  if (web) {
    lines.push(`GHL_PIPELINE_ID=${web.id}`, `GHL_STAGE_NEW_LEAD_ID=${web.stages?.[0]?.id ?? ''}`);
    if (norm(web.name) !== 'website leads') console.warn(`\n⚠ No "Website Leads" pipeline found — using "${web.name}". Create it and re-run.`);
  } else {
    console.warn('\n⚠ No pipelines found. Create "Website Leads" in GHL → Opportunities → Pipelines.');
  }
} catch (e) {
  console.error(`\nCould not list pipelines: ${(e as Error).message}`);
}

try {
  const { customFields = [] } = await get(`/locations/${encodeURIComponent(locationId)}/customFields?model=contact`);
  console.log('\nContact custom fields:');
  for (const f of customFields) console.log(`  • ${f.name}  [${f.dataType}]  (${f.id})`);
  for (const [envKey, names] of Object.entries(wanted)) {
    const hit = customFields.find((f: any) => names.includes(norm(f.name)));
    lines.push(`${envKey}=${hit?.id ?? ''}${hit ? '' : '   # not found — create a contact field named "' + names[0] + '"'}`);
  }
} catch (e) {
  console.error(`\nCould not list custom fields: ${(e as Error).message}`);
}

console.log('\n── Paste into .env.local and your host’s environment variables ──\n');
console.log(lines.join('\n'));
console.log('\n(GHL_PRIVATE_TOKEN is not printed — keep the one you already have.)');

export {};
