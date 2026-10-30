/** Hero photo per service page (keep AI-looking images in atmospheric roles). */
import type { ImageMetadata } from 'astro';
import couch from '../assets/photos/crew-loading-couch-dump-trailer.webp';
import loveseat from '../assets/photos/crew-loading-loveseat-box-truck.webp';
import trailer from '../assets/photos/loaded-trailer-curbside-oak-tree.webp';
import driveway from '../assets/photos/real-job-driveway-cleanout-before.webp';
import packed from '../assets/photos/packed-truck-bed-close.webp';
import crew from '../assets/photos/crew-smiling-loaded-trailer.webp';

export const heroPhotos: Record<string, ImageMetadata> = {
  'furniture-removal': loveseat,
  'appliance-hot-tub-removal': packed,
  'garage-storage-cleanouts': driveway,
  'estate-cleanouts': trailer,
  'construction-debris-removal': couch,
  'commercial-junk-removal': crew,
  'storm-flood-debris-cleanup': trailer,
  'yard-waste-fence-shed-removal': couch,
  'move-out-cleanouts': loveseat,
  'mattress-removal': packed,
};
export const defaultHero = couch;
