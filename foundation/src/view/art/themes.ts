import type { Appearance } from './appearance';
import { BACKDROPS } from './swatches';
import { PLANET_FINISHES } from './planetMaterials';

type WorldLook = Pick<Appearance, 'planet' | 'planetFinish' | 'gridColor' | 'gridOpacity' | 'gridWidth' | 'backdrop' | 'background'>;

/** Keep the approved study numbers so the choices are recognizable. */
export const LOOK_THEMES: readonly { id: number; name: string; look: WorldLook }[] = [
  { id: 22, name: 'Moon chalk', look: { planet: '#4e5b81', planetFinish: 'workedClay', gridColor: '#bac5e4', gridOpacity: .32, gridWidth: .9, backdrop: 'stars', background: '#171c45' } },
  { id: 25, name: 'Lilac dusk', look: { planet: '#8275a8', planetFinish: 'clay', gridColor: '#e0d4e9', gridOpacity: .34, gridWidth: .9, backdrop: 'violet-stars', background: '#1f2145' } },
];

export function applyLookTheme(appearance: Appearance, theme: typeof LOOK_THEMES[number]): Appearance {
  return { ...appearance, ...theme.look };
}

export function matchesLookTheme(appearance: Appearance, theme: typeof LOOK_THEMES[number]) {
  return (Object.keys(theme.look) as (keyof WorldLook)[]).every(key => appearance[key] === theme.look[key]);
}

export function describeLookTheme(theme: typeof LOOK_THEMES[number]) {
  return `${PLANET_FINISHES[theme.look.planetFinish].name} · ${BACKDROPS.find(b => b.id === theme.look.backdrop)!.name}`;
}
