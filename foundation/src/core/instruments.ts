import type { Scene } from './contracts';

export const INSTRUMENTS = [
  { id: 'guitar', name: 'Guitar', color: '#ffb883', kind: 'melodic', samples: ['audio/harmony-bloom/guitar.wav'] },
  { id: 'glass', name: 'Glass', color: '#a1dff9', kind: 'melodic', samples: ['audio/harmony-bloom/glass.wav'] },
  { id: 'kalimba', name: 'Kalimba', color: '#b5dfaa', kind: 'melodic', samples: ['audio/harmony-bloom/kalimba.wav'] },
  { id: 'piano', name: 'Piano', color: '#c6b4f6', kind: 'melodic', samples: ['audio/harmony-bloom/piano.wav'] },
  { id: 'marimba', name: 'Marimba', color: '#f7aab9', kind: 'melodic', samples: ['audio/harmony-bloom/marimba.wav'] },
  { id: 'bongo-high', name: 'High bongo', color: '#ffb883', kind: 'percussion', duration: 0.617, samples: ['audio/percussion/bongo-high-A.wav', 'audio/percussion/bongo-high-B.wav'] },
  { id: 'bongo-low', name: 'Low bongo', color: '#ff9685', kind: 'percussion', duration: 0.626, samples: ['audio/percussion/bongo-low-A.wav', 'audio/percussion/bongo-low-B.wav'] },
  { id: 'kick', name: 'Kick', color: '#ff9685', kind: 'percussion', duration: 1.75, samples: ['audio/percussion/kick-A.wav', 'audio/percussion/kick-B.wav'] },
  { id: 'snare', name: 'Snare', color: '#ff9685', kind: 'percussion', duration: 0.526, samples: ['audio/percussion/snare-A.wav', 'audio/percussion/snare-B.wav'] },
  { id: 'hi-hat', name: 'Hi-hat', color: '#ffd35b', kind: 'percussion', duration: 0.837, samples: ['audio/percussion/hat-closed-A.wav', 'audio/percussion/hat-closed-B.wav'] },
] as const;
export type Instrument = typeof INSTRUMENTS[number]['id'];
export const INSTRUMENT_IDS = INSTRUMENTS.map(i => i.id);
export const MELODIC_INSTRUMENTS = INSTRUMENTS.filter(i => i.kind === 'melodic');
export const PERCUSSION_INSTRUMENTS = INSTRUMENTS.filter(i => i.kind === 'percussion');
export const INSTRUMENT_ROOT_HZ = 261.6255653005986;
const percussionIds = new Set<Instrument>(PERCUSSION_INSTRUMENTS.map(i => i.id));
// Longest prepared take, rounded up to a millisecond: ownership must retain its tail.
const percussionDurations = new Map<Instrument, number>(PERCUSSION_INSTRUMENTS.map(i => [i.id, i.duration]));
export const percussionDuration = (id?: Instrument) => id === undefined ? undefined : percussionDurations.get(id);
export const isPercussion = (id?: Instrument) => id !== undefined && percussionIds.has(id);
export const instrumentName = (id: Instrument) => INSTRUMENTS.find(i => i.id === id)!.name;

/** Start a newly placed melodic layer on successive thirds above the root. */
export function stackPitch(scene: Scene, vertex: number): {degree: number; octave: number} {
  const notes = scene.pieces.filter(p => p.vertex === vertex && p.kind === 'note' && !isPercussion(p.instrument));
  const root = notes[0];
  if (root?.kind !== 'note') return {degree: 0, octave: 4};
  const degrees = scene.settings.scale === 'pentatonic' ? 5 : 7;
  const degree = root.degree + notes.length * 2;
  return {degree: degree % degrees, octave: Math.min(6, root.octave + Math.floor(degree / degrees))};
}

/** Upgrade old compositions at the app boundary, retaining positions and timing. */
export function instrumentScene(scene: Scene): Scene {
  return { ...scene, pieces: scene.pieces.map(p => {
    if (p.kind === 'generator') return { ...p, travel: p.travel ?? scene.settings.travel };
    if (p.kind === 'note') return p.instrument ? p : { ...p, instrument: 'piano' };
    return { id: p.id, vertex: p.vertex, label: p.label, kind: 'note', instrument: 'marimba',
      degree: p.sound === 'kick' ? 0 : p.sound === 'snare' ? 2 : 4,
      octave: 4, timbre: 'sine', duration: Math.max(0.05, p.decay), level: p.level };
  }) };
}
