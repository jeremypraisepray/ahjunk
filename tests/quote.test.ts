import { describe, it, expect } from 'vitest';
import { normalizePhone, formatPhoneInput, checkZip, validateStep, validateAll } from '../src/lib/quote';
import { quoteSchema } from '../src/lib/quote-schema';
import { buildLead, leadTags, noteBody, opportunityName, estimateValue, flatPayload, houstonTimestamp } from '../src/lib/lead';
import { areas, primaryAreas } from '../src/data/areas';

const valid = {
  items: ['furniture', 'garage'],
  zip: '77401',
  size: 'half-truck',
  when: 'today',
  firstName: 'Maria',
  phone: '(713) 555-0142',
  email: '',
  address: '1234 Example St',
  notes: 'Old sectional + treadmill',
  contact: 'text',
};

describe('phone', () => {
  it('normalizes US numbers to E.164', () => {
    expect(normalizePhone('(346) 599-8378')).toBe('+13465998378');
    expect(normalizePhone('1-346-599-8378')).toBe('+13465998378');
    expect(normalizePhone('346.599.8378')).toBe('+13465998378');
  });
  it('rejects bad numbers', () => {
    expect(normalizePhone('555-1234')).toBeNull();
    expect(normalizePhone('(046) 599-8378')).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });
  it('masks as you type', () => {
    expect(formatPhoneInput('346')).toBe('346');
    expect(formatPhoneInput('3465998')).toBe('(346) 599-8');
    expect(formatPhoneInput('13465998378')).toBe('(346) 599-8378');
  });
});

describe('ZIP checker', () => {
  it('recognizes every listed ZIP', () => {
    for (const a of areas) for (const z of a.zips) expect(checkZip(z).status).toBe('served');
  });
  it('names the original nine areas by their ZIP', () => {
    const expected: Record<string, string> = {
      '77019': 'River Oaks', '77401': 'Bellaire', '77005': 'West University Place', '77094': 'Energy Corridor',
      '77010': 'Downtown', '77479': 'Sugar Land', '77024': 'Hedwig Village', '77345': 'Kingwood', '77441': 'Fulshear',
    };
    for (const [zip, area] of Object.entries(expected)) expect(checkZip(zip)).toEqual({ status: 'served', zip, area });
    expect(primaryAreas).toHaveLength(9);
  });
  it('handles unknown and invalid ZIPs gracefully', () => {
    expect(checkZip('90210')).toEqual({ status: 'unknown', zip: '90210' });
    expect(checkZip('7701').status).toBe('invalid');
    expect(checkZip('abcde').status).toBe('invalid');
  });
});

describe('validation', () => {
  it('step 1 needs items + ZIP', () => {
    expect(Object.keys(validateStep(1, { items: [], zip: '' }))).toEqual(['items', 'zip']);
    expect(validateStep(1, { items: ['other'], zip: '77019' })).toEqual({});
  });
  it('step 3 rejects URLs in the name and requires email for email contact', () => {
    expect(validateStep(3, { ...valid, firstName: 'http://spam.biz' }).firstName).toBeTruthy();
    expect(validateStep(3, { ...valid, contact: 'email', email: '' }).email).toBeTruthy();
  });
  it('a full valid quote passes client + server rules', () => {
    expect(validateAll(valid)).toEqual({});
    const parsed = quoteSchema.parse(valid);
    expect(parsed.phone).toBe('+17135550142');
  });
  it('server rejects unknown item ids', () => {
    expect(quoteSchema.safeParse({ ...valid, items: ['plutonium'] }).success).toBe(false);
  });
});

describe('lead building', () => {
  const lead = buildLead(quoteSchema.parse({ ...valid, utm_source: 'google', utm_medium: 'cpc', gclid: 'abc', page: '/services/garage-storage-cleanouts/' }), ['https://blob/1.jpg'], new Date('2026-10-30T04:25:00Z'));
  it('tags items, timing and ZIP coverage', () => {
    expect(leadTags(lead)).toEqual(['website-lead', 'quote-request', 'junk-furniture', 'junk-garage', 'when-today', 'zip-in-area']);
    const out = buildLead(quoteSchema.parse({ ...valid, zip: '90210' }), []);
    expect(leadTags(out)).toContain('zip-check-needed');
  });
  it('stamps SMS consent in Houston time', () => {
    expect(houstonTimestamp(new Date('2026-10-30T04:25:00Z'))).toBe('2026-10-29T23:25:00-05:00');
    expect(lead.smsConsent).toBe('yes | 2026-10-29T23:25:00-05:00 | /services/garage-storage-cleanouts/');
  });
  it('builds the opportunity name and value', () => {
    expect(opportunityName(lead)).toBe('Junk Quote – Maria – 77401 – Half truck');
    expect(estimateValue('full-truck')).toBe(1100);
    expect(estimateValue('not-sure')).toBe(0);
  });
  it('writes a readable note', () => {
    const n = noteBody(lead);
    expect(n).toContain('NEW WEBSITE QUOTE — A&H Junk Removal');
    expect(n).toContain('Items: Furniture, Garage/Storage');
    expect(n).toContain('ZIP: 77401 (Bellaire ✓ in area)');
    expect(n).toContain('Photos: https://blob/1.jpg');
    expect(n).toContain('google / cpc / gclid=abc');
  });
  it('webhook payload is flat (no arrays/objects)', () => {
    for (const v of Object.values(flatPayload(lead))) expect(['string', 'number']).toContain(typeof v);
  });
});

describe('spam guards', async () => {
  const { rateLimited, isDuplicate, RATE_LIMIT } = await import('../src/lib/guard');
  it('rate-limits after 5 requests in 10 minutes per IP', () => {
    const t = 1_000_000;
    for (let i = 0; i < RATE_LIMIT.max; i++) expect(rateLimited('1.2.3.4', t + i)).toBe(false);
    expect(rateLimited('1.2.3.4', t + 10)).toBe(true);
    expect(rateLimited('5.6.7.8', t + 10)).toBe(false);
    expect(rateLimited('1.2.3.4', t + RATE_LIMIT.windowMs + 100)).toBe(false);
  });
  it('flags the same phone twice in one minute', async () => {
    const t = 60_000 * 1000;
    expect(await isDuplicate('+13465550100', t)).toBe(false);
    expect(await isDuplicate('+13465550100', t + 5000)).toBe(true);
    expect(await isDuplicate('+13465550101', t + 5000)).toBe(false);
  });
});
