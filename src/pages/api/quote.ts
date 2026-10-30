/**
 * POST /api/quote — quote form handler (serverless).
 * Accepts multipart/form-data from the JS form (fetch, Accept: application/json)
 * and from the no-JS fallback (plain form post → 303 to /thank-you).
 */
import type { APIRoute } from 'astro';
import { quoteSchema } from '../../lib/quote-schema';
import { MIN_FILL_MS, validateAll, type QuoteFields } from '../../lib/quote';
import { buildLead, maskPhone } from '../../lib/lead';
import { createSink, resolveMode } from '../../lib/ghl';
import { sendFallbackEmail } from '../../lib/email';
import { pickPhotos, uploadPhotos } from '../../lib/photos';
import { rateLimited, isDuplicate } from '../../lib/guard';
import { business } from '../../data/business';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function errorPage(errors: string[]) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Check your quote request | ${esc(business.name)}</title>
<style>body{font:18px/1.5 system-ui,sans-serif;max-width:36rem;margin:3rem auto;padding:0 1rem;color:#080D16}a{color:#0248A9}li{margin:.25rem 0}</style></head>
<body><h1>Almost there — please fix a couple of things</h1><ul>${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
<p>Use your browser’s back button to fix your answers (they should still be there), <a href="/#quote">start over</a>, or call <a href="${business.phone.tel}">${business.phone.display}</a>.</p></body></html>`;
  return new Response(html, { status: 422, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export const POST: APIRoute = async ({ request, clientAddress, redirect }) => {
  const wantsJson = (request.headers.get('accept') || '').includes('application/json');
  const ok = (firstName = '') =>
    wantsJson ? json({ ok: true, firstName }) : redirect(`/thank-you/${firstName ? `?name=${encodeURIComponent(firstName)}` : ''}`, 303);

  let ip = 'unknown';
  try { ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || clientAddress || 'unknown'; } catch { /* clientAddress throws when unavailable */ }
  // Skipped under `astro dev` so local testing/QA isn't throttled.
  if (!import.meta.env.DEV && rateLimited(ip)) return json({ ok: false, error: 'Too many requests. Please call or text us instead.' }, 429);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: 'Bad request' }, 400);
  }

  // Spam: honeypot filled, or submitted faster than a human could (JS sets `t`).
  const started = Number(form.get('t') || 0);
  if (String(form.get('website') || '').trim() || (started > 0 && Date.now() - started < MIN_FILL_MS)) {
    console.warn('[quote] spam check tripped');
    return ok();
  }

  const str = (k: string) => String(form.get(k) ?? '');
  const raw = {
    items: form.getAll('items').map(String),
    zip: str('zip'),
    size: str('size'),
    when: str('when'),
    firstName: str('firstName'),
    phone: str('phone'),
    email: str('email'),
    address: str('address'),
    notes: str('notes'),
    contact: str('contact') || 'text',
    page: str('page') || new URL(request.headers.get('referer') || '/', 'http://x').pathname,
    utm_source: str('utm_source'),
    utm_medium: str('utm_medium'),
    utm_campaign: str('utm_campaign'),
    gclid: str('gclid'),
  };
  const parsed = quoteSchema.safeParse(raw);

  if (!parsed.success) {
    // Friendly messages from the shared rules first; zod's structural issues fill any gaps.
    const errors: Record<string, string> = { ...validateAll(raw as QuoteFields) };
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0] ?? 'form');
      errors[k] ??= issue.code === 'custom' ? issue.message : `Please check ${k}.`;
    }
    return wantsJson ? json({ ok: false, errors }, 422) : errorPage(Object.values(errors));
  }

  const quote = parsed.data;
  if (await isDuplicate(quote.phone)) return ok(quote.firstName);

  const { urls, skipped } = await uploadPhotos(pickPhotos(form.getAll('photos')));
  const lead = buildLead(quote, urls);
  if (skipped) lead.notes = `${lead.notes}${lead.notes ? '\n' : ''}[${skipped} photo(s) attached but could not be stored]`.trim();

  const mode = resolveMode();
  const result = await createSink(mode).deliver(lead);

  if (result.failed.length) {
    console.error('[quote] GHL delivery problem', { mode, failed: result.failed, errors: result.errors, phone: maskPhone(lead.phone) });
    await sendFallbackEmail(lead, `GHL ${mode} failed: ${result.failed.join(', ')}`);
  } else if (mode === 'mock') {
    // No CRM configured — email so the lead isn't lost (no-op if Resend isn't set up either).
    await sendFallbackEmail(lead, 'CRM not configured (GHL_MODE=mock)');
  }

  // The lead is never lost to the user: they always see success once validation passes.
  return ok(quote.firstName);
};

export const ALL: APIRoute = () => json({ ok: false, error: 'Method not allowed' }, 405);
