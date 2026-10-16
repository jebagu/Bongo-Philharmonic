export const SWATCHES = [
  ['Butter', '#ffd35b'], ['Apricot', '#ffb883'], ['Coral', '#ff9685'], ['Rose', '#f7aab9'],
  ['Lilac', '#c6b4f6'], ['Periwinkle', '#889cf8'], ['Planet blue', '#5262e9'], ['Sky', '#a1dff9'],
  ['Mint', '#70dec8'], ['Sage', '#b5dfaa'], ['Cream', '#fff8ed'], ['Ink', '#344362'],
] as const;

/** Dark surfaces let the bright instruments, gates and sparks stand out. */
export const PLANET_SWATCHES = [
  ['Ochre', '#685222'], ['Copper', '#794629'], ['Brick', '#7a3637'], ['Burgundy', '#662b48'],
  ['Plum', '#543468'], ['Deep violet', '#443b79'], ['Planet blue', '#5262e9'], ['Deep ocean', '#23546a'],
  ['Pine', '#20534d'], ['Forest', '#365438'], ['Charcoal', '#3b404b'], ['Ink', '#344362'],
] as const;

export const BACKDROPS = [
  { id: 'cream', name: 'Midnight', color: '#151e31', fill: 'radial-gradient(ellipse at 72% 20%, #263754 0%, transparent 55%), linear-gradient(150deg, #101725, #1b2942)' },
  { id: 'peach', name: 'Ember dusk', color: '#2b1d24', fill: 'radial-gradient(ellipse at 80% 15%, #4d2e36 0%, transparent 55%), linear-gradient(145deg, #21171f, #362329)' },
  { id: 'mint', name: 'Deep forest', color: '#142c2b', fill: 'radial-gradient(ellipse at 70% 20%, #214743 0%, transparent 60%), linear-gradient(145deg, #102320, #183736)' },
  { id: 'lavender', name: 'Plum night', color: '#241c38', fill: 'radial-gradient(ellipse at 78% 20%, #402e57 0%, transparent 55%), linear-gradient(145deg, #1a162b, #302441)' },
  { id: 'stars', name: 'Star field', color: '#171c45', fill: 'radial-gradient(ellipse at 75% 30%, #393563 0%, transparent 60%), linear-gradient(145deg, #111934, #252044)' },
] as const;
export type Backdrop = typeof BACKDROPS[number]['id'];

/** Stable, irregular points: decorative stars never affect the musical scene. */
export function starPoints() {
  let seed = 4317;
  const random = () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
  return Array.from({ length: 110 }, () => ({ x: random()*100, y: random()*100, size: 1+random()*2, opacity: 0.25+random()*0.65 }));
}
