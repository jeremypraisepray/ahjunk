/**
 * Services shown on the home grid, used for /services/[slug] pages, and mapped to
 * quote-form item chips (`item`) so "Get a quote for this" can pre-select a chip.
 * `confirm: true` = suggested by the handoff for Houston demand. TODO(owner): confirm offered.
 */
export type Service = {
  slug: string;
  title: string;
  short: string;
  icon: string;
  item: string; // quote-form item id
  confirm?: boolean;
  home: boolean; // show on the home grid
  intro: string;
  included: string[];
  faqs: { q: string; a: string }[];
};

/** Quote-form item chips. `tag` becomes a GHL tag on the contact. */
export const quoteItems = [
  { id: 'furniture', label: 'Furniture', icon: 'Sofa', tag: 'junk-furniture' },
  { id: 'appliances', label: 'Appliances', icon: 'Refrigerator', tag: 'junk-appliances' },
  { id: 'mattress', label: 'Mattress', icon: 'BedDouble', tag: 'junk-mattress' },
  { id: 'garage', label: 'Garage/Storage', icon: 'Warehouse', tag: 'junk-garage' },
  { id: 'estate', label: 'Estate Cleanout', icon: 'House', tag: 'junk-estate' },
  { id: 'construction', label: 'Construction Debris', icon: 'HardHat', tag: 'junk-construction' },
  { id: 'yard', label: 'Yard/Storm Debris', icon: 'Trees', tag: 'junk-yard-storm' },
  { id: 'hot-tub', label: 'Hot Tub', icon: 'Bath', tag: 'junk-hot-tub' },
  { id: 'commercial', label: 'Commercial', icon: 'Building2', tag: 'junk-commercial' },
  { id: 'other', label: 'Other', icon: 'Package', tag: 'junk-other' },
] as const;

export type QuoteItemId = (typeof quoteItems)[number]['id'];

export const services: Service[] = [
  {
    slug: 'furniture-removal',
    title: 'Furniture Removal',
    short: 'Couches, sectionals, dressers, recliners — no disassembly needed.',
    icon: 'Sofa',
    item: 'furniture',
    home: true,
    intro:
      "That sectional that won't fit through the door? It's our problem now. We carry furniture out from any room, any floor — you don't lift, drag or take anything apart.", // TODO(copy)
    included: ['Removal from any room or floor', 'Disassembly when needed', 'Donation of usable pieces', 'Floor protection & sweep-up'],
    faqs: [
      { q: 'Do I need to take the furniture apart?', a: "No. We handle disassembly when it's needed to get an item out safely." },
      { q: 'Do you donate furniture?', a: 'Yes — anything in usable shape goes to local donation partners before anything goes to the landfill.' },
    ],
  },
  {
    slug: 'appliance-hot-tub-removal',
    title: 'Appliance & Hot Tub Removal',
    short: 'Fridges, washers, dryers, water heaters and full hot tubs.',
    icon: 'Refrigerator',
    item: 'appliances',
    home: true,
    intro:
      'Old fridge in the garage? Dead water heater? Backyard hot tub nobody uses? We disconnect-ready haul it and send metal and parts to recyclers.', // TODO(copy)
    included: ['Refrigerators & freezers', 'Washers, dryers & dishwashers', 'Water heaters & AC units', 'Hot tub cut-up & removal'],
    faqs: [
      { q: 'Do you disconnect appliances?', a: "Please have water and gas shut off and lines disconnected. We'll handle the heavy lifting from there." }, // TODO(owner): confirm
      { q: 'Can you remove a hot tub?', a: 'Yes. We cut it down on-site if needed and haul every piece, including the frame.' },
    ],
  },
  {
    slug: 'garage-storage-cleanouts',
    title: 'Garage & Storage Cleanouts',
    short: 'Get the car back in the garage. Units emptied fast.',
    icon: 'Warehouse',
    item: 'garage',
    home: true,
    intro:
      'Years of boxes, bikes and "maybe later" — gone in an afternoon. Point at what goes, keep what stays, and we sort donate, recycle and dump.', // TODO(copy)
    included: ['Garages, attics & sheds', 'Storage-unit emptying', 'Sorting donate / recycle / dump', 'Broom-clean finish'],
    faqs: [
      { q: 'Can you help me decide what to toss?', a: "Sure. Walk us through it and we'll pull only what you point at." },
      { q: 'Do you clean out storage units?', a: 'Yes — just make sure we can access the unit (code or a key) at the scheduled time.' },
    ],
  },
  {
    slug: 'estate-cleanouts',
    title: 'Estate Cleanouts',
    short: 'Respectful, full-home cleanouts handled with care.',
    icon: 'House',
    item: 'estate',
    home: true,
    intro:
      'Clearing a loved one\'s home is hard enough. We work quietly and carefully, set aside anything you flag, and donate what we can.', // TODO(copy)
    included: ['Whole-home & partial cleanouts', 'Set-aside of keepsakes & documents', 'Coordination with realtors & executors', 'Donation receipts when available'],
    faqs: [
      { q: 'Do I need to be there?', a: "Not necessarily. Many families give us access and a list; we'll send photos when we're done." },
      { q: 'Can you work with my realtor?', a: 'Yes. We coordinate timing with realtors, executors and property managers.' },
    ],
  },
  {
    slug: 'construction-debris-removal',
    title: 'Construction Debris',
    short: 'Drywall, lumber, tile, concrete, roofing — after the remodel.',
    icon: 'HardHat',
    item: 'construction',
    home: true,
    intro:
      'Remodel done, mess left behind? We haul drywall, lumber, tile, concrete and roofing so your project closes out clean.', // TODO(copy)
    included: ['Drywall, lumber & trim', 'Tile, concrete & brick', 'Roofing shingles', 'Contractor & homeowner jobs'],
    faqs: [
      { q: 'Do you take concrete?', a: 'Yes. Heavy materials like concrete and tile can affect pricing because of weight — we confirm on-site.' },
      { q: 'Do you work with contractors?', a: 'Yes — one-off pickups or recurring hauls for job sites.' },
    ],
  },
  {
    slug: 'commercial-junk-removal',
    title: 'Commercial Removal',
    short: 'Offices, retail, storage units and property turnovers.',
    icon: 'Building2',
    item: 'commercial',
    home: true,
    intro:
      'Office furniture, retail fixtures, tenant leftovers — we work around your hours so business keeps moving.', // TODO(copy)
    included: ['Office furniture & cubicles', 'Retail fixtures & shelving', 'Tenant & property turnovers', 'After-hours scheduling'],
    faqs: [
      { q: 'Can you come before or after business hours?', a: "We're out 7 AM – 7 PM, 7 days a week. Ask about early or weekend slots." },
      { q: 'Do you handle property-manager turnovers?', a: 'Yes — fast turnaround for move-outs and rental turnovers.' },
    ],
  },
  {
    slug: 'storm-flood-debris-cleanup',
    title: 'Storm & Flood Debris',
    short: 'Hurricane and flood cleanup — soaked drywall, carpet, furniture.',
    icon: 'CloudRainWind',
    item: 'yard',
    confirm: true,
    home: false,
    intro:
      "When a storm rolls through Houston, the cleanup can't wait for heavy-trash day. We haul waterlogged furniture, carpet, drywall and downed debris fast.", // TODO(copy)
    included: ['Water-damaged furniture & carpet', 'Wet drywall & insulation', 'Fallen branches & fence debris', 'Fast scheduling after storms'],
    faqs: [
      { q: 'Can you come right after a storm?', a: 'We prioritize storm calls and open extra slots when we can. Call or text a photo.' },
    ],
  },
  {
    slug: 'yard-waste-fence-shed-removal',
    title: 'Yard Waste, Fence & Shed Removal',
    short: 'Branches, old fencing, playsets and sheds torn down and hauled.',
    icon: 'Fence',
    item: 'yard',
    confirm: true,
    home: false,
    intro: 'Brush piles, rotted fence panels, old playsets and sheds — we tear down and haul it all.', // TODO(copy)
    included: ['Brush & branch piles', 'Fence panel removal', 'Shed & playset teardown', 'Yard debris haul-off'],
    faqs: [{ q: 'Do you tear down sheds?', a: 'Yes, for most wood and metal sheds. Concrete slabs are quoted separately.' }],
  },
  {
    slug: 'move-out-cleanouts',
    title: 'Move-Out & Rental Turnovers',
    short: 'Leftover furniture and junk cleared between tenants.',
    icon: 'KeyRound',
    item: 'furniture',
    confirm: true,
    home: false,
    intro:
      'Moving out near Rice, UH or the Med Center? Turning over a rental? We clear what got left behind so the next move-in is clean.', // TODO(copy)
    included: ['Apartment & house move-outs', 'Rental turnovers for landlords', 'Same-day options', 'Broom-clean finish'],
    faqs: [{ q: 'Can you meet a tight move-out deadline?', a: 'Same-day and next-day slots are often available — book early in the day for best odds.' }],
  },
  {
    slug: 'mattress-removal',
    title: 'Mattress Removal',
    short: 'Mattresses and box springs out of the house, recycled when possible.',
    icon: 'BedDouble',
    item: 'mattress',
    confirm: true,
    home: false,
    intro: "Mattresses are awkward, heavy and the city won't always take them. We will — and we recycle when we can.", // TODO(copy)
    included: ['Mattresses & box springs', 'Bed frames & headboards', 'Removal from any floor', 'Recycling when possible'],
    faqs: [{ q: 'Is a single mattress a minimum load?', a: 'Usually, yes. Bundle it with a few other items to get the most out of the visit.' }],
  },
];

export const serviceBySlug = (slug: string) => services.find((s) => s.slug === slug);
