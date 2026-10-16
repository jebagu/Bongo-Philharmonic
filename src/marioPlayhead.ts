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
}

/** Native Mario Paint poses and DATA_00F7B4 arc, driven by the audio clock.
 * Each score subdivision is one hop. The table's last segment closes back to
 * its starting height at touchdown; paused and reduced-motion frames stay still.
 * Source addresses, hashes and exact atlas crops live beside the original art.
 */
export function getMarioPlayheadFrame(beat: number, playing: boolean, reducedMotion: boolean, subdivision = 1): MarioPlayheadFrame {
  const columnPosition = Math.max(0, Number.isFinite(beat) ? beat : 0)
    * (Number.isFinite(subdivision) && subdivision > 0 ? subdivision : 1);
  // Audio clocks can arrive a few ulps before a timing line. Treat that as its
  // touchdown rather than briefly displaying the previous column's final frame.
  const nearest = Math.round(columnPosition);
  const position = Math.abs(columnPosition - nearest) < 1e-9 ? nearest : columnPosition;
  const column = Math.floor(position);
  const phase = position - column;
  let pose: typeof poses[number] = poses[0];
  let offsetY = 0;
  if (playing && !reducedMotion) {
    const sample = phase * original.jumpY.length;
    const index = Math.floor(sample), fraction = sample - index;
    const y = original.jumpY[index] * (1 - fraction)
      + (original.jumpY[index + 1] ?? original.jumpY[0]) * fraction;
    offsetY = (y - original.jumpY[0]) * 1.25;
    pose = phase > .04 && phase < .96 ? poses[2] : poses[column % 2];
  }
  return { href: pose.href, width: 32, height: 48, offsetY, pose: pose.name, phase };
}
