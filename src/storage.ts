import { STORAGE_KEY, validateComposition } from './model';

/** Pre-naming local drafts belong to Philharmonic, never to the spark game. */
export const LEGACY_STORAGE_KEY = 'bongo-planet-composer-v1';

/** Legacy fallback also keeps drafts readable when the browser refuses migration writes. */
export function readPhilharmonicStorage(storage: Pick<Storage, 'getItem'>, suffix = ''): string | null {
  return storage.getItem(`${STORAGE_KEY}${suffix}`) ?? storage.getItem(`${LEGACY_STORAGE_KEY}${suffix}`);
}

/** Copy valid legacy data once per key; preserve originals and prefer newer saves. */
export function migrateComposerStorage(storage: Pick<Storage, 'getItem' | 'setItem'>): void {
  for (const suffix of ['', '-saved', '-recovery', '-presentation']) {
    if (storage.getItem(`${STORAGE_KEY}${suffix}`) !== null) continue;
    const raw = storage.getItem(`${LEGACY_STORAGE_KEY}${suffix}`);
    if (raw === null) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (suffix === '-presentation') {
        if (!parsed || typeof parsed !== 'object' || !('view' in parsed)
          || !['placement', 'composer', 'performance', 'library'].includes(String(parsed.view))) continue;
      } else {
        validateComposition(parsed);
      }
    } catch {
      // Invalid historical data stays untouched for manual recovery.
      continue;
    }
    storage.setItem(`${STORAGE_KEY}${suffix}`, raw);
  }
}
