/**
 * Quote-form rules shared by the browser and /api/quote.
 * Plain TS (no deps) so it stays tiny in the client bundle; the server wraps
 * the same rules in a zod schema (quote-schema.ts).
 */
import { zipMap } from '../data/areas';

export const MAX_PHOTOS = 6;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const MIN_FILL_MS = 3000;

export type QuoteFields = {
  items: string[];
  zip: string;
  size: string;
  when: string;
  firstName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  contact: string;
};

export type FieldErrors = Partial<Record<keyof QuoteFields, string>>;

export const ZIP_RE = /^\d{5}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const URLISH_RE = /(https?:\/\/|www\.|\.[a-z]{2,}\/|<|>)/i;

/** Returns +1XXXXXXXXXX or null. */
export function normalizePhone(input: string): string | null {
  let d = (input || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  if (d.length !== 10 || /^[01]/.test(d)) return null;
  return `+1${d}`;
}

/** (346) 599-8378 style, progressively, for input masking. */
export function formatPhoneInput(input: string): string {
  let d = input.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  d = d.slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export type ZipResult =
  | { status: 'invalid' }
  | { status: 'served'; zip: string; area: string }
  | { status: 'unknown'; zip: string };

export function checkZip(zip: string): ZipResult {
  const z = (zip || '').trim();
  if (!ZIP_RE.test(z)) return { status: 'invalid' };
  const area = zipMap[z];
  return area ? { status: 'served', zip: z, area } : { status: 'unknown', zip: z };
}

export function validateStep(step: 1 | 2 | 3, f: Partial<QuoteFields>): FieldErrors {
  const e: FieldErrors = {};
  if (step === 1) {
    if (!f.items?.length) e.items = 'Pick at least one thing we’re hauling.';
    if (!ZIP_RE.test((f.zip || '').trim())) e.zip = 'Enter a 5-digit ZIP code.';
  }
  if (step === 2) {
    if (!f.size) e.size = 'Choose a rough size — “Not sure” is fine.';
    if (!f.when) e.when = 'When should we come?';
  }
  if (step === 3) {
    const name = (f.firstName || '').trim();
    if (!name) e.firstName = 'What should we call you?';
    else if (name.length > 40 || URLISH_RE.test(name)) e.firstName = 'Please enter just your first name.';
    if (!normalizePhone(f.phone || '')) e.phone = 'Enter a 10-digit mobile number.';
    const email = (f.email || '').trim();
    if (email && !EMAIL_RE.test(email)) e.email = 'That email doesn’t look right.';
    if (f.contact === 'email' && !email) e.email = 'Add an email, or choose Text or Call.';
  }
  return e;
}

export function validateAll(f: Partial<QuoteFields>): FieldErrors {
  return { ...validateStep(1, f), ...validateStep(2, f), ...validateStep(3, f) };
}
