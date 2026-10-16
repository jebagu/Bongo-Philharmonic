import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import sourceAudit from '../assets/library/library-provenance.json' with { type: 'json' };
import { getInstrument } from '../src/catalog';
import { convertSourceEntry, LIBRARY, loadLibrary, SOURCE_ENTRIES, SOURCE_LIBRARY, validateLibraryInventory } from '../src/library';
import { validateComposition } from '../src/model';
import { MARIO_PAINT_IDS } from '../foundation/src/asset-packs/mario-paint/types';
import EXAMPLE_GROUPS from './fixtures/favorite-groups.json' with { type: 'json' };
import { dot, topology } from '../foundation/src/core/geometry';

describe('Composer source-only capped library arrangements', () => {
  // First conversion case deliberately contains two performers of every pitched type.
  it('preserves every performer and assignment in an under-cap band with repeated types', () => {
    const source = SOURCE_LIBRARY.find(entry => entry.id === 'bongo-F10')!;
    const converted = convertSourceEntry(source);
    expect(source.song.pieces).toHaveLength(10);
    expect(new Set(source.song.pieces.map(piece => piece.instrument)).size).toBe(5);
    expect(converted.composition.performers.map(performer => performer.id)).toEqual(source.song.pieces.map(piece => piece.id));
    expect(converted.composition.events.map(event => event.performerId)).toEqual(source.song.notes.map(note => note.pieceId));
    expect(converted.provenance.consolidated).toBe(false);
  });

  it('inventories all 25 menu entries and verifies the independently retained Favorite fixture hashes', () => {
    expect(validateLibraryInventory()).toBeUndefined();
    expect(SOURCE_ENTRIES).toHaveLength(25);
    expect(LIBRARY).toHaveLength(32);
    expect(SOURCE_ENTRIES.filter(entry => entry.assetSetId === 'bongo')).toHaveLength(22);
    expect(SOURCE_ENTRIES.filter(entry => entry.assetSetId === 'mario')).toHaveLength(3);
    const favoriteGroups = EXAMPLE_GROUPS.filter(group => group.name.toLowerCase().startsWith('favorites'));
    for (const group of favoriteGroups) {
      expect(LIBRARY.filter(entry => entry.group === group.name).map(entry => entry.id)).toEqual(group.examples.map(entry => `bongo-${entry.id}`));
    }
    expect(SOURCE_ENTRIES.reduce((count, entry) => count + entry.composition.events.length, 0)).toBe(3204);
    for (const record of sourceAudit.favorites) {
      expect(createHash('sha256').update(readFileSync(new URL(`./fixtures/${record.fixture}`, import.meta.url))).digest('hex'), record.fixture).toBe(record.fixtureSha256);
    }
  });

  it('gives every complete arrangement an authored, spaced front-facing layout', () => {
    for (const entry of LIBRARY) {
      expect(entry.layoutName.length, entry.id).toBeGreaterThan(5);
      expect(entry.provenance.rationale, entry.id).toContain(entry.layoutName);
      const junctions = entry.composition.performers.map(performer => performer.junctionId);
      for (const [index, junction] of junctions.entries()) {
        expect(-topology.vertices[junction][1], entry.id).toBeGreaterThanOrEqual(.2);
        for (const other of junctions.slice(index + 1)) {
          // Twenty degrees is the narrowest authored separation on this mesh.
          expect(dot(topology.vertices[junction], topology.vertices[other]), entry.id).toBeLessThan(Math.cos(20 * Math.PI / 180));
        }
      }
    }
  });

  it('uses different spatial shapes for different songs with equally sized bands', () => {
    const layouts = new Map<number, Set<string>>();
    for (const entry of SOURCE_ENTRIES.filter(item => item.id !== 'bongo-BR02-FAV')) {
      const junctions = entry.composition.performers.map(performer => performer.junctionId).sort((a, b) => a - b);
      const peers = layouts.get(junctions.length) ?? new Set<string>();
      const shape = junctions.join(',');
      expect(peers.has(shape), `${entry.id} repeats another ${junctions.length}-performer shape`).toBe(false);
      peers.add(shape);
      layouts.set(junctions.length, peers);
    }
    const original = LIBRARY.find(entry => entry.id === 'bongo-BR02')!;
    const duplicate = LIBRARY.find(entry => entry.id === 'bongo-BR02-FAV')!;
    expect(duplicate.layoutName).toBe(original.layoutName);
    expect(duplicate.composition.performers.map(performer => performer.junctionId)).toEqual(original.composition.performers.map(performer => performer.junctionId));
  });

  it('places each of Toy Ensemble’s deliberate pairs in its own upper/lower column', () => {
    const entry = LIBRARY.find(item => item.id === 'bongo-F10')!;
    for (const type of new Set(entry.composition.performers.map(performer => performer.instrumentTypeId))) {
      const pair = entry.composition.performers.filter(performer => performer.instrumentTypeId === type);
      expect(pair).toHaveLength(2);
      const [a, b] = pair.map(performer => topology.vertices[performer.junctionId]);
      expect(Math.abs(a[0] - b[0])).toBeLessThan(.3);
      expect(a[2] * b[2]).toBeLessThan(0);
    }
  });

  it.each(SOURCE_LIBRARY)('$id preserves every ordered attack, register, onset, duration, note and master level', source => {
    const entry = LIBRARY.find(item => item.id === source.id)!;
    const composition = validateComposition(entry.composition);
    expect(composition.performers.length).toBeLessThanOrEqual(16);
    expect(new Set(composition.performers.map(performer => performer.junctionId)).size).toBe(composition.performers.length);
    expect(composition.tempo).toBe(source.song.bpm);
    expect(composition.masterVolume).toBe(source.song.volume);
    expect(composition.loopEnabled).toBe(source.song.loop);
    expect(composition.lengthBeats).toBe(source.song.steps / source.song.stepsPerBeat);
    expect(composition.events).toHaveLength(source.song.notes.length);
    for (const [index, event] of composition.events.entries()) {
      const note = source.song.notes[index];
      const original = source.song.pieces.find(piece => piece.id === note.pieceId)!;
      const performer = composition.performers.find(item => item.id === event.performerId)!;
      expect(event).toEqual({ id: note.id, performerId: entry.provenance.performerMap[note.pieceId], pitch: note.midi, startBeat: note.step / source.song.stepsPerBeat, durationBeats: note.steps / source.song.stepsPerBeat, velocity: note.velocity });
      expect(performer.instrumentTypeId).toBe(original.instrument);
    }
    if (source.song.pieces.length <= 16) {
      expect(composition.performers.map(performer => performer.id)).toEqual(source.song.pieces.map(piece => piece.id));
      expect(composition.events.map(event => event.performerId)).toEqual(source.song.notes.map(note => note.pieceId));
    }
  });

  it.each([['bongo-A01', 166], ['bongo-C03', 304]] as const)('%s retains sixteen original performers including duplicates and every one of %i attacks', (id, count) => {
    const source = SOURCE_LIBRARY.find(entry => entry.id === id)!;
    const entry = LIBRARY.find(item => item.id === id)!;
    expect(source.song.pieces).toHaveLength(39);
    expect(entry.composition.performers).toHaveLength(16);
    expect(entry.composition.events).toHaveLength(count);
    expect(entry.provenance.omittedPerformerIds).toHaveLength(23);
    expect(new Set(entry.composition.performers.map(performer => performer.instrumentTypeId)).size).toBe(9);
    expect(entry.composition.performers.filter(performer => getInstrument('bongo', performer.instrumentTypeId).percussion).length).toBeGreaterThan(0);
    expect(convertSourceEntry(source)).toEqual(entry);
    // Every family's event-count winner is retained; ties use stable source IDs.
    for (const type of new Set(source.song.pieces.map(piece => piece.instrument))) {
      const family = source.song.pieces.filter(piece => piece.instrument === type).sort((a, b) =>
        source.song.notes.filter(note => note.pieceId === b.id).length - source.song.notes.filter(note => note.pieceId === a.id).length || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      expect(entry.provenance.retainedPerformerIds).toContain(family[0].id);
    }
  });

  it('preserves native record bytes, exact fractional tempo and saved loop intent', () => {
    const staff = [59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79];
    for (const record of sourceAudit.mario) {
      const entry = LIBRARY.find(item => item.id === record.id)!;
      const composition = entry.composition;
      const bytes = Buffer.alloc(0x240);
      for (let cell = 0; cell < 288; cell++) bytes.writeUInt16LE(0xdfff, cell * 2);
      for (const event of composition.events) {
        const performer = composition.performers.find(item => item.id === event.performerId)!;
        const slot = Number(event.id.split('_').at(-1));
        const offset = event.startBeat * 6 + slot * 2;
        bytes[offset] = staff.indexOf(event.pitch) + 1;
        bytes[offset + 1] = MARIO_PAINT_IDS.indexOf(performer.instrumentTypeId as typeof MARIO_PAINT_IDS[number]);
      }
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(record.scoreSha256);
      expect(composition.tempo).toBe(record.bpm);
      expect(entry.provenance.sourceLoop).toBe(record.id !== 'mario-demo-1');
    }
  });

  it('returns independent compositions and retains the deliberately duplicated menu arrangement', () => {
    const loaded = loadLibrary();
    loaded.find(entry => entry.id === 'mario-demo-1')!.composition.events.splice(0);
    expect(LIBRARY.find(entry => entry.id === 'mario-demo-1')!.composition.events).toHaveLength(163);
    const tuple = (id: string) => LIBRARY.find(entry => entry.id === id)!.composition.events.map(event => [event.pitch, event.startBeat, event.durationBeats, event.velocity]);
    expect(tuple('bongo-BR02-FAV')).toEqual(tuple('bongo-BR02'));
  });
});
