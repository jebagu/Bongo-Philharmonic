import original from './assets/mario-paint-playhead.json' with { type: 'json' };

const poses = [
  { name: 'walk-a', href: new URL('./assets/mario-paint-walk-a.png', import.meta.url).href },
  { name: 'walk-b', href: new URL('./assets/mario-paint-walk-b.png', import.meta.url).href },
  { name: 'jump', href: new URL('./assets/mario-paint-jump.png', import.meta.url).href },
] as const;

export interface MarioPlayheadFrame {
  href: string;
  /** Exact 2× display size of the original 16×24 sprite. */
  width: number;
  height: number;
  /** Add to the resting top; negative values lift Mario off the timing line. */
  offsetY: number;
  pose: typeof poses[number]['name'];
  phase: number;
  hopDistance: number;
  targetBeat?: number;
}

export interface MarioPlayheadTiming {
  beatWidth: number;
  targetBeat?: number;
  previousBeat?: number;
  pixelScale?: number;
  tempo?: number;
}

/** CODE_00F6AC: jump into an occupied column, using horizontal travel to index
 * the 32 native Y samples. The jump pose stays fixed for the entire arc.
 * Empty space uses the native nine-tick walk cycle. Never use the editing grid.
 */
export function getMarioPlayheadFrame(beat: number, playing: boolean, reducedMotion: boolean, timing?: MarioPlayheadTiming): MarioPlayheadFrame {
  const position = Math.max(0, Number.isFinite(beat) ? beat : 0);
  const scale = timing?.pixelScale && Number.isFinite(timing.pixelScale) && timing.pixelScale > 0 ? timing.pixelScale : 2;
  let pose: typeof poses[number] = poses[0];
  let offsetY = 0, phase = 0, hopDistance = 0;
  let targetBeat: number | undefined;
  if (playing && !reducedMotion) {
    const tempo = timing?.tempo && Number.isFinite(timing.tempo) && timing.tempo > 0 ? timing.tempo : 120;
    pose = poses[Math.floor(position * 60 / tempo * 60) % 9 < 4 ? 0 : 1];
    if (timing && timing.targetBeat !== undefined && Number.isFinite(timing.targetBeat) && timing.beatWidth > 0) {
      const distance = (timing.targetBeat - position) * timing.beatWidth;
      const available = (timing.targetBeat - (timing.previousBeat ?? 0)) * timing.beatWidth;
      const span = Math.min(original.jumpY.length * scale, available);
      if (span > 0 && distance > 1e-7 && distance <= span + 1e-7) {
        phase = Math.max(0, 1 - distance / span);
        const index = Math.min(original.jumpY.length - 1, Math.floor(phase * original.jumpY.length + 1e-7));
        offsetY = (original.jumpY[index] - original.jumpY[0]) * span / original.jumpY.length;
        pose = poses[2];
        hopDistance = span;
        targetBeat = timing.targetBeat;
      }
    }
  }
  return { href: pose.href, width: 16 * scale, height: 24 * scale, offsetY, pose: pose.name, phase, hopDistance, targetBeat };
}

/** CODE_00FC23 / DATA_00FC73 moves all pictures in the struck column together.
 * Index by horizontal travel after the onset, as the console does, not a timer.
 */
export function getMarioNoteOffset(distancePixels: number, pixelScale: number, playing: boolean, reducedMotion: boolean): number {
  if (!playing || reducedMotion || !Number.isFinite(distancePixels) || !Number.isFinite(pixelScale) || pixelScale <= 0) return 0;
  const sourcePixel = Math.floor(distancePixels / pixelScale + 1e-9);
  return sourcePixel >= 0 && sourcePixel < original.noteReaction.offsetY.length
    ? original.noteReaction.offsetY[sourcePixel] * pixelScale : 0;
}
