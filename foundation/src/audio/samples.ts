import { INSTRUMENTS, INSTRUMENT_ROOT_HZ, type Instrument } from '../core/instruments';

export interface InstrumentSample { channels: Float32Array[]; sampleRate: number; alternates?: InstrumentSample[] }
export type SampleBank = Record<Instrument, InstrumentSample>;
// FFT measurements of the extracted recordings place their root near MIDI 60.
// Harmony Bloom's native root, envelopes and effects remain undocumented.
export const SAMPLE_ROOT_HZ = INSTRUMENT_ROOT_HZ;

export async function loadSamples(context: AudioContext): Promise<SampleBank> {
  const entries = await Promise.all(INSTRUMENTS.map(async ({ id, samples }) => {
    const takes = await Promise.all(samples.map(async path => {
      const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
      if (!response.ok) throw Error(`Could not load ${id} sample (${response.status}).`);
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i).slice());
      return { channels, sampleRate: buffer.sampleRate };
    }));
    return [id, { ...takes[0], ...(takes.length > 1 ? { alternates: takes.slice(1) } : {}) }] as const;
  }));
  return Object.fromEntries(entries) as SampleBank;
}
