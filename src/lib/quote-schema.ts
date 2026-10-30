/** Server-side schema. Same rules as the client (lib/quote.ts), enforced with zod. */
import { z } from 'zod';
import { quoteItems } from '../data/services';
import { loadSizes, timings, contactMethods } from '../data/business';
import { validateAll, normalizePhone, type QuoteFields } from './quote';

const ids = <T extends readonly { id: string }[]>(list: T) => list.map((x) => x.id) as [string, ...string[]];
const trimmed = (max: number) => z.string().trim().max(max).default('');

export const quoteSchema = z
  .object({
    items: z.array(z.enum(ids(quoteItems))).min(1).max(quoteItems.length),
    zip: z.string().trim().regex(/^\d{5}$/),
    size: z.enum(ids(loadSizes)),
    when: z.enum(ids(timings)),
    firstName: z.string().trim().min(1).max(40),
    phone: z.string().trim().max(30),
    email: trimmed(120),
    address: trimmed(200),
    notes: trimmed(1500),
    contact: z.enum(ids(contactMethods)).default('text'),
    // tracking (all optional)
    page: trimmed(300),
    utm_source: trimmed(120),
    utm_medium: trimmed(120),
    utm_campaign: trimmed(160),
    gclid: trimmed(200),
  })
  .superRefine((v, ctx) => {
    const errs = validateAll(v as QuoteFields);
    for (const [path, message] of Object.entries(errs)) ctx.addIssue({ code: 'custom', path: [path], message });
  })
  .transform((v) => ({ ...v, phone: normalizePhone(v.phone)! }));

export type Quote = z.infer<typeof quoteSchema>;
