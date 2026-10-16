import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AUTHORED_COMPOSITIONS } from '../src/compositions';
import { LIBRARY, compositionDuration } from '../src/library';
import { prepareScore, preflightScore, NATIVE_MIDI, type ScoreSamples } from '../src/audio-score';
import { validateComposition } from '../src/model';
import { INSTRUMENTS } from '../foundation/src/core/instruments';
import manifest from '../asset-packs/mario-paint/manifest.json';

// Preflight depends on the real WAV lengths, including alternating drum takes
// and the native pitches' baked envelopes. No invented tail durations.
function sampleLifetime(path: string) {
  const bytes = readFileSync(new URL(`../${path}`, import.meta.url));
  let sampleRate = 0, blockAlign = 0, dataBytes = 0;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = bytes.toString('ascii', offset, offset + 4), size = bytes.readUInt32LE(offset + 4);
    if (type === 'fmt ') { sampleRate = bytes.readUInt32LE(offset + 12); blockAlign = bytes.readUInt16LE(offset + 20); }
    if (type === 'data') dataBytes = size;
    offset += 8 + size + size % 2;
  }
  if (!sampleRate || !blockAlign || !dataBytes) throw Error(`Invalid WAV: ${path}`);
  return { sampleRate, channels: [new Float32Array(dataBytes / blockAlign)] };
}
const bank: ScoreSamples = {};
for (const instrument of INSTRUMENTS) {
  const takes = instrument.samples.map(path => sampleLifetime(`public/${path}`));
  bank[instrument.id] = { ...takes[0], alternates: takes.slice(1) };
}
for (const instrument of manifest.instruments) instrument.notes.forEach((note, index) => {
  bank[`${instrument.id}:${NATIVE_MIDI[index]}`] = sampleLifetime(`asset-packs/mario-paint/${note.wav}`);
});

describe('Seven new finite concert arrangements', () => {
  it('presents seven full scores first and keeps the native songs in their own collection', () => {
    expect(LIBRARY.slice(0, 7).map(entry => entry.title)).toEqual([
      'Pachelbel’s Canon', 'Final Fantasy — Prelude', 'Take On Me', 'Avril 14th', 'Dancing Queen', 'Eine kleine Nachtmusik', 'Swan Lake',
    ]);
    expect(LIBRARY.slice(0, 7).every(entry => entry.kind === 'full')).toBe(true);
    expect(LIBRARY.filter(entry => entry.group === 'Original Mario Paint songs').map(entry => entry.id))
      .toEqual(['mario-demo-1', 'mario-demo-2', 'mario-demo-3']);
    expect(compositionDuration(AUTHORED_COMPOSITIONS[0].composition)).toBe('4:24');
    expect(AUTHORED_COMPOSITIONS.find(entry => entry.id === 'full-canon')!.composition.assetSetId).toBe('bongo');
    expect(AUTHORED_COMPOSITIONS.filter(entry => entry.composition.assetSetId === 'mario')).toHaveLength(2);
  });

  it.each(AUTHORED_COMPOSITIONS)('$title is a developed score with sounding music throughout and a finite ending', entry => {
    const score = validateComposition(entry.composition);
    const seconds = score.lengthBeats * 60 / score.tempo;
    expect(seconds).toBeGreaterThan(170);
    expect(seconds).toBeLessThan(300);
    expect(score.loopEnabled).toBe(false);
    expect(entry.sections.length).toBeGreaterThanOrEqual(6);
    expect(entry.sections[0].startBeat).toBe(0);
    expect(entry.sections.at(-1)!.endBeat).toBe(score.lengthBeats);
    for (const [index, section] of entry.sections.entries()) {
      expect(section.endBeat).toBeGreaterThan(section.startBeat);
      if (index) expect(section.startBeat).toBe(entry.sections[index - 1].endBeat);
      expect(score.events.some(event => event.startBeat >= section.startBeat && event.startBeat < section.endBeat)).toBe(true);
    }
    for (const performer of score.performers) expect(score.events.some(event => event.performerId === performer.id)).toBe(true);
    expect(score.performers.length).toBeLessThanOrEqual(16);
    const attacks = score.events.map(event => event.startBeat);
    for (let index = 1; index < attacks.length; index++) expect(attacks[index] - attacks[index - 1]).toBeLessThanOrEqual(12);
    expect(Math.max(...score.events.map(event => event.startBeat + event.durationBeats))).toBeGreaterThan(score.lengthBeats - 1);
    expect(score.events.every(event => event.startBeat + event.durationBeats <= score.lengthBeats + .000001)).toBe(true);
    // Ignore levels and microtiming: actual pitches/rhythms must develop beyond a copied loop.
    const passages = new Set<string>();
    for (let beat = 0; beat < score.lengthBeats - 16; beat += 16) {
      passages.add(JSON.stringify(score.events.filter(event => event.startBeat >= beat && event.startBeat < beat + 16)
        .map(event => [event.performerId, event.pitch, Math.round((event.startBeat - beat) * 4) / 4])));
    }
    expect(passages.size).toBeGreaterThanOrEqual(7);
    const attacksByPitch = score.events.map(event => `${event.performerId}:${event.pitch}:${event.startBeat}`);
    expect(new Set(attacksByPitch).size).toBe(attacksByPitch.length);
    const budget = preflightScore(prepareScore(score, bank), bank, 48_000, false);
    expect(budget.peakVoices).toBeLessThanOrEqual(64);
    expect(budget.checkedAttacks).toBe(score.events.length);
  });
});
