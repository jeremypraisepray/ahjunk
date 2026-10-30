/** Stores quote photos in Vercel Blob (public-read, unguessable names) and returns URLs. */
import { put } from '@vercel/blob';
import { env } from './env';
import { MAX_PHOTOS, MAX_PHOTO_BYTES } from './quote';

const OK_TYPES = /^image\/(jpeg|png|webp|heic|heif|gif|avif)$/;

export function pickPhotos(entries: FormDataEntryValue[]): File[] {
  return entries
    .filter((f): f is File => typeof f === 'object' && 'size' in f && f.size > 0)
    .filter((f) => OK_TYPES.test(f.type) && f.size <= MAX_PHOTO_BYTES)
    .slice(0, MAX_PHOTOS);
}

export async function uploadPhotos(files: File[]): Promise<{ urls: string[]; skipped: number }> {
  if (!files.length) return { urls: [], skipped: 0 };
  const token = env('BLOB_READ_WRITE_TOKEN');
  if (!token) {
    console.warn(`[quote] ${files.length} photo(s) not stored: BLOB_READ_WRITE_TOKEN not set`);
    return { urls: [], skipped: files.length };
  }
  const folder = `quotes/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}`;
  const results = await Promise.allSettled(
    files.map((f, i) => {
      const ext = (f.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      return put(`${folder}/${i + 1}.${ext}`, f, { access: 'public', addRandomSuffix: true, contentType: f.type, token });
    }),
  );
  const urls = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value.url] : []));
  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length) console.error(`[quote] ${failed.length} photo upload(s) failed`);
  return { urls, skipped: failed.length };
}
