/**
 * Service areas. `primary` = listed on the current site.
 * Non-primary areas were suggested for SEO/locality — TODO(owner): confirm each one.
 * `lat/lng` only drive dot placement on the stylized SVG map.
 * Each area page needs genuinely unique copy — blurbs marked TODO(copy) are starting points.
 */
export type Area = {
  slug: string;
  name: string;
  zips: string[];
  lat: number;
  lng: number;
  primary: boolean;
  blurb: string;
  hook: string;
};

export const areas: Area[] = [
  { slug: 'river-oaks', name: 'River Oaks', zips: ['77019'], lat: 29.7546, lng: -95.418, primary: true,
    blurb: 'Estate cleanouts, remodel debris and furniture swaps behind the oaks on Inwood and Lazy Lane — handled quietly, with floors protected and nothing left at the curb.', // TODO(copy)
    hook: 'Discreet, uniformed crews' },
  { slug: 'bellaire', name: 'Bellaire', zips: ['77401'], lat: 29.7058, lng: -95.4588, primary: true,
    blurb: "Bellaire's tear-downs and rebuilds generate a lot of leftovers. We clear garages before demo day and haul what the builders leave behind.", // TODO(copy)
    hook: 'Pre-demo & garage cleanouts' },
  { slug: 'west-university-place', name: 'West University Place', zips: ['77005'], lat: 29.718, lng: -95.4338, primary: true,
    blurb: "West U's tight lots and detached garages are our specialty — we carry out from the back of the property so the street stays clear.", // TODO(copy)
    hook: 'Back-lot & alley access pros' },
  { slug: 'energy-corridor', name: 'Energy Corridor', zips: ['77094', '77077', '77079'], lat: 29.782, lng: -95.629, primary: true,
    blurb: 'Office moves, relocations and family homes along I-10 and Eldridge — we handle both commercial and residential hauls in the Corridor.', // TODO(copy)
    hook: 'Office & relocation cleanouts' },
  { slug: 'downtown-houston', name: 'Downtown', zips: ['77010', '77002'], lat: 29.7589, lng: -95.3677, primary: true,
    blurb: 'High-rise move-outs, office furniture and retail fixtures downtown — we book freight elevators and loading docks so you don\'t have to.', // TODO(copy)
    hook: 'High-rise & loading-dock jobs' },
  { slug: 'sugar-land', name: 'Sugar Land', zips: ['77479', '77478', '77498'], lat: 29.6197, lng: -95.6349, primary: true,
    blurb: 'From First Colony to Telfair, we clear garages, attics and backyards across Sugar Land without waiting for bulk pickup week.', // TODO(copy)
    hook: 'Skip the bulk-pickup wait' },
  { slug: 'hedwig-village', name: 'Hedwig Village', zips: ['77024'], lat: 29.778, lng: -95.518, primary: true,
    blurb: 'Large lots, big garages and lots of accumulated stuff — we bring the truck size the job actually needs in Hedwig Village.', // TODO(copy)
    hook: 'Big-home cleanouts' },
  { slug: 'kingwood', name: 'Kingwood', zips: ['77345', '77339'], lat: 30.0499, lng: -95.1846, primary: true,
    blurb: 'Under the pines in Kingwood we haul storm limbs, shed contents and furniture — and we make the drive up 59 so you don\'t have to.', // TODO(copy)
    hook: 'Storm limbs & shed teardowns' },
  { slug: 'fulshear', name: 'Fulshear', zips: ['77441'], lat: 29.693, lng: -95.8994, primary: true,
    blurb: 'New builds in Fulshear mean construction leftovers and move-in boxes. We clear both so your new place feels finished.', // TODO(copy)
    hook: 'New-build & move-in cleanup' },

  { slug: 'the-heights', name: 'The Heights', zips: ['77008', '77009'], lat: 29.798, lng: -95.398, primary: false,
    blurb: 'Bungalow remodels and garage-apartment cleanouts in the Heights — narrow driveways and old floors handled carefully.', hook: 'Bungalow remodel debris' }, // TODO(copy)
  { slug: 'montrose', name: 'Montrose', zips: ['77006', '77098'], lat: 29.744, lng: -95.391, primary: false,
    blurb: 'Apartment move-outs and townhome purges in Montrose — we work around street parking and stairs.', hook: 'Walk-ups & townhomes' }, // TODO(copy)
  { slug: 'memorial', name: 'Memorial', zips: ['77024', '77079'], lat: 29.775, lng: -95.56, primary: false,
    blurb: 'Memorial homes collect decades of stuff. We do full-home and room-by-room cleanouts on your schedule.', hook: 'Room-by-room cleanouts' }, // TODO(copy)
  { slug: 'spring-branch', name: 'Spring Branch', zips: ['77055', '77080'], lat: 29.8, lng: -95.52, primary: false,
    blurb: 'Spring Branch rebuilds and rentals keep us busy — demo debris, tenant leftovers and garage clear-outs.', hook: 'Rebuilds & rentals' }, // TODO(copy)
  { slug: 'galleria-uptown', name: 'Galleria / Uptown', zips: ['77056', '77057'], lat: 29.74, lng: -95.463, primary: false,
    blurb: 'Condo and office hauls around the Galleria — elevator bookings, loading docks and tight windows are routine for us.', hook: 'Condos & offices' }, // TODO(copy)
  { slug: 'meyerland', name: 'Meyerland', zips: ['77096', '77035'], lat: 29.687, lng: -95.46, primary: false,
    blurb: 'Meyerland knows flood cleanup. We haul water-damaged furniture, carpet and drywall fast when it counts.', hook: 'Flood cleanup' }, // TODO(copy)
  { slug: 'katy', name: 'Katy', zips: ['77449', '77450', '77493', '77494'], lat: 29.7858, lng: -95.8245, primary: false,
    blurb: 'Big Katy garages fill up fast. We empty them, haul old playsets and clear out move-in boxes.', hook: 'Garages & playsets' }, // TODO(copy)
  { slug: 'cypress', name: 'Cypress', zips: ['77429', '77433'], lat: 29.9691, lng: -95.6972, primary: false,
    blurb: 'Cypress homeowners call us for shed teardowns, yard debris and whole-garage cleanouts.', hook: 'Sheds & yard debris' }, // TODO(copy)
  { slug: 'pearland', name: 'Pearland', zips: ['77581', '77584'], lat: 29.5636, lng: -95.286, primary: false,
    blurb: 'Pearland renovations and move-outs — we haul furniture, appliances and remodel leftovers same-day when we can.', hook: 'Renovation leftovers' }, // TODO(copy)
  { slug: 'missouri-city', name: 'Missouri City', zips: ['77459', '77489'], lat: 29.6186, lng: -95.5377, primary: false,
    blurb: 'From Sienna to Quail Valley, we clear attics, garages and backyards across Missouri City.', hook: 'Attics & backyards' }, // TODO(copy)
  { slug: 'spring', name: 'Spring', zips: ['77373', '77379', '77388'], lat: 30.0799, lng: -95.4172, primary: false,
    blurb: 'Spring families call us for furniture swaps, hot tub removal and storm debris.', hook: 'Hot tubs & storm debris' }, // TODO(copy)
  { slug: 'the-woodlands', name: 'The Woodlands', zips: ['77380', '77381', '77382'], lat: 30.1658, lng: -95.4613, primary: false,
    blurb: 'HOA-friendly hauling in The Woodlands — no curb piles, no violation letters.', hook: 'HOA-friendly, no curb piles' }, // TODO(copy)
  { slug: 'humble', name: 'Humble', zips: ['77338', '77346'], lat: 29.9988, lng: -95.2622, primary: false,
    blurb: 'Humble and Atascocita cleanouts — garages, sheds and storm limbs hauled on your timeline.', hook: 'Garages & sheds' }, // TODO(copy)
  { slug: 'pasadena', name: 'Pasadena', zips: ['77502', '77503', '77504', '77505'], lat: 29.6911, lng: -95.2091, primary: false,
    blurb: 'Pasadena homes and small businesses — appliances, furniture and shop clean-outs.', hook: 'Homes & small shops' }, // TODO(copy)
  { slug: 'clear-lake', name: 'Clear Lake', zips: ['77058', '77059', '77062'], lat: 29.573, lng: -95.108, primary: false,
    blurb: 'Hurricane-season prep and post-storm cleanup around Clear Lake and NASA Parkway.', hook: 'Hurricane-season cleanup' }, // TODO(copy)
  { slug: 'richmond', name: 'Richmond', zips: ['77406', '77469'], lat: 29.5822, lng: -95.7608, primary: false,
    blurb: 'Richmond acreage and new subdivisions — barn cleanouts, construction debris and move-in boxes.', hook: 'Acreage & new builds' }, // TODO(copy)
];

export const primaryAreas = areas.filter((a) => a.primary);
export const areaBySlug = (slug: string) => areas.find((a) => a.slug === slug);

/** Flat ZIP → area name map used by the ZIP checker (client) and the quote API (server). */
export const zipMap: Record<string, string> = {};
for (const a of areas) for (const z of a.zips) zipMap[z] ??= a.name;
