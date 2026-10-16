import { validateComposition, type AssetSetId, type Composition, type ScoreEvent } from './model';

export interface CompositionSection { name: string; startBeat: number; endBeat: number }
export interface AuthoredComposition {
  id: string;
  title: string;
  description: string;
  basedOn: string;
  sections: CompositionSection[];
  composition: Composition;
}
type Tone = readonly [pitch: number | null, beats: number];
type Part = readonly [role: string, instrument: string];
type Chord = readonly [bass: number, ...upper: number[]];

// These are written scores, expanded deterministically, with no generator state.
// The older source excerpts and their provenance remain untouched in library.ts.
const JUNCTIONS = [41, 66, 67, 84, 80, 83, 50, 48, 46, 43, 73, 63, 61, 75, 77, 45];
class ScoreWriter {
  readonly events: ScoreEvent[] = [];
  readonly sections: CompositionSection[] = [];
  constructor(readonly id: string, readonly title: string, readonly set: AssetSetId,
    readonly tempo: number, readonly bars: number, readonly parts: readonly Part[]) {}

  section(name: string, firstBar: number, lastBar: number) {
    this.sections.push({ name, startBeat: firstBar * 4, endBeat: lastBar * 4 });
  }
  note(role: string, pitch: number, beat: number, duration: number, velocity: number) {
    const index = this.parts.findIndex(part => part[0] === role);
    if (index < 0) throw Error(`Missing score part: ${role}`);
    // Gentle, fixed phrasing; the rhythm section remains on the written grid.
    const rhythm = ['kick', 'snare', 'hat', 'low', 'high'].includes(role);
    const onset = Math.max(0, beat + (rhythm ? 0 : .008 * Math.sin(beat * 1.71 + index)));
    if (onset >= this.bars * 4 || duration <= 0) throw Error(`Note outside ${this.title}`);
    this.events.push({ id: `${this.id}_n${this.events.length}`, performerId: `${this.id}_${role}`,
      pitch, startBeat: +onset.toFixed(6), durationBeats: +Math.min(duration, this.bars * 4 - onset).toFixed(6),
      velocity: +Math.max(.035, Math.min(.9, velocity * (1 + .035 * Math.sin(beat * .93 + index)))).toFixed(5) });
  }
  chord(role: string, pitches: readonly number[], beat: number, duration: number, velocity: number, roll = 0) {
    pitches.forEach((pitch, index) => this.note(role, pitch, beat + roll * index, duration, velocity));
  }
  line(role: string, beat: number, tones: readonly Tone[], velocity: number, transpose = 0, articulation = .88) {
    const length = tones.reduce((sum, tone) => sum + tone[1], 0);
    let cursor = 0;
    for (const [pitch, beats] of tones) {
      if (pitch !== null) this.note(role, pitch + transpose, beat + cursor, beats * articulation,
        velocity * (.88 + .16 * Math.sin(Math.PI * cursor / length)));
      cursor += beats;
    }
    return cursor;
  }
  finish(description: string, basedOn: string, volume = .66): AuthoredComposition {
    const counters: Record<string, number> = {};
    const performers = this.parts.map(([role, instrument], index) => ({
      id: `${this.id}_${role}`, instrumentTypeId: instrument, junctionId: JUNCTIONS[index],
      familyNumber: counters[instrument] = (counters[instrument] ?? 0) + 1,
    }));
    return { id: this.id, title: this.title, description, basedOn, sections: this.sections,
      composition: validateComposition({ schemaVersion: 1, id: this.id, title: this.title, assetSetId: this.set,
        appearance: 'original', performers, familyCounters: counters,
        locationNames: Object.fromEntries(this.parts.map(([role], index) => [JUNCTIONS[index], role[0].toUpperCase() + role.slice(1)])),
        tempo: this.tempo, meter: [4, 4], editSubdivision: 4, lengthBeats: this.bars * 4,
        loopRange: [0, this.bars * 4], loopEnabled: false, masterVolume: volume,
        events: this.events.sort((a, b) => a.startBeat - b.startBeat) }) };
  }
}

const canonChords: readonly Chord[] = [
  [50, 62, 66, 69], [45, 61, 64, 69], [47, 62, 66, 71], [42, 57, 61, 66],
  [43, 59, 62, 67], [38, 57, 62, 66], [43, 59, 62, 67], [45, 61, 64, 69],
];
const canonTheme: readonly Tone[] = [[78, 2], [76, 2], [74, 2], [73, 2], [71, 2], [69, 2], [71, 2], [73, 2]];
const canonRunning = [78, 76, 78, 66, 64, 69, 68, 66, 67, 66, 64, 67, 66, 64, 62, 61,
  59, 57, 59, 61, 62, 64, 66, 67, 69, 66, 67, 69, 67, 66, 64, 61];
const canonWalking: readonly Tone[] = [[74, 1], [73, 1], [71, 1], [69, 1], [67, 1], [66, 1], [67, 1], [69, 1],
  [71, 1], [69, 1], [67, 1], [66, 1], [64, 1], [62, 1], [64, 1], [66, 1]];
const canonRising = [74, 78, 81, 78, 73, 76, 81, 76, 74, 78, 83, 78, 73, 78, 81, 78,
  71, 74, 79, 74, 69, 74, 78, 74, 71, 74, 79, 74, 73, 76, 81, 76];
function canonSubject(index: number): readonly Tone[] {
  switch (index % 4) {
    case 0: return canonTheme;
    case 1: return canonWalking;
    case 2: return canonRunning.map(pitch => [pitch, .5] as const);
    default: return canonRising.map(pitch => [pitch, .5] as const);
  }
}
function canon() {
  const w = new ScoreWriter('full-canon', 'Pachelbel’s Canon', 'bongo', 80, 88,
    [['bass', 'guitar'], ['first', 'piano'], ['second', 'kalimba'], ['third', 'marimba'],
      ['halo', 'glass'], ['harmony', 'piano'], ['low', 'bongo-low'], ['high', 'bongo-high']]);
  for (const [name, a, b] of [['Ground bass', 0, 8], ['Three voices', 8, 24], ['Flowing variation', 24, 40],
    ['Interwoven lines', 40, 56], ['Bright water', 56, 72], ['Homeward', 72, 80], ['Coda', 80, 88]] as const) w.section(name, a, b);
  for (let beat = 0; beat < 336; beat += 2) {
    const index = (beat / 2) % 8, chord = canonChords[index];
    const rise = beat < 32 ? .55 : beat < 96 ? .75 : beat < 224 ? .9 : beat < 288 ? 1 : .65;
    w.note('bass', chord[0], beat, 1.85, .4 * rise);
    if (beat >= 16) w.chord('harmony', chord.slice(1), beat + .025, 1.7, .17 * rise, .018);
    if (beat >= 48 && beat < 320 && index % 2 === 0) w.note('halo', chord[3] + 12, beat + .5, 1.3, .13 * rise);
    if (beat >= 96 && beat < 288) {
      w.note('low', 60, beat, .2, .11 * rise);
      if (index % 2) w.note('high', 60, beat + 1.5, .2, .08 * rise);
    }
  }
  for (let beat = 32; beat < 320; beat += 16) {
    // A sixteen-bar subject: later voices enter one ground-bass cycle apart,
    // following different phrases of the subject instead of doubling the lead.
    const phrase = beat >= 288 ? canonTheme : canonSubject((beat - 32) / 16);
    w.line('first', beat, phrase, beat >= 288 ? .43 : .57, 0, .94);
    if (beat >= 48 && beat < 288) w.line('second', beat, canonSubject((beat - 48) / 16), .34, -12, .86);
    if (beat >= 64 && beat < 288) w.line('third', beat, canonSubject((beat - 64) / 16), beat >= 224 ? .34 : .25, -12, .88);
  }
  w.line('first', 320, canonTheme, .35, 0, .96);
  // IV–V suspension, then an extended tonic with space for the last decay.
  for (const [beat, chord] of [[336, canonChords[4]], [340, canonChords[7]], [344, canonChords[0]]] as const) {
    w.note('bass', chord[0], beat, beat === 344 ? 7 : 3.8, .25);
    w.chord('harmony', chord.slice(1), beat + .04, beat === 344 ? 7 : 3.7, .17, .04);
  }
  w.line('first', 336, [[71, 2], [74, 2], [73, 2], [76, 2], [74, 8]], .34, 0, .97);
  w.note('halo', 86, 344.12, 6, .12);
  return w.finish('A ground bass grows into three answering voices, flowing variations and a quiet, suspended farewell.', 'Johann Pachelbel · Canon in D');
}

function prelude() {
  const w = new ScoreWriter('full-prelude', 'Final Fantasy — Prelude', 'bongo', 112, 96,
    [['harp', 'piano'], ['echo', 'guitar'], ['bass', 'marimba'], ['melody', 'kalimba'], ['stars', 'glass'], ['low', 'bongo-low']]);
  for (const [name, a, b] of [['First light', 0, 8], ['Crystal staircase', 8, 24], ['A melody appears', 24, 40],
    ['Through the minor sky', 40, 56], ['Open horizon', 56, 72], ['The ascent returns', 72, 88], ['Last constellation', 88, 96]] as const) w.section(name, a, b);
  const major = [0, 2, 4, 7], minor = [0, 2, 3, 7];
  const harmony = [[36, 0], [33, 1], [29, 0], [31, 0], [36, 0], [33, 1], [26, 1], [31, 0]];
  const dark = [[33, 1], [29, 0], [26, 1], [28, 0], [33, 1], [36, 0], [29, 0], [31, 0]];
  const melody: readonly Tone[] = [[76, 3], [74, 1], [72, 2], [71, 2], [69, 3], [72, 1], [76, 2], [74, 2],
    [72, 3], [69, 1], [65, 2], [67, 2], [69, 2], [71, 2], [74, 3], [null, 1]];
  for (let cycle = 0; cycle < 46; cycle++) {
    const beat = cycle * 8, [root, mode] = (beat >= 160 && beat < 224 ? dark : harmony)[cycle % 8];
    const tones = mode ? minor : major;
    const climb = Array.from({ length: 16 }, (_, i) => root + 12 + tones[i % 4] + 12 * Math.floor(i / 4));
    const arc = [...climb, ...climb.slice(0, -1).reverse(), root + 12];
    const level = beat < 32 ? .27 + beat / 320 : beat < 160 ? .48 : beat < 224 ? .34 : beat < 352 ? .56 : .24;
    arc.forEach((pitch, index) => {
      w.note(cycle % 4 === 3 && beat >= 96 ? 'echo' : 'harp', pitch, beat + index * .25, .35, level * (.72 + .28 * Math.sin(Math.PI * index / 32)));
    });
    w.note('bass', root + 12, beat, 3.8, .24);
    w.note('bass', root + 19, beat + 4, 3.6, .19);
    if (beat >= 32) w.chord('echo', [root + 36, root + 36 + tones[2], root + 43], beat + .05, 3.5, .14, .03);
    if (beat >= 64 && cycle % 2 === 0) w.note('stars', root + 60, beat + 2, 3, .13);
    if (beat >= 224 && beat < 288) for (const offset of [0, 3, 4, 6.5]) w.note('low', 60, beat + offset, .2, .09);
  }
  for (let beat = 96; beat < 352; beat += 32) {
    const transpose = beat >= 160 && beat < 224 ? -3 : beat >= 288 ? 12 : 0;
    w.line('melody', beat, melody, beat >= 224 ? .46 : .35, transpose, .92);
  }
  w.line('harp', 368, [[72, 1], [67, 1], [64, 1], [62, 1], [60, 2], [55, 2], [52, 2], [48, 2], [60, 4]], .27, 0, .98);
  w.chord('echo', [48, 55, 64], 380, 3.8, .18, .05);
  w.note('stars', 84, 380.15, 3.5, .1);
  return w.finish('Four-octave arpeggios open into a lyrical theme, a minor-key journey and a luminous final ascent.', 'Nobuo Uematsu · Final Fantasy Prelude');
}

const takeCell: readonly Tone[] = [[66, .5], [66, .5], [62, .5], [59, .5], [59, .5], [64, .5], [64, .5],
  [64, .5], [68, .25], [68, .25], [69, .25], [71, .25], [69, .25], [69, .25], [69, .5], [64, 1], [62, 1]];
const takeRiff: readonly Tone[] = [...takeCell, ...takeCell];
const takeVerse: readonly Tone[] = [[62, .5], [64, .5], [66, 1], [64, .5], [62, .5], [61, 1], [59, 1], [61, .5], [62, .5],
  [64, 1], [null, 1], [64, .5], [66, .5], [68, 1], [66, .5], [64, .5], [62, 1], [61, 1], [59, 1], [61, 1], [null, 1]];
const takeChorus: readonly Tone[] = [[69, 2], [73, 2], [78, 3], [76, 1], [74, 2], [73, 2], [71, 2], [69, 2],
  [68, 2], [71, 2], [76, 3], [74, 1], [73, 2], [71, 1], [69, 1], [68, 2], [66, 2]];
const takeHarmony: readonly Chord[] = [[47, 62, 66, 69], [52, 59, 64, 68], [45, 61, 64, 69], [50, 62, 66, 69]];

/** Two complete pop forms share only their written rhythm-section voicings. */
function popBacking(w: ScoreWriter, bar: number, chord: Chord, energy: number, disco = false) {
  const beat = bar * 4;
  const bass = disco ? [chord[0], chord[0] + 12, chord[0] + 7, chord[0] + 12] : [chord[0], chord[0], chord[0] + 7, chord[0] + 12];
  for (let i = 0; i < 8; i++) {
    if (i % 2 === 0 || energy > .75) w.note('bass', bass[Math.floor(i / 2)], beat + i / 2, .42, energy * (i % 2 ? .27 : .4));
    if (energy > .45) w.note('hat', disco ? 76 : 72, beat + i / 2, .1, energy * (i % 2 ? .17 : .1));
  }
  const kick = disco ? [0, 1, 2, 3] : [0, 2, ...(bar % 4 === 3 ? [2.75] : [])];
  if (energy > .35) for (const offset of kick) w.note('kick', 60, beat + offset, .15, .42 * energy);
  if (energy > .45) for (const offset of [1, 3]) w.note('snare', 74, beat + offset, .15, .32 * energy);
  const stabs = energy > .75 ? [.5, 1.5, 2.5, 3.5] : [.5, 2.5];
  for (const offset of stabs) w.chord('chord', chord.slice(1), beat + offset, .4, .17 * energy);
  if (bar % 4 === 3 && energy > .65) {
    w.line('shine', beat + 3, [[chord[1] + 12, .25], [chord[2] + 12, .25], [chord[3] + 12, .5]], .19 * energy);
    if (bar % 8 === 7) w.note('call', 72, beat + 3.5, .25, .16 * energy);
  }
}
function takeOnMe() {
  const w = new ScoreWriter('full-take-on-me', 'Take On Me', 'mario', 166, 128,
    [['lead', 'game-boy'], ['voice', 'mario'], ['bass', 'swan'], ['chord', 'heart'], ['brass', 'flower'],
      ['shine', 'star'], ['kick', 'mushroom'], ['snare', 'boat'], ['hat', 'pig'], ['call', 'yoshi']]);
  for (const [name, a, b] of [['Switch on', 0, 8], ['Verse I', 8, 24], ['Lift', 24, 32], ['Chorus I', 32, 48],
    ['Riff break', 48, 56], ['Verse II', 56, 72], ['Lift II', 72, 80], ['Chorus II', 80, 96],
    ['Half-time dream', 96, 112], ['Final chorus', 112, 124], ['Sign-off', 124, 128]] as const) w.section(name, a, b);
  for (let bar = 0; bar < 124; bar++) {
    const bridge = bar >= 96 && bar < 112, chorus = bar >= 32 && bar < 48 || bar >= 80 && bar < 96 || bar >= 112;
    const chord = takeHarmony[bridge ? Math.floor(bar / 2) % 4 : bar % 4];
    const energy = bar < 4 ? .3 : bar < 8 ? .55 : bridge ? .38 : chorus ? 1 : .72;
    popBacking(w, bar, chord, energy);
    if (chorus && bar % 2 === 0) w.chord('brass', chord.slice(1), bar * 4, .5, .19);
    if (bridge) w.line('shine', bar * 4, [[chord[1] + 12, 1.5], [chord[2] + 12, .5], [chord[3] + 12, 2]], .22);
  }
  for (const bar of [0, 4, 48, 52]) w.line('lead', bar * 4, takeRiff, bar ? .58 : .4);
  for (const start of [8, 56]) for (let i = 0; i < 4; i++) {
    w.line('voice', (start + i * 4) * 4, takeVerse, .48 + i * .025, i === 3 ? 12 : 0);
    if (start === 56 && i % 2) w.line('lead', (start + i * 4) * 4, takeRiff.slice(0, 16), .23, 12);
  }
  for (const bar of [24, 72]) {
    w.line('voice', bar * 4, [[66, 2], [68, 2], [69, 2], [71, 2], [73, 2], [74, 2], [76, 3], [null, 1]], .57);
    w.line('lead', (bar + 4) * 4, takeRiff, .53, 12);
  }
  for (const bar of [32, 40, 80, 88, 112]) {
    w.line('voice', bar * 4, takeChorus, .66);
    w.line('lead', bar * 4, takeRiff, .28, 12);
    w.line('lead', (bar + 4) * 4, takeRiff, .31);
  }
  w.line('voice', 120 * 4, takeChorus.slice(0, 8), .7);
  for (const bar of [96, 104]) w.line('voice', bar * 4, [[66, 4], [64, 2], [62, 2], [61, 4], [59, 4], [62, 4], [64, 2], [66, 2], [68, 4], [null, 4]], .36);
  w.line('lead', 496, [[66, .5], [66, .5], [62, .5], [59, 1.5], [64, 1], [68, 1], [69, 1], [71, 1], [73, 1], [69, 2], [66, 2], [69, 4]], .48);
  w.chord('chord', [57, 61, 64, 69], 508, 3.5, .28);
  w.note('bass', 45, 508, 3, .38);
  return w.finish('An arcade pop overture: two verses, soaring choruses, a half-time dream and a decisive final riff.', 'a-ha · Take On Me · new instrumental arrangement', .7);
}

const avrilA: readonly Tone[] = [[72, 1], [65, 1], [68, 1.5], [68, .25], [65, 1.75], [65, .5], [72, .5], [70, .5], [68, .5], [65, .5],
  [68, 1], [65, 1], [63, 1.5], [65, .5], [68, 1], [70, .5], [68, .5], [65, 2]];
const avrilB: readonly Tone[] = [[73, 1], [72, 1], [70, 1], [68, 1], [75, 2], [73, 1], [72, 1],
  [70, 1.5], [68, .5], [65, 1], [63, 1], [65, 1], [68, 1], [72, 1.5], [null, .5]];
const avrilChords: readonly Chord[] = [[44, 53, 56, 60], [48, 51, 56, 63], [49, 53, 56, 61], [46, 49, 53, 60]];
function avril() {
  const w = new ScoreWriter('full-avril-14th', 'Avril 14th', 'bongo', 76, 56,
    [['melody', 'piano'], ['left', 'piano'], ['warmth', 'guitar'], ['dust', 'glass'], ['answer', 'kalimba'], ['bass', 'marimba']]);
  for (const [name, a, b] of [['An empty room', 0, 4], ['First memory', 4, 12], ['A different answer', 12, 20],
    ['The room opens', 20, 32], ['Return in sunlight', 32, 44], ['Music box', 44, 52], ['Last page', 52, 56]] as const) w.section(name, a, b);
  for (let beat = 0; beat < 208; beat += 2) {
    const chord = avrilChords[(beat / 2) % 4], middle = beat >= 80 && beat < 128;
    const level = beat < 16 ? .65 : beat >= 176 ? .55 : middle ? 1 : .8;
    w.note('left', chord[0], beat + .015, 1.75, .24 * level);
    [chord[1], chord[2], chord[3]].forEach((pitch, index) => w.note('left', pitch, beat + .5 + index * .5, .55, (.17 + index * .018) * level));
    if (beat >= 48 && beat < 176 && beat % 4 === 0) w.note('warmth', chord[2], beat + .04, 3.6, .1 * level);
    if (middle && beat % 8 === 0) w.note('bass', chord[0] - 12, beat, 3.8, .15);
    if (beat >= 128 && beat % 16 === 0) w.note('dust', chord[3] + 24, beat + 1.5, 2.4, .055);
  }
  for (let bar = 4; bar < 52; bar += 4) {
    const middle = bar >= 20 && bar < 32, musicBox = bar >= 44;
    const phrase = middle || bar % 8 === 4 && bar >= 12 ? avrilB : avrilA;
    w.line(musicBox ? 'answer' : 'melody', bar * 4, phrase, middle ? .55 : musicBox ? .3 : .43, musicBox ? 12 : 0, .94);
    if (bar >= 32 && bar < 44) w.line('answer', bar * 4, [[65, 3], [63, 1], [61, 4], [60, 3], [61, 1], [65, 2], [null, 2]], .16);
  }
  w.line('melody', 208, [[72, 1.5], [65, 1.5], [68, 2], [65, 2], [63, 2], [65, 3], [68, 4]], .29, 0, .97);
  w.note('left', 44, 208, 3, .18);
  w.chord('left', [49, 53, 56], 213.05, 4, .13, .035);
  w.chord('warmth', [44, 56, 60, 65], 220, 3.8, .1, .05);
  return w.finish('An intimate piano miniature that gradually admits guitar, music-box answers and barely audible glass.', 'Aphex Twin · Avril 14th · new chamber arrangement', .74);
}

const queenHook: readonly Tone[] = [[64, .75], [66, .75], [68, .5], [68, .75], [69, .25], [69, 3], [null, 2],
  [68, .75], [69, .25], [69, 2], [null, 1], [71, .75], [69, .25], [68, 1], [69, 1], [69, 1]];
const queenAnswer: readonly Tone[] = [[73, 1], [71, .5], [69, .5], [68, 1], [66, 1], [68, 1.5], [69, .5], [71, 2],
  [73, 1], [74, 1], [73, 1], [71, 1], [69, 3], [null, 1]];
const queenVerse: readonly Tone[] = [[61, 1], [64, .5], [66, .5], [68, 1], [66, 1], [64, 1.5], [61, .5], [59, 2],
  [61, .75], [64, .75], [66, .5], [68, 1], [69, 1], [68, 1], [66, 1], [64, 1], [null, 1]];
const queenHarmony: readonly Chord[] = [[45, 57, 61, 64], [50, 57, 62, 66], [47, 59, 62, 66], [52, 56, 59, 64],
  [49, 56, 61, 64], [54, 57, 61, 66], [50, 57, 62, 66], [52, 56, 59, 64]];
function dancingQueen() {
  const w = new ScoreWriter('full-dancing-queen', 'Dancing Queen', 'mario', 100, 104,
    [['voice', 'mario'], ['chord', 'heart'], ['bass', 'swan'], ['strings', 'airplane'], ['brass', 'flower'],
      ['shine', 'star'], ['kick', 'mushroom'], ['snare', 'boat'], ['hat', 'pig'], ['call', 'cat'], ['piano', 'game-boy']]);
  for (const [name, a, b] of [['Mirror ball', 0, 8], ['Chorus I', 8, 24], ['Verse', 24, 40], ['Rising lights', 40, 48],
    ['Chorus II', 48, 64], ['Picture parade', 64, 72], ['Under the lights', 72, 80], ['Final chorus', 80, 96], ['Last dance', 96, 104]] as const) w.section(name, a, b);
  for (let bar = 0; bar < 100; bar++) {
    const bridge = bar >= 72 && bar < 80, chorus = bar >= 8 && bar < 24 || bar >= 48 && bar < 64 || bar >= 80 && bar < 96;
    const chord = queenHarmony[bar % 8], level = bar < 4 ? .38 : bridge ? .45 : chorus ? .95 : .74;
    popBacking(w, bar, chord, level, true);
    if (chorus || bar < 8) {
      for (const offset of [0, 2]) w.chord('strings', [chord[1] + 12, chord[2] + 12], bar * 4 + offset, 1.7, .14 * level);
      if (bar % 4 === 2) w.line('brass', bar * 4 + 2, [[chord[2] + 12, .5], [chord[1] + 12, .5], [chord[3] + 12, 1]], .23);
    }
    if (bar % 2 === 0 && !bridge && !(bar >= 4 && bar < 8) && !(bar >= 68 && bar < 72))
      w.line('piano', bar * 4, [[chord[3], .5], [chord[2], .5], [chord[1], .5], [null, .5], [chord[2], .5], [chord[3], .5], [chord[2] + 12, 1]], .21);
  }
  w.line('shine', 0, queenAnswer, .3, 12);
  w.line('piano', 16, queenHook, .4);
  for (const start of [8, 48, 80]) for (let phrase = 0; phrase < 4; phrase++) {
    const beat = (start + phrase * 4) * 4;
    w.line('voice', beat, phrase % 2 ? queenAnswer : queenHook, start === 80 ? .65 : .58);
    if (start === 80 && phrase % 2) w.line('shine', beat, queenHook, .2, 12);
  }
  for (let bar = 24; bar < 40; bar += 4) w.line('voice', bar * 4, queenVerse, .46, bar >= 32 ? 12 : 0);
  for (const bar of [40, 44]) w.line('voice', bar * 4, [[66, 1], [68, 1], [69, 2], [71, 1], [73, 1], [74, 2], [73, 1], [71, 1], [69, 2], [68, 2], [null, 2]], .56);
  w.line('brass', 256, queenAnswer, .46);
  w.line('piano', 272, queenAnswer, .48, 12);
  w.line('voice', 288, [[69, 4], [68, 2], [66, 2], [64, 4], [61, 4], [66, 2], [68, 2], [69, 4], [71, 4], [null, 4]], .36);
  w.line('voice', 384, queenHook, .42);
  w.line('shine', 400, [[73, 1], [71, 1], [69, 2], [68, 2], [69, 2], [73, 4], [69, 4]], .27);
  w.chord('chord', [57, 61, 64, 69], 412, 3.7, .23);
  w.note('bass', 45, 412, 3, .3);
  return w.finish('A glittering picture-band disco arrangement with octave bass, string answers, a parade break and a final dance.', 'ABBA · Dancing Queen · new instrumental arrangement', .7);
}

const nightTheme: readonly Tone[] = [[67, 1.5], [62, .5], [67, 1.5], [62, .5], [67, 1], [71, 1], [74, 2],
  [72, 1.5], [69, .5], [72, 1.5], [69, .5], [72, 1], [76, 1], [78, 2]];
const nightAnswer: readonly Tone[] = [[74, 1], [72, .5], [71, .5], [72, 1], [69, 1], [67, 1], [66, 1], [67, 2],
  [69, .5], [71, .5], [72, 1], [71, .5], [69, .5], [67, 1], [66, 1], [64, 1], [62, 2]];
const nightSecond: readonly Tone[] = [[69, 1], [66, .5], [67, .5], [69, 1], [74, 1], [73, 1], [71, 1], [69, 2],
  [71, 1], [67, .5], [69, .5], [71, 1], [76, 1], [74, 1], [73, 1], [74, 2]];
function nightMusic() {
  const w = new ScoreWriter('full-night-music', 'Eine kleine Nachtmusik', 'bongo', 132, 128,
    [['first', 'marimba'], ['second', 'kalimba'], ['bass', 'guitar'], ['harmony', 'piano'], ['spark', 'glass'], ['low', 'bongo-low'], ['high', 'bongo-high']]);
  for (const [name, a, b] of [['Curtain up', 0, 8], ['First subject', 8, 24], ['Second subject', 24, 40], ['Closing dance', 40, 48],
    ['Development', 48, 72], ['On tiptoe', 72, 80], ['Home again', 80, 96], ['Second subject at home', 96, 112], ['Final bows', 112, 128]] as const) w.section(name, a, b);
  const home: readonly Chord[] = [[43, 55, 59, 62], [50, 54, 57, 62], [48, 55, 60, 64], [50, 54, 57, 62]];
  const dominant: readonly Chord[] = [[50, 57, 62, 66], [45, 57, 61, 64], [47, 54, 59, 62], [45, 55, 61, 64]];
  const development: readonly Chord[] = [[52, 55, 59, 64], [47, 54, 59, 63], [48, 55, 60, 64], [45, 57, 60, 64],
    [50, 57, 60, 66], [43, 55, 58, 62], [48, 55, 60, 63], [50, 54, 57, 60]];
  for (let bar = 0; bar < 124; bar++) {
    const dev = bar >= 48 && bar < 72, soft = bar >= 24 && bar < 40 || bar >= 72 && bar < 80 || bar >= 96 && bar < 112;
    const chord = dev ? development[bar % 8] : bar >= 24 && bar < 48 ? dominant[bar % 4] : home[bar % 4];
    const level = soft ? .62 : .95, beat = bar * 4;
    for (const offset of [0, 2]) w.note('bass', chord[0], beat + offset, .7, .34 * level);
    for (const offset of [.5, 1.5, 2.5, 3.5]) w.chord('harmony', chord.slice(1), beat + offset, .36, .16 * level);
    if (!soft && bar >= 8) {
      w.note('low', 60, beat, .15, .095);
      if (bar % 4 === 3) w.line('high', beat + 3, [[60, .25], [60, .25], [60, .5]], .09);
    }
    if (bar % 4 === 3 && !dev) w.note('spark', chord[3] + 24, beat + 3, .7, .12);
    if (dev) {
      const pattern = [chord[1], chord[2], chord[3], chord[2], chord[1] + 12, chord[3], chord[2], chord[1]];
      w.line(bar % 2 ? 'second' : 'first', beat, pattern.map(pitch => [pitch + 12, .5] as const), .46, 0, .64);
      w.line(bar % 2 ? 'first' : 'second', beat + 1, [[chord[3], 1], [chord[2], 1], [chord[1], 1]], .23);
    }
  }
  for (const bar of [0, 8, 16, 80, 88, 112]) {
    w.line('first', bar * 4, nightTheme, .59, 0, .73);
    w.line('second', (bar + 4) * 4, nightAnswer, .48, 0, .8);
  }
  for (const bar of [24, 32, 96, 104]) {
    const transpose = bar >= 96 ? -7 : 0;
    w.line('second', bar * 4, nightSecond, .41, transpose, .92);
    w.line('first', (bar + 4) * 4, nightAnswer, .42, transpose, .9);
  }
  for (const bar of [40, 44]) w.line('first', bar * 4, nightAnswer, .53, 7, .65);
  for (const bar of [72, 76]) w.line('second', bar * 4, [[62, 1], [66, 1], [69, 1], [72, 1], [74, 2], [null, 2], [69, .5], [71, .5], [72, .5], [73, .5], [74, 2], [null, 4]], .27 + (bar - 72) * .035);
  w.line('first', 480, nightTheme, .63, 0, .65);
  w.line('second', 496, [[74, .5], [72, .5], [71, .5], [69, .5], [67, 1], [62, 1], [67, 2], [null, 2]], .48);
  for (const beat of [504, 506, 508]) {
    w.chord('harmony', [55, 59, 62, 67], beat, beat === 508 ? 3.7 : .6, .28);
    w.note('bass', 43, beat, beat === 508 ? 3.7 : .6, .38);
    w.note('first', 79, beat, beat === 508 ? 3 : .6, .5);
  }
  return w.finish('A toy-chamber sonata: bold calls, a lyrical second subject, restless development, a home-key reprise and final bows.', 'W. A. Mozart · K. 525 · new sonata-form arrangement');
}

const swanTheme: readonly Tone[] = [[76, 2], [69, 1], [71, 1], [72, 1], [74, 1], [76, 2],
  [72, 1], [76, 1], [72, 1], [76, 1], [81, 2], [77, 1], [74, 1]];
const swanAnswer: readonly Tone[] = [[76, 2], [72, 1], [69, 1], [71, 1], [72, 1], [74, 2],
  [71, 1], [74, 1], [71, 1], [68, 1], [69, 3], [null, 1]];
const swanDance: readonly Tone[] = [[72, .5], [76, .5], [79, 1], [77, .5], [76, .5], [74, 1], [72, .5], [71, .5], [69, 1], [72, 2],
  [74, .5], [77, .5], [81, 1], [79, .5], [77, .5], [76, 1], [74, 1], [72, 1], [71, 2]];
function swanLake() {
  const w = new ScoreWriter('full-swan-lake', 'Swan Lake', 'bongo', 72, 72,
    [['swan', 'glass'], ['answer', 'piano'], ['bass', 'guitar'], ['water', 'kalimba'], ['tremolo', 'marimba'],
      ['moon', 'glass'], ['low', 'bongo-low'], ['high', 'bongo-high']]);
  for (const [name, a, b] of [['Moon on the lake', 0, 8], ['The swan', 8, 24], ['Reflections dance', 24, 40],
    ['The storm', 40, 52], ['The swan returns', 52, 64], ['Still water', 64, 72]] as const) w.section(name, a, b);
  const harmony: readonly Chord[] = [[45, 57, 60, 64], [45, 57, 60, 64], [43, 55, 59, 64], [45, 57, 60, 64],
    [50, 57, 62, 65], [50, 57, 62, 65], [52, 56, 59, 64], [45, 57, 60, 64]];
  const storm: readonly Chord[] = [[41, 53, 57, 60], [42, 54, 57, 60], [43, 55, 58, 61], [44, 56, 59, 62],
    [45, 57, 60, 64], [50, 57, 62, 65], [52, 56, 59, 62], [52, 56, 59, 64]];
  for (let bar = 0; bar < 68; bar++) {
    const turbulent = bar >= 40 && bar < 52, dancing = bar >= 24 && bar < 40;
    const chord = (turbulent ? storm : harmony)[bar % 8], beat = bar * 4;
    const level = bar < 8 ? .45 + bar * .035 : turbulent ? 1 : bar >= 64 ? .4 : .7;
    w.note('bass', chord[0], beat, 3.8, .38 * level);
    const ripple = [chord[1], chord[2], chord[3], chord[2], chord[1], chord[2], chord[3], chord[2]];
    w.line('water', beat, ripple.map(pitch => [pitch, .5] as const), .22 * level);
    if (bar >= 4) w.chord('answer', chord.slice(1), beat + .06, 3.6, .18 * level, .025);
    if (bar % 4 === 0) w.note('moon', chord[3] + 24, beat + 1, 2.8, .12 * level);
    if (turbulent) {
      for (let i = 0; i < 16; i++) w.note('tremolo', chord[1 + i % 3], beat + i / 4, .22, .19 + .05 * Math.sin(i / 16 * Math.PI));
      w.line('high', beat, [[60, .75], [60, .75], [60, .5], [60, 1], [60, 1]], .14);
    }
    if (turbulent || dancing) w.line('low', beat, [[60, 2], [60, 2]], turbulent ? .19 : .08);
  }
  for (const bar of [8, 16, 52, 60]) {
    w.line('swan', bar * 4, swanTheme, bar >= 52 ? .55 : .44, 0, .99);
    w.line('answer', (bar + 4) * 4, swanAnswer, .43, -12, .97);
  }
  for (let bar = 24; bar < 40; bar += 4) w.line(bar % 8 ? 'answer' : 'swan', bar * 4, swanDance, .45, bar % 8 ? -12 : 0);
  for (const bar of [40, 44, 48]) w.line('swan', bar * 4, [[77, 1], [76, 1], [74, 1], [72, 1], [71, 1], [72, 1], [74, 2], [76, 1], [77, 1], [80, 2], [81, 3], [null, 1]], .62);
  w.line('swan', 272, [[76, 2], [72, 2], [71, 2], [68, 2], [69, 8]], .31, 0, .98);
  w.note('bass', 45, 272, 7.8, .23);
  w.chord('answer', [56, 59, 64], 276, 3.8, .15, .04);
  w.chord('answer', [57, 60, 64, 69], 280, 7.8, .18, .05);
  w.note('moon', 81, 280.15, 7, .08);
  return w.finish('A glass-voiced nocturne unfolds into a dancing reflection, a chromatic storm and a fragile return to still water.', 'P. I. Tchaikovsky · Swan Lake theme · new concert arrangement');
}

export const AUTHORED_COMPOSITIONS: readonly AuthoredComposition[] = [canon(), prelude(), takeOnMe(), avril(), dancingQueen(), nightMusic(), swanLake()];
