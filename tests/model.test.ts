import { describe, expect, it } from 'vitest';
import {
  addEvent, addPerformer, createComposition, History, MAX_EVENTS, movePerformer,
  removeEvents, removePerformer, renameLocation, updateEvent, validateComposition,
} from '../src/model';
import { getInstruments } from '../src/catalog';

const withGuitar = () => addPerformer(createComposition(), 'guitar', 0);
const note = (performerId: string, pitch = 60, startBeat = 0) => ({ performerId, pitch, startBeat, durationBeats: 1, velocity: .7 });

describe('Composer band and score transactions', () => {
  it('starts blank and validates sixteen deliberate copies of a single sound', () => {
    let composition = createComposition('mario');
    expect(composition).toMatchObject({ assetSetId: 'mario', performers: [], events: [], meter: [4, 4], editSubdivision: 4, lengthBeats: 16 });
    for (let junction = 0; junction < 16; junction++) composition = addPerformer(composition, 'mario', junction);
    expect(validateComposition(JSON.parse(JSON.stringify(composition)))).toEqual(composition);
    expect(composition.performers.map(performer => performer.familyNumber)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
    const before = structuredClone(composition);
    expect(() => addPerformer(composition, 'mario', 16)).toThrow('16 / 16');
    expect(composition).toEqual(before);
    expect(() => validateComposition({ ...composition, performers: [...composition.performers, { ...composition.performers[0], id: 'seventeenth', junctionId: 16, familyNumber: 17 }] })).toThrow('16');
  });

  it('persists disabled looping and defaults older version-one drafts to enabled', () => {
    const composition = createComposition();
    expect(composition.loopEnabled).toBe(true);
    const disabled = validateComposition(JSON.parse(JSON.stringify({ ...composition, loopEnabled: false })));
    expect(disabled.loopEnabled).toBe(false);
    const { loopEnabled: _legacyMissing, ...legacy } = composition;
    expect(validateComposition(legacy).loopEnabled).toBe(true);
    expect(() => validateComposition({ ...composition, loopEnabled: 'yes' })).toThrow();
  });

  it('rejects occupied placements and moves without changing the input or allocating a copy', () => {
    const composition = addPerformer(withGuitar(), 'guitar', 1);
    const before = structuredClone(composition);
    expect(() => addPerformer(composition, 'piano', 1)).toThrow('occupied');
    expect(() => movePerformer(composition, composition.performers[0].id, 1)).toThrow('occupied');
    expect(composition).toEqual(before);
    expect(addPerformer(composition, 'guitar', 2).performers.at(-1)!.familyNumber).toBe(3);
  });

  it('writes ordinary stacked chord events on one performer', () => {
    let composition = withGuitar();
    const id = composition.performers[0].id;
    for (const pitch of [60, 64, 67]) composition = addEvent(composition, note(id, pitch));
    expect(composition.performers).toHaveLength(1);
    expect(composition.events.map(event => [event.performerId, event.pitch, event.startBeat])).toEqual([[id, 60, 0], [id, 64, 0], [id, 67, 0]]);
    expect(() => addEvent(composition, note(id))).toThrow('already has');
    expect(() => addEvent(composition, note('missing'))).toThrow('not placed');
    expect(composition.events).toHaveLength(3);
  });

  it('moves a performer without touching events, its number, or location-owned names', () => {
    let composition = withGuitar();
    const id = composition.performers[0].id;
    composition = addEvent(composition, note(id));
    composition = renameLocation(renameLocation(composition, 0, 'Lagoon'), 4, 'Moon Garden');
    const moved = movePerformer(composition, id, 4);
    expect(moved.events).toEqual(composition.events);
    expect(moved.performers[0]).toEqual({ ...composition.performers[0], junctionId: 4 });
    expect(moved.locationNames).toEqual({ '0': 'Lagoon', '4': 'Moon Garden' });
  });

  it('keeps monotonic family numbers after removing the highest numbered copy and saving', () => {
    let composition = addPerformer(withGuitar(), 'guitar', 1);
    composition = removePerformer(composition, composition.performers[1].id, 'notes');
    composition = validateComposition(JSON.parse(JSON.stringify(composition)));
    composition = addPerformer(composition, 'guitar', 2);
    expect(composition.performers.map(performer => performer.familyNumber)).toEqual([1, 3]);
    expect(composition.familyCounters).toEqual({ guitar: 3 });
    expect(() => validateComposition({ ...composition, familyCounters: { guitar: 2 } })).toThrow('counter');
  });

  it('counts Unicode graphemes, trims names, permits duplicates and clears empty names', () => {
    const name = '👨‍👩‍👧‍👦'.repeat(40);
    let composition = renameLocation(createComposition(), 0, `  ${name}  `);
    composition = renameLocation(composition, 1, name);
    expect(composition.locationNames).toEqual({ '0': name, '1': name });
    expect(() => renameLocation(composition, 2, `${name}x`)).toThrow('40');
    expect(renameLocation(composition, 0, '   ').locationNames).toEqual({ '1': name });
    expect(renameLocation(composition, 0, '<script>text only</script>').locationNames['0']).toBe('<script>text only</script>');
    expect(() => renameLocation(composition, 92, 'Elsewhere')).toThrow('92');
  });

  it('removes or explicitly reassigns referenced notes atomically to the same sound', () => {
    let composition = addPerformer(addPerformer(withGuitar(), 'guitar', 1), 'piano', 2);
    const [first, second, piano] = composition.performers;
    composition = addEvent(addEvent(composition, note(first.id)), note(second.id));
    const before = structuredClone(composition);
    expect(() => removePerformer(composition, first.id, { reassignTo: piano.id })).toThrow('same sound');
    expect(() => removePerformer(composition, first.id, { reassignTo: first.id })).toThrow('another');
    expect(composition).toEqual(before);
    const reassigned = removePerformer(composition, first.id, { reassignTo: second.id });
    expect(reassigned.performers).toHaveLength(2);
    expect(reassigned.events).toHaveLength(2);
    expect(reassigned.events.every(event => event.performerId === second.id)).toBe(true);
    expect(reassigned.events.map(event => event.id)).toEqual(composition.events.map(event => event.id));
    expect(removePerformer(composition, first.id, 'notes').events).toEqual([composition.events[1]]);
  });

  it('preserves fractional imported arrivals and legitimate unisons while preventing accidental edit duplicates', () => {
    let composition = withGuitar();
    composition = addEvent(composition, note(composition.performers[0].id, 60, .123456789012345));
    composition = validateComposition({ ...composition, events: [...composition.events, { ...composition.events[0], id: 'separate-source-attack' }] });
    expect(composition.events).toHaveLength(2);
    expect(composition.events[0].startBeat).toBe(.123456789012345);
    expect(updateEvent(composition, composition.events[0].id, { velocity: .4 }).events[0].velocity).toBe(.4);
    const shifted = updateEvent(composition, composition.events[0].id, { pitch: 61 });
    expect(() => updateEvent(shifted, shifted.events[0].id, { pitch: 60 })).toThrow('already has');
  });

  it('erases score events while preserving band and names, including tails across the end', () => {
    let composition = renameLocation(withGuitar(), 0, 'Lagoon');
    composition = addEvent(composition, { ...note(composition.performers[0].id, 60, 15.75), durationBeats: 8 });
    expect(composition.events[0].durationBeats).toBe(8);
    const cleared = removeEvents(composition, composition.events.map(event => event.id));
    expect(cleared.events).toEqual([]);
    expect(cleared.performers).toEqual(composition.performers);
    expect(cleared.locationNames).toEqual(composition.locationNames);
  });

  it('rejects bad banks, references, IDs, times, loops, and unrecognized old formats', () => {
    const composition = withGuitar();
    const performer = composition.performers[0];
    expect(() => addPerformer(composition, 'mario', 1)).toThrow('Unknown');
    expect(() => validateComposition({ ...composition, performers: [performer, performer] })).toThrow('unique');
    expect(() => validateComposition({ ...composition, events: [{ id: 'n', ...note('missing') }] })).toThrow('not placed');
    expect(() => validateComposition({ ...composition, events: [{ id: 'n', ...note(performer.id, 60, 16) }] })).toThrow('inside');
    expect(() => validateComposition({ ...composition, loopRange: [4, 4] })).toThrow('positive length');
    expect(() => validateComposition({ ...composition, loopRange: [0, 17] })).toThrow('inside');
    expect(() => validateComposition({ ...composition, tempo: Infinity })).toThrow();
    expect(() => validateComposition({ ...composition, schemaVersion: 2 })).toThrow();
    expect(() => validateComposition({ ...composition, format: 'old-game' })).toThrow();
  });

  it('admits the event file limit and rejects excess without dropping written notes', () => {
    const composition = withGuitar();
    const events = Array.from({ length: MAX_EVENTS }, (_, index) => ({ id: `event_${index}`, ...note(composition.performers[0].id) }));
    const full = validateComposition({ ...composition, events });
    expect(full.events).toHaveLength(MAX_EVENTS);
    expect(() => addEvent(full, note(composition.performers[0].id, 61))).toThrow('event file limit');
    expect(full.events).toHaveLength(MAX_EVENTS);
  });

  it('provides ten Bongo sounds and all fifteen original Mario portraits', () => {
    expect(getInstruments('bongo')).toHaveLength(10);
    expect(getInstruments('mario')).toHaveLength(15);
    for (const instrument of getInstruments('mario')) expect(instrument.portrait).toMatch(/^\/BongoPlanet\/asset-packs\/mario-paint\/sprites\//);
  });
});

describe('Composer replacement and edit history', () => {
  it('undoes removal with notes/names and whole New/import replacements', () => {
    let composition = renameLocation(withGuitar(), 0, 'Lagoon');
    composition = addEvent(composition, note(composition.performers[0].id));
    const history = new History(composition);
    const removed = removePerformer(composition, composition.performers[0].id, 'notes');
    history.commit(removed);
    expect(history.undo()).toEqual(composition);
    expect(history.redo()).toEqual(removed);
    history.commit(createComposition('mario'));
    expect(history.undo()).toEqual(removed);
    expect(history.undo()).toEqual(composition);
  });

  it('keeps redo/history intact after an invalid or identical transaction and isolates returned data', () => {
    const initial = withGuitar();
    const history = new History(initial);
    const named = renameLocation(initial, 0, 'Lagoon');
    history.commit(named);
    history.undo();
    expect(() => history.commit({ ...initial, tempo: NaN })).toThrow();
    history.commit(initial);
    expect(history.canRedo).toBe(true);
    const current = history.current;
    current.performers.splice(0);
    expect(history.current).toEqual(initial);
    history.redo();
    expect(history.current).toEqual(named);
  });
});
