import { z } from 'zod';
import { PUBLIC_SITE } from './release';
import { getInstrument, getInstruments } from './catalog';

export type AssetSetId = 'bongo' | 'mario';
export interface Performer { id: string; instrumentTypeId: string; junctionId: number; familyNumber: number }
export interface ScoreEvent { id: string; performerId: string; pitch: number; startBeat: number; durationBeats: number; velocity: number }
export interface Composition {
  schemaVersion: 1;
  id: string;
  title: string;
  assetSetId: AssetSetId;
  appearance: string;
  performers: Performer[];
  locationNames: Record<string, string>;
  /** Highest number ever assigned in each family, including removed performers. */
  familyCounters?: Record<string, number>;
  tempo: number;
  meter: [number, number];
  editSubdivision: number;
  lengthBeats: number;
  loopRange: [number, number];
  /** Older version-one drafts omit this and restore with looping enabled. */
  loopEnabled?: boolean;
  masterVolume: number;
  events: ScoreEvent[];
}

export const STORAGE_KEY = 'bongo-planet-philharmonic-v1';
export const MAX_PERFORMERS = 16;
export const MAX_EVENTS = 32_768;
export const JUNCTION_COUNT = 92;
export const MAX_LENGTH_BEATS = 32_768;
const identifier = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/, 'Use a nonempty ID of at most 100 letters, numbers, underscores or hyphens.');
const beat = z.number().finite().min(0);
const schema = z.object({
  schemaVersion: z.literal(1),
  id: identifier,
  title: z.string().trim().min(1).max(180),
  assetSetId: z.enum(['bongo', 'mario']),
  appearance: z.string().min(1).max(100),
  performers: z.array(z.object({
    id: identifier,
    instrumentTypeId: z.string().min(1).max(100),
    junctionId: z.number().int().min(0).max(JUNCTION_COUNT - 1),
    familyNumber: z.number().int().min(1).max(1_000_000),
  }).strict()).max(MAX_PERFORMERS, 'Band full — at most 16 performers are allowed.'),
  locationNames: z.record(z.string(), z.string()),
  familyCounters: z.record(z.string(), z.number().int().min(0).max(1_000_000)).optional(),
  tempo: z.number().finite().min(20).max(400),
  meter: z.tuple([z.number().int().min(1).max(16), z.union([z.literal(1), z.literal(2), z.literal(4), z.literal(8), z.literal(16)])]),
  editSubdivision: z.number().int().min(1).max(16),
  lengthBeats: z.number().finite().positive().max(MAX_LENGTH_BEATS),
  loopRange: z.tuple([beat, beat]),
  loopEnabled: z.boolean().default(true),
  masterVolume: z.number().finite().min(0).max(1),
  events: z.array(z.object({
    id: identifier,
    performerId: identifier,
    pitch: z.number().int().min(0).max(127),
    startBeat: beat,
    durationBeats: z.number().finite().positive().max(MAX_LENGTH_BEATS),
    velocity: z.number().finite().min(0).max(1),
  }).strict()).max(MAX_EVENTS, `This score exceeds the ${MAX_EVENTS.toLocaleString('en-US')}-event file limit.`),
}).strict();

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const validJunction = (junction: number) => Number.isInteger(junction) && junction >= 0 && junction < JUNCTION_COUNT;

/** Quarter-note beats are finite JS numbers: imports are never rounded or snapped. */
export function validateComposition(input: unknown): Composition {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw Error(`${issue.path.length ? `${issue.path.join('.')}: ` : ''}${issue.message}`);
  }
  const composition: Composition = result.data;
  if (PUBLIC_SITE && composition.assetSetId !== 'bongo') throw Error('This sound set is available in the local application only.');
  const types = new Set(getInstruments(composition.assetSetId).map(instrument => instrument.id));
  const performerIds = new Set<string>();
  const junctions = new Set<number>();
  const familyNumbers = new Set<string>();
  const counters = { ...composition.familyCounters };
  for (const performer of composition.performers) {
    if (!types.has(performer.instrumentTypeId)) throw Error('A performer belongs to the other asset set or has an unknown sound.');
    if (performerIds.has(performer.id)) throw Error('Performer IDs must be unique.');
    if (junctions.has(performer.junctionId)) throw Error(`Junction ${performer.junctionId + 1} is occupied. Choose an empty junction.`);
    const familyKey = `${performer.instrumentTypeId}:${performer.familyNumber}`;
    if (familyNumbers.has(familyKey)) throw Error('Family numbers must be unique within each instrument type.');
    performerIds.add(performer.id);
    junctions.add(performer.junctionId);
    familyNumbers.add(familyKey);
    if (composition.familyCounters?.[performer.instrumentTypeId] !== undefined && counters[performer.instrumentTypeId] < performer.familyNumber) {
      throw Error('A family counter cannot be lower than an existing performer number.');
    }
    counters[performer.instrumentTypeId] = Math.max(counters[performer.instrumentTypeId] ?? 0, performer.familyNumber);
  }
  for (const key of Object.keys(counters)) if (!types.has(key)) throw Error('A family counter belongs to an unknown sound in this asset set.');
  composition.familyCounters = counters;
  const names: Record<string, string> = {};
  for (const [junction, rawName] of Object.entries(composition.locationNames)) {
    if (!/^(0|[1-9]\d*)$/.test(junction) || !validJunction(Number(junction))) throw Error('Location names must refer to a valid junction.');
    const name = rawName.trim();
    if ([...segmenter.segment(name)].length > 40) throw Error('Location names can contain at most 40 characters.');
    if (name) names[junction] = name;
  }
  composition.locationNames = names;
  if (composition.loopRange[0] >= composition.loopRange[1] || composition.loopRange[1] > composition.lengthBeats) {
    throw Error('The loop must have a positive length and stay inside the score.');
  }
  const eventIds = new Set<string>();
  for (const event of composition.events) {
    if (eventIds.has(event.id)) throw Error('Score event IDs must be unique.');
    if (!performerIds.has(event.performerId)) throw Error('A note refers to a performer that is not placed.');
    if (event.startBeat >= composition.lengthBeats) throw Error('Every note must start inside the score.');
    eventIds.add(event.id);
  }
  // Deliberate imported unisons are valid; only interactive add/move rejects an accidental duplicate.
  return composition;
}

const uid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
export function createComposition(assetSetId: AssetSetId = 'bongo'): Composition {
  return validateComposition({
    schemaVersion: 1, id: uid('composition'), title: 'Untitled', assetSetId, appearance: 'original',
    performers: [], locationNames: {}, familyCounters: {}, tempo: 120, meter: [4, 4], editSubdivision: 4,
    lengthBeats: 16, loopRange: [0, 16], loopEnabled: true, masterVolume: .7, events: [],
  });
}

export function addPerformer(composition: Composition, instrumentTypeId: string, junctionId: number): Composition {
  const next = validateComposition(composition);
  getInstrument(next.assetSetId, instrumentTypeId);
  if (next.performers.length >= MAX_PERFORMERS) throw Error('Band full — 16 / 16. Remove a performer before placing another.');
  if (!validJunction(junctionId)) throw Error('Choose one of the 92 junctions.');
  if (next.performers.some(performer => performer.junctionId === junctionId)) throw Error(`Junction ${junctionId + 1} is occupied. Choose an empty junction.`);
  const familyNumber = (next.familyCounters?.[instrumentTypeId] ?? 0) + 1;
  next.performers.push({ id: uid('performer'), instrumentTypeId, junctionId, familyNumber });
  next.familyCounters![instrumentTypeId] = familyNumber;
  return validateComposition(next);
}

export function movePerformer(composition: Composition, performerId: string, junctionId: number): Composition {
  const next = validateComposition(composition);
  const performer = next.performers.find(item => item.id === performerId);
  if (!performer) throw Error('That performer is no longer placed.');
  performer.junctionId = junctionId;
  return validateComposition(next);
}

export function removePerformer(composition: Composition, performerId: string, mode: 'notes' | { reassignTo: string }): Composition {
  const next = validateComposition(composition);
  const performer = next.performers.find(item => item.id === performerId);
  if (!performer) throw Error('That performer is no longer placed.');
  if (mode === 'notes') next.events = next.events.filter(event => event.performerId !== performerId);
  else {
    const target = next.performers.find(item => item.id === mode.reassignTo && item.id !== performerId);
    if (!target || target.instrumentTypeId !== performer.instrumentTypeId) throw Error('Choose another placed performer of the same sound for reassignment.');
    next.events = next.events.map(event => event.performerId === performerId ? { ...event, performerId: target.id } : event);
  }
  next.performers = next.performers.filter(item => item.id !== performerId);
  return validateComposition(next);
}

export function renameLocation(composition: Composition, junctionId: number, name: string): Composition {
  const next = validateComposition(composition);
  if (!validJunction(junctionId)) throw Error('Choose one of the 92 junctions.');
  next.locationNames[String(junctionId)] = name;
  return validateComposition(next);
}

function rejectEditorDuplicate(composition: Composition, event: ScoreEvent) {
  if (composition.events.some(other => other.id !== event.id && other.performerId === event.performerId && other.pitch === event.pitch && Math.abs(other.startBeat - event.startBeat) < 1e-9)) {
    throw Error('This performer already has that note at this time.');
  }
}

export function addEvent(composition: Composition, data: Omit<ScoreEvent, 'id'>): Composition {
  const next = validateComposition(composition);
  const event = { ...data, id: uid('event') };
  rejectEditorDuplicate(next, event);
  next.events.push(event);
  return validateComposition(next);
}

export function updateEvent(composition: Composition, eventId: string, patch: Partial<Omit<ScoreEvent, 'id'>>): Composition {
  const next = validateComposition(composition);
  const index = next.events.findIndex(event => event.id === eventId);
  if (index < 0) throw Error('That note no longer exists.');
  const old = next.events[index];
  const event = { ...old, ...patch };
  if (old.performerId !== event.performerId || old.pitch !== event.pitch || old.startBeat !== event.startBeat) rejectEditorDuplicate(next, event);
  next.events[index] = event;
  return validateComposition(next);
}

export function removeEvents(composition: Composition, eventIds: readonly string[]): Composition {
  const next = validateComposition(composition);
  const ids = new Set(eventIds);
  next.events = next.events.filter(event => !ids.has(event.id));
  return next;
}

export const pitchName = (pitch: number) => `${['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][pitch % 12]}${Math.floor(pitch / 12) - 1}`;
export const locationLabel = (composition: Composition, junctionId: number) => composition.locationNames[String(junctionId)] || `Junction ${junctionId + 1}`;
export const performerLabel = (composition: Composition, performer: Performer) => `${getInstrument(composition.assetSetId, performer.instrumentTypeId).name} ${performer.familyNumber}`;

/** Whole-composition transactions include imports, presets, New, names, band and score. */
export class History {
  private states: Composition[];
  private index = 0;
  constructor(initial: Composition, private readonly limit = 64) {
    if (!Number.isInteger(limit) || limit < 2) throw Error('History requires at least two states.');
    this.states = [validateComposition(initial)];
  }
  get current(): Composition { return structuredClone(this.states[this.index]); }
  get canUndo(): boolean { return this.index > 0; }
  get canRedo(): boolean { return this.index < this.states.length - 1; }
  commit(next: Composition): Composition {
    const validated = validateComposition(next);
    if (JSON.stringify(validated) === JSON.stringify(this.states[this.index])) return this.current;
    this.states = this.states.slice(0, this.index + 1);
    this.states.push(validated);
    if (this.states.length > this.limit) this.states.shift();
    this.index = this.states.length - 1;
    return this.current;
  }
  undo(): Composition { if (this.canUndo) this.index--; return this.current; }
  redo(): Composition { if (this.canRedo) this.index++; return this.current; }
}
