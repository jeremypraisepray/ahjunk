/**
 * GoHighLevel delivery. Server-side only — the token never reaches the browser.
 *
 * Modes (GHL_MODE): `api` (API v2 + Private Integration Token), `webhook`
 * (Workflow inbound webhook), `mock` (log only). Unset → picks api/webhook if
 * their credentials exist, else mock.
 */
import { business } from '../data/business';
import { env } from './env';
import {
  type Lead, leadTags, noteBody, opportunityName, estimateValue, customFieldValues, flatPayload, maskPhone,
} from './lead';

export const GHL_BASE = 'https://services.leadconnectorhq.com';

export type DeliveryResult = {
  mode: 'api' | 'webhook' | 'mock';
  contactId?: string;
  /** Steps that failed after retries. Empty = everything landed. */
  failed: ('contact' | 'note' | 'opportunity' | 'webhook')[];
  errors: string[];
};

export interface LeadSink {
  deliver(lead: Lead): Promise<DeliveryResult>;
}

export function resolveMode(): DeliveryResult['mode'] {
  const m = env('GHL_MODE').toLowerCase();
  if (m === 'api' || m === 'webhook' || m === 'mock') return m;
  if (env('GHL_PRIVATE_TOKEN') && env('GHL_LOCATION_ID')) return 'api';
  if (env('GHL_INBOUND_WEBHOOK_URL')) return 'webhook';
  return 'mock';
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch with 8s timeout, 2 retries on network/429/5xx, honoring Retry-After. */
export async function fetchWithRetry(url: string, init: RequestInit, opts = { retries: 2, timeoutMs: 8000, baseDelayMs: 500 }) {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(opts.timeoutMs) });
      if (res.ok) return res;
      const text = (await res.text().catch(() => '')).slice(0, 300);
      const err = new HttpError(res.status, `HTTP ${res.status}: ${text}`);
      if (res.status !== 429 && res.status < 500) throw err; // not retryable
      lastErr = err;
      const retryAfter = Number(res.headers.get('retry-after'));
      if (attempt < opts.retries) {
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 5000) : opts.baseDelayMs * 2 ** attempt);
      }
    } catch (e) {
      if (e instanceof HttpError && e.status !== 429 && e.status < 500) throw e;
      lastErr = e;
      if (attempt < opts.retries) await sleep(opts.baseDelayMs * 2 ** attempt);
    }
  }
  throw lastErr;
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/Bearer\s+\S+/gi, 'Bearer [redacted]');

export class GhlApiSink implements LeadSink {
  constructor(
    private cfg = {
      token: env('GHL_PRIVATE_TOKEN'),
      locationId: env('GHL_LOCATION_ID'),
      version: env('GHL_API_VERSION') || '2021-07-28',
      pipelineId: env('GHL_PIPELINE_ID'),
      stageId: env('GHL_STAGE_NEW_LEAD_ID'),
    },
  ) {}

  private headers() {
    return {
      Authorization: `Bearer ${this.cfg.token}`,
      Version: this.cfg.version,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async post(path: string, body: unknown) {
    const res = await fetchWithRetry(`${GHL_BASE}${path}`, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) });
    return res.json().catch(() => ({}));
  }

  contactBody(lead: Lead) {
    const values = customFieldValues(lead);
    const customFields = Object.entries(values)
      .map(([envKey, value]) => ({ id: env(envKey), field_value: value }))
      .filter((f) => f.id && f.field_value);
    return {
      locationId: this.cfg.locationId,
      firstName: lead.firstName,
      phone: lead.phone,
      ...(lead.email ? { email: lead.email } : {}),
      ...(lead.address ? { address1: lead.address } : {}),
      postalCode: lead.zip,
      ...(lead.zipArea ? { city: business.city } : {}),
      state: business.region,
      country: business.country,
      source: 'Website - Quote Form',
      tags: leadTags(lead),
      customFields,
    };
  }

  async deliver(lead: Lead): Promise<DeliveryResult> {
    const out: DeliveryResult = { mode: 'api', failed: [], errors: [] };
    try {
      const data = await this.post('/contacts/upsert', this.contactBody(lead));
      out.contactId = data?.contact?.id;
      if (!out.contactId) throw new Error('upsert returned no contact id');
    } catch (e) {
      out.failed.push('contact');
      out.errors.push(`contact: ${errMsg(e)}`);
      return out;
    }
    const [note, opp] = await Promise.allSettled([
      this.post(`/contacts/${out.contactId}/notes`, { body: noteBody(lead) }),
      this.cfg.pipelineId && this.cfg.stageId
        ? this.post('/opportunities/', {
            locationId: this.cfg.locationId,
            pipelineId: this.cfg.pipelineId,
            pipelineStageId: this.cfg.stageId,
            contactId: out.contactId,
            status: 'open',
            name: opportunityName(lead),
            source: 'Website',
            monetaryValue: estimateValue(lead.size),
          })
        : Promise.reject(new Error('GHL_PIPELINE_ID / GHL_STAGE_NEW_LEAD_ID not set')),
    ]);
    if (note.status === 'rejected') { out.failed.push('note'); out.errors.push(`note: ${errMsg(note.reason)}`); }
    if (opp.status === 'rejected') { out.failed.push('opportunity'); out.errors.push(`opportunity: ${errMsg(opp.reason)}`); }
    return out;
  }
}

export class GhlWebhookSink implements LeadSink {
  constructor(private url = env('GHL_INBOUND_WEBHOOK_URL')) {}
  async deliver(lead: Lead): Promise<DeliveryResult> {
    try {
      if (!this.url) throw new Error('GHL_INBOUND_WEBHOOK_URL not set');
      await fetchWithRetry(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flatPayload(lead)),
      });
      return { mode: 'webhook', failed: [], errors: [] };
    } catch (e) {
      return { mode: 'webhook', failed: ['webhook'], errors: [`webhook: ${errMsg(e)}`] };
    }
  }
}

export class MockSink implements LeadSink {
  async deliver(lead: Lead): Promise<DeliveryResult> {
    console.info('[quote:mock] lead received', {
      name: lead.firstName,
      phone: maskPhone(lead.phone),
      zip: lead.zip,
      items: lead.items,
      size: lead.size,
      when: lead.when,
      photos: lead.photoUrls.length,
    });
    return { mode: 'mock', failed: [], errors: [] };
  }
}

export function createSink(mode = resolveMode()): LeadSink {
  if (mode === 'api') return new GhlApiSink();
  if (mode === 'webhook') return new GhlWebhookSink();
  return new MockSink();
}
