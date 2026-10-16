import { MARIO_PAINT_IDS, nativeNote, type MarioPaintId, type MarioPaintManifest, type PcmSample } from './types';

export interface LoadedMarioPaintNote { sample: PcmSample; buffer: AudioBuffer; duration: number }
export type MarioPaintBank = Record<MarioPaintId, LoadedMarioPaintNote[]>;

/** Resolve an asset relative to the pack, rejecting absolute / escaping paths. */
export function packUrl(baseUrl: string | URL, path: string): string {
  if (!path || !/^[a-z0-9][a-z0-9._/-]*$/i.test(path) || path.split('/').includes('..')) throw Error('Invalid pack asset path.');
  const base = new URL(baseUrl, typeof location === 'undefined' ? 'http://127.0.0.1/' : location.href);
  if (!base.pathname.endsWith('/')) base.pathname += '/';
  const result = new URL(path, base);
  if (result.origin !== base.origin || !result.pathname.startsWith(base.pathname)) throw Error('Pack asset path escapes its base.');
  return result.href;
}

export async function loadMarioPaintManifest(baseUrl: string | URL): Promise<MarioPaintManifest> {
  const response = await fetch(packUrl(baseUrl, 'manifest.json'));
  if (!response.ok) throw Error(`Could not load Mario Paint manifest (${response.status}).`);
  const manifest = await response.json() as MarioPaintManifest;
  if (manifest.format !== 'bongo-planet-instrument-pack' || manifest.version !== 1 || manifest.id !== 'mario-paint'
    || !Array.isArray(manifest.instruments) || manifest.instruments.length !== 15
    || !Array.isArray(manifest.samples) || manifest.samples.length !== 23
    || !Array.isArray(manifest.staffLabels) || manifest.staffLabels.length !== 13
    || new Set(manifest.instruments.map(instrument => instrument.id)).size !== 15) throw Error('Invalid Mario Paint manifest.');
  for (const id of MARIO_PAINT_IDS) {
    const instrument = manifest.instruments.find(instrument => instrument.id === id);
    if (!instrument || !Array.isArray(instrument.notes) || instrument.notes.length !== 13) throw Error(`Missing Mario Paint instrument ${id}.`);
    for (let position = 1; position <= 13; position++) packUrl(baseUrl, nativeNote(instrument, position).wav);
  }
  return manifest;
}

/** Load a voice once. AudioContext may resample; preserve its actual buffer rate. */
export async function loadMarioPaintInstrument(context: BaseAudioContext, manifest: MarioPaintManifest, id: MarioPaintId, baseUrl: string | URL): Promise<LoadedMarioPaintNote[]> {
  const instrument = manifest.instruments.find(instrument => instrument.id === id);
  if (!instrument) throw Error(`Unknown Mario Paint instrument ${id}.`);
  return Promise.all(Array.from({ length: 13 }, async (_, index) => {
    const note = nativeNote(instrument, index + 1);
    const response = await fetch(packUrl(baseUrl, note.wav));
    if (!response.ok) throw Error(`Could not load ${id} ${note.staffLabel} (${response.status}).`);
    const buffer = await context.decodeAudioData(await response.arrayBuffer());
    return { buffer, duration: buffer.duration, sample: {
      channels: Array.from({ length: buffer.numberOfChannels }, (_, channel) => buffer.getChannelData(channel).slice()),
      sampleRate: buffer.sampleRate,
    } };
  }));
}

export async function loadMarioPaintBank(context: BaseAudioContext, manifest: MarioPaintManifest, baseUrl: string | URL): Promise<MarioPaintBank> {
  const pairs = await Promise.all(MARIO_PAINT_IDS.map(async id => [id, await loadMarioPaintInstrument(context, manifest, id, baseUrl)] as const));
  return Object.fromEntries(pairs) as MarioPaintBank;
}

/** Native one-shot audition. Its own envelope is already baked into the WAV. */
export function playMarioPaintNote(context: BaseAudioContext, notes: LoadedMarioPaintNote[], staffPosition: number,
  options: { when?: number; gain?: number; destination?: AudioNode; semitones?: number } = {}): AudioBufferSourceNode {
  const note = notes[staffPosition - 1];
  if (!Number.isInteger(staffPosition) || !note) throw Error('Staff position must be an integer from 1 to 13.');
  const when = options.when ?? context.currentTime, gain = options.gain ?? 0.65, semitones = options.semitones ?? 0;
  if (!Number.isFinite(when) || when < 0 || !Number.isFinite(gain) || gain < 0 || gain > 1
    || !Number.isFinite(semitones) || Math.abs(semitones) > 48) throw Error('Invalid Mario Paint playback options.');
  const source = context.createBufferSource(), level = context.createGain();
  source.buffer = note.buffer;
  source.playbackRate.value = 2 ** (semitones / 12);
  level.gain.value = gain;
  source.connect(level).connect(options.destination ?? context.destination);
  source.onended = () => { source.disconnect(); level.disconnect(); };
  source.start(when);
  return source;
}
