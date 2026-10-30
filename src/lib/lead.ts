/** Pure functions that turn a validated quote into CRM-ready pieces. No I/O — unit tested. */
import { business, loadSizes, timings, contactMethods } from '../data/business';
import { quoteItems } from '../data/services';
import { checkZip } from './quote';
import type { Quote } from './quote-schema';

export type Lead = Quote & {
  photoUrls: string[];
  submittedAt: string; // ISO with Houston offset
  zipArea: string | null;
  smsConsent: string; // "yes | <timestamp> | <page>"
};

const label = (list: readonly { id: string; label: string }[], id: string) => list.find((x) => x.id === id)?.label ?? id;

export function itemLabels(items: string[]) {
  return items.map((id) => label(quoteItems, id));
}

/** ISO-8601 timestamp in America/Chicago with offset, e.g. 2026-10-29T23:25:00-05:00 */
export function houstonTimestamp(d = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: business.timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
      timeZoneName: 'longOffset',
    }).formatToParts(d).map((p) => [p.type, p.value]),
  );
  const off = (parts.timeZoneName as string).replace('GMT', '') || '+00:00';
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${off}`;
}

export function buildLead(q: Quote, photoUrls: string[], now = new Date()): Lead {
  const zip = checkZip(q.zip);
  const submittedAt = houstonTimestamp(now);
  return {
    ...q,
    photoUrls,
    submittedAt,
    zipArea: zip.status === 'served' ? zip.area : null,
    smsConsent: `yes | ${submittedAt} | ${q.page || '/'}`,
  };
}

export function leadTags(l: Lead) {
  const tags = ['website-lead', 'quote-request'];
  for (const id of l.items) {
    const t = quoteItems.find((x) => x.id === id)?.tag;
    if (t) tags.push(t);
  }
  tags.push(`when-${l.when}`);
  tags.push(l.zipArea ? 'zip-in-area' : 'zip-check-needed');
  return tags;
}

export function estimateValue(sizeId: string) {
  return loadSizes.find((s) => s.id === sizeId)?.estimate ?? 0;
}

export function opportunityName(l: Lead) {
  return `Junk Quote – ${l.firstName} – ${l.zip} – ${label(loadSizes, l.size)}`;
}

/** Readable summary for the GHL note and the fallback email. */
export function noteBody(l: Lead) {
  const src = [l.utm_source, l.utm_medium, l.gclid ? `gclid=${l.gclid}` : ''].filter(Boolean).join(' / ') || 'direct';
  return [
    `🚛 NEW WEBSITE QUOTE — ${business.name}`,
    `Name: ${l.firstName}  |  Phone: ${l.phone}${l.email ? `  |  Email: ${l.email}` : ''}`,
    `Items: ${itemLabels(l.items).join(', ')}`,
    `Load size: ${label(loadSizes, l.size)}`,
    `When: ${label(timings, l.when)}`,
    `ZIP: ${l.zip} (${l.zipArea ? `${l.zipArea} ✓ in area` : 'not on our list — confirm'})`,
    `Address: ${l.address || '—'}`,
    `Preferred contact: ${label(contactMethods, l.contact)}`,
    `Notes: ${l.notes || '—'}`,
    `Photos: ${l.photoUrls.length ? l.photoUrls.join(', ') : '—'}`,
    `Source: ${src}${l.utm_campaign ? ` (${l.utm_campaign})` : ''}  |  Page: ${l.page || '/'}`,
    `SMS consent: ${l.smsConsent}`,
  ].join('\n');
}

/** Custom field values keyed by env var name; empty IDs are skipped by the client. */
export function customFieldValues(l: Lead): Record<string, string> {
  return {
    GHL_CF_ITEMS: itemLabels(l.items).join(', '),
    GHL_CF_LOAD_SIZE: label(loadSizes, l.size),
    GHL_CF_TIMING: label(timings, l.when),
    GHL_CF_PREFERRED_CONTACT: label(contactMethods, l.contact),
    GHL_CF_NOTES: l.notes,
    GHL_CF_PHOTOS: l.photoUrls.join('\n'),
    GHL_CF_UTM_SOURCE: l.utm_source,
    GHL_CF_UTM_MEDIUM: l.utm_medium,
    GHL_CF_UTM_CAMPAIGN: l.utm_campaign,
    GHL_CF_GCLID: l.gclid,
    GHL_CF_LANDING_PAGE: l.page,
    GHL_CF_SMS_CONSENT: l.smsConsent,
  };
}

/** Flat payload for GHL_MODE=webhook (Inbound Webhook trigger — no arrays). */
export function flatPayload(l: Lead) {
  return {
    first_name: l.firstName,
    phone: l.phone,
    email: l.email,
    address1: l.address,
    postal_code: l.zip,
    city: l.zipArea ? business.city : '',
    state: business.region,
    country: business.country,
    source: 'Website - Quote Form',
    tags: leadTags(l).join(','),
    items: itemLabels(l.items).join(', '),
    load_size: label(loadSizes, l.size),
    timing: label(timings, l.when),
    preferred_contact: label(contactMethods, l.contact),
    notes: l.notes,
    photos: l.photoUrls.join(', '),
    zip_area: l.zipArea ?? '',
    estimate: estimateValue(l.size),
    landing_page: l.page,
    utm_source: l.utm_source,
    utm_medium: l.utm_medium,
    utm_campaign: l.utm_campaign,
    gclid: l.gclid,
    sms_consent: l.smsConsent,
    summary: noteBody(l),
  };
}

export const maskPhone = (p: string) => (p ? p.replace(/\d(?=\d{2})/g, '•') : '');
