/** Bongo's own portrait and a sinusoidal bounce; no native sprite or motion table. */
export function getMarioPlayheadFrame(beat: number, playing: boolean, reducedMotion: boolean, subdivision = 1) {
  const position = Math.max(0, Number.isFinite(beat) ? beat : 0) * (Number.isFinite(subdivision) && subdivision > 0 ? subdivision : 1);
  const phase = position - Math.floor(position);
  return {
    href: `${import.meta.env.BASE_URL}art/geometric-toys/bongo-high-portrait.png`,
    width: 32, height: 32, phase, pose: 'bongo',
    offsetY: playing && !reducedMotion ? -16 * Math.sin(Math.PI * phase) : 0,
  };
}
