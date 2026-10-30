/** Fallback lead email via Resend's REST API — only used when GHL delivery fails (or in mock mode). */
import { business } from '../data/business';
import { env } from './env';
import { fetchWithRetry } from './ghl';
import { type Lead, noteBody, flatPayload } from './lead';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export async function sendFallbackEmail(lead: Lead, reason: string): Promise<boolean> {
  const key = env('RESEND_API_KEY');
  const to = env('FALLBACK_EMAIL_TO') || business.email;
  const from = env('FALLBACK_EMAIL_FROM') || 'A&H Website <onboarding@resend.dev>';
  if (!key) {
    console.error('[quote] fallback email skipped: RESEND_API_KEY not set');
    return false;
  }
  const text = `${noteBody(lead)}\n\n— Delivery note: ${reason}\n\nRaw payload:\n${JSON.stringify(flatPayload(lead), null, 2)}`;
  try {
    await fetchWithRetry('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `New quote: ${lead.firstName} – ${lead.zip} (website${reason ? ', CRM fallback' : ''})`,
        text,
        html: `<pre style="font:14px/1.5 ui-monospace,monospace;white-space:pre-wrap">${esc(text)}</pre>`,
        ...(lead.email ? { reply_to: lead.email } : {}),
      }),
    });
    return true;
  } catch (e) {
    console.error('[quote] fallback email failed:', e instanceof Error ? e.message : e);
    return false;
  }
}
