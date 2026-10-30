/**
 * Exercises POST /api/quote end-to-end with fetch mocked — GHL API, webhook and
 * Resend are never actually called. Covers the acceptance checklist's outage case.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const TOKEN = 'pit-SECRET-TOKEN-123';
let calls: { url: string; init: RequestInit; body: any }[] = [];
let responder: (url: string, init: RequestInit) => Response;

function form(overrides: Record<string, string | string[]> = {}) {
  const base: Record<string, string | string[]> = {
    items: ['furniture', 'estate'],
    zip: '77019',
    size: 'full-truck',
    when: 'tomorrow',
    firstName: 'James',
    phone: '(713) 555-0199',
    email: 'james@example.com',
    address: '',
    notes: 'Whole house',
    contact: 'text',
    website: '',
    t: String(Date.now() - 20_000),
    page: '/',
    utm_source: 'google',
    ...overrides,
  };
  const fd = new FormData();
  for (const [k, v] of Object.entries(base)) for (const x of [v].flat()) fd.append(k, x);
  return fd;
}

let ipCounter = 0;
async function post(fd: FormData, json = true) {
  vi.resetModules(); // fresh in-memory rate-limit / dedupe state
  const { POST } = await import('../src/pages/api/quote');
  const request = new Request('http://localhost/api/quote', {
    method: 'POST',
    body: fd,
    headers: { ...(json ? { Accept: 'application/json' } : {}), 'x-forwarded-for': `10.0.0.${++ipCounter}` },
  });
  const redirect = (path: string, status = 302) => new Response(null, { status, headers: { Location: path } });
  return (POST as any)({ request, clientAddress: '127.0.0.1', redirect }) as Promise<Response>;
}

beforeEach(() => {
  calls = [];
  for (const k of Object.keys(process.env)) if (/^(GHL_|RESEND_|FALLBACK_|BLOB_)/.test(k)) delete process.env[k];
  responder = (url) => {
    if (url.endsWith('/contacts/upsert')) return Response.json({ contact: { id: 'c_123' }, new: true });
    if (url.includes('/notes')) return Response.json({ note: { id: 'n_1' } });
    if (url.endsWith('/opportunities/')) return Response.json({ opportunity: { id: 'o_1' } });
    return Response.json({ ok: true });
  };
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init, body: init.body ? JSON.parse(String(init.body)) : null });
    return responder(url, init);
  }));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function apiEnv() {
  Object.assign(process.env, {
    GHL_MODE: 'api',
    GHL_PRIVATE_TOKEN: TOKEN,
    GHL_LOCATION_ID: 'loc_1',
    GHL_PIPELINE_ID: 'pipe_1',
    GHL_STAGE_NEW_LEAD_ID: 'stage_1',
    GHL_CF_ITEMS: 'cf_items',
    GHL_CF_SMS_CONSENT: 'cf_consent',
    RESEND_API_KEY: 're_test',
    FALLBACK_EMAIL_TO: 'owner@example.com',
  });
}

describe('POST /api/quote — GHL api mode', () => {
  it('upserts contact, adds note, creates opportunity', async () => {
    apiEnv();
    const res = await post(form());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, firstName: 'James' });

    const urls = calls.map((c) => c.url);
    expect(urls).toContain('https://services.leadconnectorhq.com/contacts/upsert');
    expect(urls).toContain('https://services.leadconnectorhq.com/contacts/c_123/notes');
    expect(urls).toContain('https://services.leadconnectorhq.com/opportunities/');
    expect(urls.some((u) => u.includes('resend'))).toBe(false);

    const upsert = calls.find((c) => c.url.endsWith('/contacts/upsert'))!;
    const headers = upsert.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(headers.Version).toBe('2021-07-28');
    expect(upsert.body).toMatchObject({
      locationId: 'loc_1', firstName: 'James', phone: '+17135550199', email: 'james@example.com',
      postalCode: '77019', city: 'Houston', state: 'TX', country: 'US', source: 'Website - Quote Form',
    });
    expect(upsert.body.tags).toEqual(['website-lead', 'quote-request', 'junk-furniture', 'junk-estate', 'when-tomorrow', 'zip-in-area']);
    expect(upsert.body.customFields).toContainEqual({ id: 'cf_items', field_value: 'Furniture, Estate Cleanout' });
    expect(upsert.body.customFields.find((f: any) => f.id === 'cf_consent').field_value).toMatch(/^yes \| \d{4}-\d\d-\d\dT[\d:]+-0[56]:00 \| \/$/);

    const opp = calls.find((c) => c.url.endsWith('/opportunities/'))!;
    expect(opp.body).toMatchObject({ pipelineId: 'pipe_1', pipelineStageId: 'stage_1', contactId: 'c_123', status: 'open', monetaryValue: 1100, name: 'Junk Quote – James – 77019 – Full truck+' });
  });

  it('GHL outage (bad token): user still sees success, fallback email sent, token never logged', async () => {
    apiEnv();
    responder = (url) => (url.includes('leadconnectorhq') ? new Response('{"message":"Invalid JWT"}', { status: 401 }) : Response.json({ id: 'email_1' }));
    const errors: string[] = [];
    (console.error as any).mockImplementation((...a: unknown[]) => errors.push(JSON.stringify(a)));

    const res = await post(form());
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);

    const email = calls.find((c) => c.url === 'https://api.resend.com/emails');
    expect(email).toBeTruthy();
    expect(email!.body.to).toEqual(['owner@example.com']);
    expect(email!.body.text).toContain('Phone: +17135550199');
    expect(email!.body.text).toContain('GHL api failed: contact');
    expect(errors.join('\n')).toContain('401');
    expect(errors.join('\n')).not.toContain(TOKEN);
    expect(errors.join('\n')).not.toContain('+17135550199'); // phone masked in logs
  });

  it('retries 5xx then succeeds', async () => {
    apiEnv();
    let n = 0;
    const ok = responder;
    responder = (url, init) => (url.endsWith('/contacts/upsert') && n++ < 2 ? new Response('busy', { status: 503 }) : ok(url, init));
    const res = await post(form());
    expect((await res.json()).ok).toBe(true);
    expect(calls.filter((c) => c.url.endsWith('/contacts/upsert'))).toHaveLength(3);
    expect(calls.some((c) => c.url.includes('resend'))).toBe(false);
  });

  it('note/opportunity failure after contact succeeds → fallback email, still ok', async () => {
    apiEnv();
    const ok = responder;
    responder = (url, init) => (url.endsWith('/opportunities/') ? new Response('bad', { status: 422 }) : ok(url, init));
    const res = await post(form());
    expect((await res.json()).ok).toBe(true);
    expect(calls.find((c) => c.url.includes('resend'))!.body.text).toContain('GHL api failed: opportunity');
  });
});

describe('POST /api/quote — other modes & guards', () => {
  it('webhook mode posts a flat payload', async () => {
    process.env.GHL_MODE = 'webhook';
    process.env.GHL_INBOUND_WEBHOOK_URL = 'https://hooks.example/abc';
    const res = await post(form());
    expect((await res.json()).ok).toBe(true);
    const hook = calls.find((c) => c.url === 'https://hooks.example/abc')!;
    expect(hook.body).toMatchObject({ first_name: 'James', phone: '+17135550199', postal_code: '77019', load_size: 'Full truck+', items: 'Furniture, Estate Cleanout' });
    expect(Object.values(hook.body).every((v) => typeof v !== 'object')).toBe(true);
  });

  it('mock mode (no creds) succeeds without external calls', async () => {
    const res = await post(form());
    expect((await res.json()).ok).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it('honeypot → fake success, nothing sent', async () => {
    apiEnv();
    const res = await post(form({ website: 'http://spam' }));
    expect((await res.json()).ok).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it('too-fast submit → fake success, nothing sent', async () => {
    apiEnv();
    const res = await post(form({ t: String(Date.now() - 500) }));
    expect((await res.json()).ok).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it('validation errors → 422 with field messages', async () => {
    const res = await post(form({ zip: '12', phone: '123', items: [] as any }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(Object.keys(body.errors).sort()).toEqual(['items', 'phone', 'zip']);
  });

  it('no-JS form post → 303 to /thank-you', async () => {
    const res = await post(form({ t: '' }), false);
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('/thank-you/?name=James');
  });

  it('no-JS validation failure → HTML error page', async () => {
    const res = await post(form({ zip: '' }), false);
    expect(res.status).toBe(422);
    expect(await res.text()).toContain('5-digit ZIP');
  });
});
