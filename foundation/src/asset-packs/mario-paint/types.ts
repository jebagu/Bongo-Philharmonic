export const MARIO_PAINT_IDS = ['mario', 'mushroom', 'yoshi', 'star', 'flower', 'game-boy', 'dog', 'cat', 'pig', 'swan', 'baby', 'airplane', 'boat', 'car', 'heart'] as const;
export type MarioPaintId = typeof MARIO_PAINT_IDS[number];

/** Structurally compatible with Bongo Planet's InstrumentSample / worklet PCM. */
export interface PcmSample { channels: Float32Array[]; sampleRate: number }
export interface NativeNote {
  staffPosition: number; staffLabel: string; sampleIndex: number; nspcNote: number;
  wav: string; frames: number; sampleRate: number; durationSeconds: number;
  removedLeadingFrames: number; peak: number; normalization: false;
}
export interface MarioPaintInstrument {
  id: MarioPaintId; bongoId: string; composerIndex: number; name: string; timbre: string;
  sprite: string; model: string; voxelJson: string; magicaVoxel: string;
  opaquePixels: number; voxelCount: number; primarySampleIndex: number;
  native: { volume: number; pan: number; finePitch: number; maxDurationTicks: number };
  notes: NativeNote[];
}
export interface SourceSample {
  index: number; role: 'composer' | 'auxiliary'; wav: string; brr: string;
  frames: number; sampleRate: number; loop: boolean; loopStartFrame: number; loopEndFrame: number;
  nominalRateIsNotRootPitch: true;
  native: { adsr1: number; adsr2: number; gain: number; tuningBigEndian: number; aramStart: number; aramLoop: number };
}
export interface MarioPaintManifest {
  format: 'bongo-planet-instrument-pack'; version: 1; id: 'mario-paint'; name: string;
  staffLabels: string[]; instruments: MarioPaintInstrument[]; samples: SourceSample[];
}
export interface VoxelSprite {
  format: 'bongo-planet-voxel-sprite'; version: 1; id: MarioPaintId;
  size: [number, number, number]; axes: 'x-right-y-up-z-outward';
  pixelSize: number; surfaceLift: number; palette: string[];
  voxels: [number, number, number, number][];
}

/** Reject corrupt assets before allocating geometry or fetching their paths. */
export function validateVoxelSprite(value: unknown): VoxelSprite {
  const data = value as VoxelSprite;
  if (!data || data.format !== 'bongo-planet-voxel-sprite' || data.version !== 1 || !MARIO_PAINT_IDS.includes(data.id)
    || data.axes !== 'x-right-y-up-z-outward' || !Array.isArray(data.size) || data.size.length !== 3
    || data.size.some(n => !Number.isInteger(n) || n < 1 || n > 256)
    || !Number.isFinite(data.pixelSize) || data.pixelSize <= 0 || data.pixelSize > 1
    || !Number.isFinite(data.surfaceLift) || data.surfaceLift < 0 || data.surfaceLift > 1
    || !Array.isArray(data.palette) || data.palette.length < 1 || data.palette.length > 255
    || data.palette.some(color => typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color))
    || !Array.isArray(data.voxels) || !data.voxels.length || data.voxels.length > 65536) throw Error('Invalid Mario Paint voxel asset.');
  const occupied = new Set<string>();
  for (const voxel of data.voxels) {
    if (!Array.isArray(voxel) || voxel.length !== 4 || voxel.some(n => !Number.isInteger(n))
      || voxel.slice(0, 3).some((n, axis) => n < 0 || n >= data.size[axis])
      || voxel[3] < 0 || voxel[3] >= data.palette.length) throw Error('Invalid Mario Paint voxel coordinate or palette index.');
    const key = voxel.slice(0, 3).join(',');
    if (occupied.has(key)) throw Error('Duplicate Mario Paint voxel.');
    occupied.add(key);
  }
  return data;
}

export function nativeNote(instrument: MarioPaintInstrument, position: number): NativeNote {
  if (!Number.isInteger(position) || position < 1 || position > 13) throw Error('Staff position must be an integer from 1 to 13.');
  const note = instrument.notes.find(note => note.staffPosition === position);
  if (!note) throw Error(`Missing ${instrument.id} staff position ${position}.`);
  return note;
}
