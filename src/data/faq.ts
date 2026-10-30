import { business, pricing, money, cannotTake } from './business';

/** Home-page FAQ. Also emitted as FAQPage JSON-LD — keep answers plain text. */
export const faq: { q: string; a: string }[] = [
  {
    q: 'How much does junk removal cost in Houston?',
    a: `We price by how much space your items take in the truck — not by the hour. Minimum loads start at ${money(pricing[0].from)}, half a truck from ${money(pricing[1].from)} and a full truck from ${money(pricing[2].from)}. Labor, loading, hauling and disposal are included, and we confirm the exact price on-site before we lift anything.`,
  },
  {
    q: 'Do you offer same-day pickup?',
    a: `Usually, yes. We run ${business.hours.days}, ${business.hours.label}. Call or text before noon for the best shot at a same-day slot; next-day is almost always open.`,
  },
  {
    q: 'Do I need to be home?',
    a: "Not always. If items are accessible (garage code, side yard, a key in a lockbox), we can do the job and text you photos when we're done. We'll confirm the price with you by phone first.",
  },
  {
    q: 'Do I need to move items to the curb?',
    a: "No. We pull from anywhere — upstairs bedrooms, attics, backyards, garages. You just point.",
  },
  {
    q: "What don't you take?",
    a: `If it's not hazardous, we probably take it. We can't haul ${cannotTake.join(', ').toLowerCase()}. Ask us about anything you're unsure of.`,
  },
  {
    q: 'Do you donate or recycle?',
    a: 'Yes. Usable furniture and household goods go to local donation partners, and metals, electronics and cardboard get recycled. The landfill is the last stop, not the first.',
  },
  {
    q: 'Are you licensed and insured?',
    a: 'Yes. A&H Junk Removal is licensed and insured, so your home and property are covered while we work.',
  },
  {
    q: 'Do you handle storm or flood debris?',
    a: "Yes. After storms and floods we haul waterlogged furniture, carpet, drywall and fallen debris. Call or text a photo and we'll get you on the schedule fast.",
  },
  {
    q: 'What areas do you serve?',
    a: 'All of Greater Houston — River Oaks, Bellaire, West U, the Energy Corridor, Downtown, Sugar Land, Hedwig Village, Kingwood, Fulshear and the neighborhoods in between. Not sure about your ZIP? Enter it in the quote form.',
  },
  {
    q: 'How do I pay?',
    a: 'You pay when the job is done and you are happy with it. We accept major cards, cash and common payment apps.', // TODO(owner): confirm payment methods
  },
];
