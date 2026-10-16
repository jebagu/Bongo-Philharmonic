import { PUBLIC_SITE } from './release';
import sourceData from '../assets/library/library.json' with { type: 'json' };
import sourceAudit from '../assets/library/library-provenance.json' with { type: 'json' };
import simpleFavorites from '../foundation/assets/favorite-presets.json' with { type: 'json' };
import chordFavorites from '../foundation/assets/chord-favorites.json' with { type: 'json' };
import popFavorites from '../foundation/assets/pop-presets.json' with { type: 'json' };
import loopFavorites from '../foundation/assets/loop-favorites.json' with { type: 'json' };
import { topology, dot } from '../foundation/src/core/geometry';
import { getInstrument } from './catalog';
import { MAX_PERFORMERS, validateComposition, type AssetSetId, type Composition } from './model';

/** Read-only music input. No old experiment state, player or UI is imported. */
export interface SourceLibraryEntry {
  id: string;
  name: string;
  set: AssetSetId;
  group: string;
  source?: string;
  song: {
    title: string;
    bpm: number;
    volume: number;
    loop: boolean;
    steps: number;
    stepsPerBeat: number;
    meter: number;
    pieces: { id: string; vertex: number; instrument: string; label: string }[];
    notes: { id: string; pieceId: string; midi: number; step: number; steps: number; velocity: number }[];
  };
}

export interface LibraryProvenance {
  sourceLibrary: 'song-studio/library.json';
  sourceEntryId: string;
  sourceDescription: string;
  sourceLoop: boolean;
  originalPerformerCount: number;
  retainedPerformerCount: number;
  sourceEventCount: number;
  retainedEventCount: number;
  consolidated: boolean;
  retainedPerformerIds: string[];
  omittedPerformerIds: string[];
  performerMap: Record<string, string>;
  rationale: string;
  sourceRecord?: object;
}
export interface LibraryEntry {
  id: string;
  title: string;
  assetSetId: AssetSetId;
  group: string;
  description: string;
  layoutName: string;
  composition: Composition;
  provenance: LibraryProvenance;
}

export const SOURCE_LIBRARY = sourceData as unknown as readonly SourceLibraryEntry[];
const idOrder = (left: { id: string }, right: { id: string }) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
const median = (values: number[]) => {
  const ordered = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length ? ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2 : 60;
};

type SpatialLayout = { name: string; junctions: readonly number[] };

/**
 * Authored in composition axes (right, forward, up), facing the initial camera.
 * Slots follow related sound families; the original performer array stays intact.
 * The two menu slots for the same Spark Build deliberately share its layout.
 */
const SPATIAL_LAYOUTS: Record<string, SpatialLayout> = {
  'mario-demo-1': { name: 'Three staggered rows', junctions: [41, 39, 66, 44, 72, 62, 64, 89, 77, 75, 81] },
  'mario-demo-2': { name: 'Front-center solo', junctions: [69] },
  'mario-demo-3': { name: 'Wide picture fan', junctions: [41, 39, 66, 43, 72, 71, 62, 67, 47, 78, 76, 74, 79, 50, 83] },
  'bongo-S13': { name: 'Melody above rhythm', junctions: [41, 39, 66, 43, 72, 62, 67, 44, 64, 89, 77, 75, 81] },
  'bongo-F10': { name: 'Paired columns', junctions: [41, 89, 73, 77, 71, 76, 63, 75, 66, 81] },
  'bongo-A01': { name: 'Outer ring and inner six', junctions: [41, 66, 67, 84, 80, 83, 50, 48, 46, 43, 73, 63, 61, 75, 77, 45] },
  'bongo-R-S44': { name: 'Two interleaved arcs', junctions: [43, 41, 39, 66, 67, 44, 72, 71, 62, 64, 48, 89, 76, 81, 80] },
  'bongo-N02': { name: 'High open diamond', junctions: [39, 44, 64, 76] },
  'bongo-S43': { name: 'Two offset trios', junctions: [41, 71, 67, 48, 76, 81] },
  'bongo-BR02-FAV': { name: 'Upper voices and rhythm arc', junctions: [41, 39, 66, 45, 61, 89, 77, 75, 81] },
  'bongo-C01': { name: 'Wide hexagon', junctions: [41, 66, 84, 83, 50, 46] },
  'bongo-C02': { name: 'Stepped ensemble rows', junctions: [41, 39, 66, 43, 72, 71, 62, 67, 89, 77, 76, 75, 81] },
  'bongo-C03': { name: 'Outer ring and central four', junctions: [43, 41, 39, 66, 67, 84, 80, 83, 51, 50, 48, 46, 72, 62, 78, 74] },
  'bongo-C06': { name: 'Rising diagonal', junctions: [89, 78, 71, 63, 65, 68] },
  'bongo-C07': { name: 'Square ensemble', junctions: [72, 62, 78, 74] },
  'bongo-C08': { name: 'Melody arch and bass', junctions: [41, 39, 66, 89, 81] },
  'bongo-C09': { name: 'Wide horizontal row', junctions: [46, 70, 69, 84] },
  'bongo-C10': { name: 'Tall diamond with bass', junctions: [39, 45, 61, 77, 75] },
  'bongo-C11': { name: 'Open semicircle', junctions: [43, 41, 39, 66, 67] },
  'bongo-C12': { name: 'Paired diagonal lines', junctions: [41, 72, 45, 61, 74, 81] },
  'bongo-P04': { name: 'Lead row and drum row', junctions: [88, 71, 65, 89, 76, 81] },
  'bongo-P05': { name: 'Melody fan and drum row', junctions: [41, 73, 63, 66, 89, 76, 81] },
  'bongo-BR01': { name: 'Upper arc and lower rhythm', junctions: [43, 41, 39, 66, 67, 45, 61, 48, 77, 75, 80] },
  'bongo-BR02': { name: 'Upper voices and rhythm arc', junctions: [41, 39, 66, 45, 61, 89, 77, 75, 81] },
  'bongo-BR03': { name: 'Tilted quartet', junctions: [41, 67, 89, 75] },
};

/** Maximin fallback for explicit future source conversion; never for user imports. */
function spacedLayout(count: number): number[] {
  const candidates = topology.vertices.map((point, id) => ({ point, id })).filter(({ point }) => -point[1] > .12);
  const selected: number[] = [];
  while (selected.length < count) {
    let best = -1;
    let bestDistance = -Infinity;
    for (const { point, id } of candidates) {
      if (selected.includes(id)) continue;
      // Start at the center; then maximize distance to every chosen neighbor.
      const distance = selected.length ? Math.min(...selected.map(other => 1 - dot(point, topology.vertices[other]))) : -point[1];
      if (distance > bestDistance + 1e-12 || Math.abs(distance - bestDistance) <= 1e-12 && id < best) {
        best = id;
        bestDistance = distance;
      }
    }
    if (best < 0) throw Error('Could not arrange the preset at distinct junctions.');
    selected.push(best);
  }
  return selected;
}

function spatialLayout(sourceId: string, count: number): SpatialLayout {
  const plan = SPATIAL_LAYOUTS[sourceId] ?? { name: 'Spaced front ensemble', junctions: spacedLayout(count) };
  if (plan.junctions.length !== count) throw Error(`Review the authored spatial layout for ${sourceId}: its source band changed.`);
  if (new Set(plan.junctions).size !== count || plan.junctions.some(id => !topology.vertices[id] || -topology.vertices[id][1] < .2)) {
    throw Error(`Invalid authored front-hemisphere layout for ${sourceId}.`);
  }
  return plan;
}

/** The explicit, source-only editorial conversion in Composer PRD §10. Never used for imports. */
export function convertSourceEntry(source: SourceLibraryEntry): LibraryEntry {
  const song = source.song;
  const pieces = song.pieces;
  const pieceIds = new Set(pieces.map(piece => piece.id));
  if (pieceIds.size !== pieces.length) throw Error(`Duplicate source performer in ${source.id}.`);
  for (const piece of pieces) getInstrument(source.set, piece.instrument);
  for (const note of song.notes) if (!pieceIds.has(note.pieceId)) throw Error(`Unplaced source note in ${source.id}.`);
  const eventsByPerformer = new Map(pieces.map(piece => [piece.id, song.notes.filter(note => note.pieceId === piece.id)]));
  const count = (id: string) => eventsByPerformer.get(id)!.length;
  const register = new Map(pieces.map(piece => [piece.id, median(eventsByPerformer.get(piece.id)!.map(note => note.midi))]));
  const ranked = pieces.slice().sort((a, b) => count(b.id) - count(a.id) || idOrder(a, b));
  const retained = new Set<string>();
  if (pieces.length <= MAX_PERFORMERS) pieces.forEach(piece => retained.add(piece.id));
  else {
    const types = new Set(pieces.map(piece => piece.instrument));
    if (types.size > MAX_PERFORMERS) throw Error('This source uses more instrument types than the capped arrangement can retain.');
    for (const type of [...types].sort()) retained.add(ranked.find(piece => piece.instrument === type)!.id);
    for (const piece of ranked) {
      if (retained.size === MAX_PERFORMERS) break;
      retained.add(piece.id);
    }
  }
  const keptPieces = pieces.filter(piece => retained.has(piece.id));
  const omittedPieces = pieces.filter(piece => !retained.has(piece.id)).sort(idOrder);
  const performerMap: Record<string, string> = Object.fromEntries(keptPieces.map(piece => [piece.id, piece.id]));
  const loads = new Map(keptPieces.map(piece => [piece.id, count(piece.id)]));
  for (const piece of omittedPieces) {
    const percussion = getInstrument(source.set, piece.instrument).percussion;
    const target = keptPieces.filter(candidate => candidate.instrument === piece.instrument).sort((a, b) =>
      (percussion ? loads.get(a.id)! - loads.get(b.id)! : Math.abs(register.get(a.id)! - register.get(piece.id)!) - Math.abs(register.get(b.id)! - register.get(piece.id)!)) || idOrder(a, b))[0];
    if (!target) throw Error(`No retained performer for ${piece.instrument}.`);
    performerMap[piece.id] = target.id;
    loads.set(target.id, loads.get(target.id)! + count(piece.id));
  }
  const arrangement = spatialLayout(source.id, keptPieces.length);
  const spatialOrder = keptPieces.slice().sort((a, b) =>
    Number(getInstrument(source.set, a.instrument).percussion) - Number(getInstrument(source.set, b.instrument).percussion)
    || (a.instrument < b.instrument ? -1 : a.instrument > b.instrument ? 1 : 0)
    || register.get(b.id)! - register.get(a.id)!
    || idOrder(a, b));
  const junctionByPerformer = new Map(spatialOrder.map((piece, index) => [piece.id, arrangement.junctions[index]]));
  const familyCounters: Record<string, number> = {};
  const sourceFamilyNumber = new Map<string, number>();
  for (const piece of pieces) {
    const parsed = Number(piece.label.match(/(\d+)$/)?.[1]);
    const number = Number.isSafeInteger(parsed) && parsed > 0 ? parsed : (familyCounters[piece.instrument] ?? 0) + 1;
    familyCounters[piece.instrument] = Math.max(familyCounters[piece.instrument] ?? 0, number);
    sourceFamilyNumber.set(piece.id, number);
  }
  const composition = validateComposition({
    schemaVersion: 1, id: source.id, title: song.title, assetSetId: source.set, appearance: 'original',
    performers: keptPieces.map(piece => ({ id: piece.id, instrumentTypeId: piece.instrument, junctionId: junctionByPerformer.get(piece.id)!, familyNumber: sourceFamilyNumber.get(piece.id)! })),
    familyCounters, locationNames: {}, tempo: song.bpm, meter: [song.meter, 4], editSubdivision: song.stepsPerBeat,
    lengthBeats: song.steps / song.stepsPerBeat, loopRange: [0, song.steps / song.stepsPerBeat], loopEnabled: song.loop, masterVolume: song.volume,
    events: song.notes.map(note => ({
      id: note.id, performerId: performerMap[note.pieceId], pitch: note.midi,
      startBeat: note.step / song.stepsPerBeat, durationBeats: note.steps / song.stepsPerBeat, velocity: note.velocity,
    })),
  });
  const consolidated = pieces.length > MAX_PERFORMERS;
  const sourceRecord = source.set === 'mario'
    ? sourceAudit.mario.find(record => record.id === source.id)
    : sourceAudit.favorites.find(record => `bongo-${record.id}` === source.id);
  return {
    id: source.id, title: source.name, assetSetId: source.set, group: source.group, description: source.source ?? '', layoutName: arrangement.name, composition,
    provenance: {
      sourceLibrary: 'song-studio/library.json', sourceEntryId: source.id, sourceDescription: source.source ?? '', sourceLoop: song.loop,
      originalPerformerCount: pieces.length, retainedPerformerCount: keptPieces.length,
      sourceEventCount: song.notes.length, retainedEventCount: composition.events.length, consolidated,
      retainedPerformerIds: keptPieces.map(piece => piece.id), omittedPerformerIds: omittedPieces.map(piece => piece.id), performerMap,
      rationale: consolidated
        ? `Retain each type’s busiest original performer, then fill sixteen places by event count (source ID breaks ties). Omitted pitched performers map to the same type’s nearest median register; percussion maps to the least-loaded retained copy. All original events and their stable order remain, including simultaneous unisons. Newly authored layout: ${arrangement.name}; related families occupy distinct front-hemisphere junctions.`
        : `Retain every original performer, including repeated types, and every event assignment. Newly authored layout: ${arrangement.name}; only the distinct front-hemisphere junction positions change, with related sound families grouped together.`,
      ...(sourceRecord ? { sourceRecord } : {}),
    },
  };
}

export const LIBRARY: LibraryEntry[] = SOURCE_LIBRARY.map(convertSourceEntry);

/** Verify every current Favorites menu slot, including its deliberate duplicate. */
export function validateLibraryInventory(): void {
  const expected = [...simpleFavorites, ...chordFavorites, ...popFavorites, ...loopFavorites].map(entry => `bongo-${entry.id}`);
  const actual = LIBRARY.filter(entry => entry.assetSetId === 'bongo').map(entry => entry.id);
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw Error('Composer source library no longer matches the current Favorites menu. Refresh its retained music inputs explicitly.');
  const native = LIBRARY.filter(entry => entry.assetSetId === 'mario').map(entry => entry.id);
  if (!PUBLIC_SITE && JSON.stringify(native) !== JSON.stringify(['mario-demo-1', 'mario-demo-2', 'mario-demo-3'])) throw Error('Composer needs all three original Mario Paint demos.');
}
validateLibraryInventory();

export function loadLibrary(): LibraryEntry[] {
  return LIBRARY.map(entry => ({ ...structuredClone(entry), composition: validateComposition(entry.composition) }));
}
