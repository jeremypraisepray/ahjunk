import type { ImageMetadata } from 'astro';
import drivewayBefore from '../assets/photos/real-job-driveway-cleanout-before.webp';
import patioBefore from '../assets/photos/real-job-patio-cleanout-before.webp';
import curbsideBefore from '../assets/photos/real-job-curbside-pile-before.webp';
import loadedTrailer from '../assets/photos/loaded-trailer-curbside-oak-tree.webp';
import loveseat from '../assets/photos/crew-loading-loveseat-box-truck.webp';
import packedBed from '../assets/photos/packed-truck-bed-close.webp';

/**
 * Proof gallery. Add `after` to turn a tile into a drag-to-compare before/after slider.
 * Captions: "Job type · Neighborhood · Load size". Only name a Houston neighborhood
 * once the owner confirms where the job was. TODO(owner): real before/after pairs.
 */
export type GalleryItem = {
  before: ImageMetadata;
  after?: ImageMetadata;
  alt: string;
  afterAlt?: string;
  caption: string;
  tag?: 'Before' | 'On the job' | 'Loaded up';
};

export const gallery: GalleryItem[] = [
  {
    before: drivewayBefore,
    alt: 'A large pile of boxes, furniture and household junk stacked in a driveway beside a garage, waiting to be hauled',
    caption: 'Driveway cleanout · Full truck',
    tag: 'Before',
  },
  {
    before: patioBefore,
    alt: 'A covered backyard patio crowded with broken furniture, cardboard and old rugs before cleanup',
    caption: 'Patio cleanout · Half truck',
    tag: 'Before',
  },
  {
    before: loadedTrailer,
    alt: 'A black dump trailer heaped with old furniture, wood and appliances parked curbside under a live oak',
    caption: 'Whole-house cleanout · Full truck',
    tag: 'Loaded up',
  },
  {
    before: curbsideBefore,
    alt: 'A curbside junk pile with a blue reclining sofa, bags, a bed frame and bins on a residential street',
    caption: 'Curbside pile · Half truck', // not Houston scenery — keep neighborhood off
    tag: 'Before',
  },
  {
    before: loveseat,
    alt: 'A crew member in an orange shirt lifting a beige loveseat into the back of a box truck',
    caption: 'Furniture removal · Pickup-truck load',
    tag: 'On the job',
  },
  {
    before: packedBed,
    alt: 'Close-up of a truck bed tightly packed with chairs, an old TV, rugs, boxes and trash bags',
    caption: 'Garage cleanout · Half truck',
    tag: 'Loaded up',
  },
];
