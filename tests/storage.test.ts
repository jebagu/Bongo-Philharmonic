import { describe, expect, it } from 'vitest';
import { createComposition, STORAGE_KEY } from '../src/model';
import { LEGACY_STORAGE_KEY, migrateComposerStorage, readPhilharmonicStorage } from '../src/storage';

function memoryStorage(entries: Record<string, string> = {}) {
  const data = new Map(Object.entries(entries));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
  };
}

describe('Philharmonic save ownership and pre-naming migration', () => {
  it('copies all valid legacy records while retaining the original game and legacy data', () => {
    const draft = JSON.stringify(createComposition());
    const saved = JSON.stringify(createComposition('mario'));
    const presentation = JSON.stringify({ view: 'composer' });
    const legacy = {
      [LEGACY_STORAGE_KEY]: draft,
      [`${LEGACY_STORAGE_KEY}-saved`]: saved,
      [`${LEGACY_STORAGE_KEY}-recovery`]: draft,
      [`${LEGACY_STORAGE_KEY}-presentation`]: presentation,
    };
    const originalGame = {
      'bongo-planet-scene-v1': '{"original":"music"}',
      'bongo-planet-appearance-v1': '{"original":"look"}',
      'bongo-planet-original-look-v1': '{"original":"blue-marble"}',
    };
    const storage = memoryStorage({ ...legacy, ...originalGame });
    migrateComposerStorage(storage);
    for (const [key, value] of Object.entries(legacy)) {
      expect(storage.getItem(key)).toBe(value);
      expect(storage.getItem(key.replace(LEGACY_STORAGE_KEY, STORAGE_KEY))).toBe(value);
    }
    for (const [key, value] of Object.entries(originalGame)) expect(storage.getItem(key)).toBe(value);
    expect(storage.data.size).toBe(11);
  });

  it('prefers each existing Philharmonic record and can safely run again', () => {
    const old = JSON.stringify(createComposition());
    const current = JSON.stringify(createComposition('mario'));
    const storage = memoryStorage({
      [LEGACY_STORAGE_KEY]: old,
      [STORAGE_KEY]: current,
      [`${LEGACY_STORAGE_KEY}-saved`]: old,
      [`${STORAGE_KEY}-saved`]: current,
    });
    migrateComposerStorage(storage);
    migrateComposerStorage(storage);
    expect(storage.data.size).toBe(4);
    expect(readPhilharmonicStorage(storage)).toBe(current);
    expect(readPhilharmonicStorage(storage, '-saved')).toBe(current);
  });

  it('leaves malformed and original-game files untouched instead of migrating them', () => {
    const storage = memoryStorage({
      [LEGACY_STORAGE_KEY]: '{bad',
      [`${LEGACY_STORAGE_KEY}-saved`]: JSON.stringify({ format: 'bongo-planet-composition', version: 1 }),
      [`${LEGACY_STORAGE_KEY}-presentation`]: JSON.stringify({ view: 'original-game' }),
      [`${LEGACY_STORAGE_KEY}-recovery`]: JSON.stringify(createComposition()),
    });
    migrateComposerStorage(storage);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(storage.getItem(`${STORAGE_KEY}-saved`)).toBeNull();
    expect(storage.getItem(`${STORAGE_KEY}-presentation`)).toBeNull();
    expect(storage.getItem(`${STORAGE_KEY}-recovery`)).not.toBeNull();
    expect(storage.getItem(LEGACY_STORAGE_KEY)).toBe('{bad');
  });

  it('can still read legacy drafts when browser quota blocks migration writes', () => {
    const draft = JSON.stringify(createComposition());
    const storage = {
      getItem: (key: string) => key === LEGACY_STORAGE_KEY ? draft : null,
      setItem: () => { throw Error('QuotaExceededError'); },
    };
    expect(() => migrateComposerStorage(storage)).toThrow('QuotaExceededError');
    expect(readPhilharmonicStorage(storage)).toBe(draft);
  });

  it('never discovers an original-game save as a Philharmonic draft', () => {
    const storage = memoryStorage({ 'bongo-planet-scene-v1': JSON.stringify(createComposition()) });
    migrateComposerStorage(storage);
    expect(readPhilharmonicStorage(storage)).toBeNull();
    expect(storage.data.size).toBe(1);
  });
});
