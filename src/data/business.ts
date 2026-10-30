/**
 * Single source of truth for A&H Junk Removal business facts.
 * Every page, component, JSON-LD block and the quote API read from here.
 * Search the repo for `TODO(owner)` to find everything still waiting on the owner.
 */

export const business = {
  name: 'A&H Junk Removal',
  shortName: 'A&H',
  legalNote: '', // TODO(owner): legal entity name if different (e.g. "A&H Junk Removal LLC")
  tagline: "Houston's hardest-working haul team.",
  url: 'https://ahernandezjunkremoval.com', // domain stays for now; 301 if it ever changes

  phone: {
    display: '(346) 599-8378',
    e164: '+13465998378',
    tel: 'tel:+13465998378',
    sms: 'sms:+13465998378', // TODO(owner): confirm this number accepts texts
  },
  smsBody: "Hi A&H! Here's a photo of what I need hauled. My ZIP is ",
  email: 'ahernandezjunkremoval@gmail.com',

  /** Service-area business — no public street address. Do NOT add one. */
  city: 'Houston',
  region: 'TX',
  country: 'US',
  areaLabel: 'Greater Houston, TX',
  geo: { lat: 29.7604, lng: -95.3698 },

  timezone: 'America/Chicago',
  /** 24h clock, local Houston time. Same hours every day. */
  hours: { open: 7, close: 19, days: 'Mon–Sun', label: '7:00 AM – 7:00 PM' },

  /** Google Business Profile. TODO(owner): paste real values. */
  google: {
    rating: 5.0,
    reviewCount: null as number | null, // hide count while null; no aggregateRating JSON-LD either
    gbpUrl: '', // TODO(owner): "Read all reviews" link (share link from Google Business Profile)
    reviewUrl: '', // TODO(owner): "Leave a review" link (g.page/r/…/review)
  },

  foundedYear: null as number | null, // TODO(owner)
  owner: {
    // TODO(owner): first name, photo and short story. The owner card hides while firstName is empty.
    firstName: '',
    story: '',
    photo: null as null | string,
  },

  /** Only render socials that have a URL. TODO(owner): add real profiles. */
  socials: {
    facebook: '',
    instagram: '',
    nextdoor: '',
    yelp: '',
  } as Record<string, string>,

  /** TODO(owner): carrier / license / badges. Text badge only until confirmed. */
  credentials: { licensedInsured: true, insuranceCarrier: '', licenseNumber: '' },

  spanish: false, // TODO(owner): set true to show "Hablamos Español" badge

  /** Response-time promise on the success screen. TODO(owner): confirm. */
  responseMinutes: 15,

  priceRange: '$$',
} as const;

/** Load-size options used by the quote form, pricing and GHL opportunity value. */
export const loadSizes = [
  { id: 'few-items', label: 'A few items', short: 'Few items', fill: 0.15, estimate: 150 },
  { id: 'pickup-load', label: 'Pickup-truck load', short: 'Pickup load', fill: 0.3, estimate: 300 },
  { id: 'half-truck', label: 'Half truck', short: 'Half truck', fill: 0.5, estimate: 550 },
  { id: 'full-truck', label: 'Full truck+', short: 'Full truck+', fill: 1, estimate: 1100 },
  { id: 'not-sure', label: 'Not sure', short: 'Not sure', fill: 0, estimate: 0 },
] as const;

export const timings = [
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'this-week', label: 'This week' },
  { id: 'flexible', label: 'Flexible' },
] as const;

export const contactMethods = [
  { id: 'text', label: 'Text' },
  { id: 'call', label: 'Call' },
  { id: 'email', label: 'Email' },
] as const;

/**
 * Pricing tiers. TODO(owner): VERIFY — current site mixes "what we quote is what you pay"
 * with "final quote on-site". We use "Starting at" + on-site confirmation everywhere.
 */
export const pricing = [
  {
    id: 'minimum',
    name: 'Minimum Load',
    from: 150,
    fill: 0.25,
    blurb: '1–2 items or a single appliance.',
    examples: ['A couch or mattress set', 'One fridge or washer', 'A few bags + boxes'],
    popular: false,
  },
  {
    id: 'half',
    name: 'Half Truck',
    from: 550,
    fill: 0.5,
    blurb: 'Garage corners, furniture sets, small cleanouts.',
    examples: ['Living-room furniture set', 'One-car garage cleanout', 'Shed or attic purge'],
    popular: true,
  },
  {
    id: 'full',
    name: 'Full Truck',
    from: 1100,
    fill: 1,
    blurb: 'Whole-house, estate or big debris jobs.',
    examples: ['Estate or whole-home cleanout', 'Remodel / construction debris', 'Storm & flood cleanup'],
    popular: false,
  },
] as const;

export const pricingNote =
  'Includes labor, loading, hauling & disposal. Exact price confirmed on-site before we start — you approve, then we lift.';

/** Items we can't take. TODO(owner): confirm list. */
export const cannotTake = [
  'Paint & solvents',
  'Chemicals & pesticides',
  'Gasoline, oil & fuel tanks',
  'Asbestos',
  'Medical / biohazard waste',
];

export const trustPoints = [
  'Licensed & Insured',
  'Locally owned — not a franchise',
  '7 days a week',
  'Donate & recycle first',
  'Same-day & next-day',
];

export function isOpenAt(date: Date = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: business.timezone, hour: 'numeric', hourCycle: 'h23' }).format(date),
  );
  return hour >= business.hours.open && hour < business.hours.close;
}

export const money = (n: number) => `$${n.toLocaleString('en-US')}`;
