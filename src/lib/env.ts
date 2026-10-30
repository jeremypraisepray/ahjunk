/** Server-side env access. Works in Astro (import.meta.env) and plain Node (process.env). */
export function env(key: string): string {
  const fromProcess = typeof process !== 'undefined' ? process.env?.[key] : undefined;
  const fromVite = (import.meta as any).env?.[key];
  return (fromProcess ?? fromVite ?? '').toString().trim();
}
