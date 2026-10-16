import { z } from 'zod';

const color = z.string().regex(/^#[0-9a-f]{6}$/i);
const bounded = (min: number, max: number) => z.number().finite().min(min).max(max);
const position = z.tuple([bounded(-10, 10), bounded(-10, 10), bounded(-10, 10)]);

/** Saved values are the rendering contract; a catalog revision cannot change an old file. */
export const themePresentationSchema = z.object({
  id: z.enum(['deep-space', 'nebula-space', 'sunday-picnic', 'cloud-pudding', 'firefly-garden']),
  version: z.literal(1),
  materials: z.object({ roughness: bounded(0, 1), clearcoat: bounded(0, 1), texture: z.enum(['none', 'wood', 'clay', 'enamel']) }).strict(),
  lights: z.object({
    ambient: color, ambientPower: bounded(0, 4), key: color, keyPower: bounded(0, 6), keyPosition: position,
    fill: color, fillPower: bounded(0, 3), fillPosition: position,
  }).strict(),
  shadows: z.object({ strength: bounded(0, 1), softness: bounded(0, 5) }).strict(),
  atmosphere: z.object({
    top: color, bottom: color, haze: color, decoration: z.enum(['none', 'stars', 'nebula', 'distant-nebula', 'clouds', 'fireflies']),
    backgroundBlur: bounded(0, 2).default(0),
    fog: z.boolean(), fogNear: bounded(.1, 20), fogFar: bounded(.1, 30), rim: color, rimOpacity: bounded(0, .35),
  }).strict().refine(value => value.fogFar > value.fogNear, 'Fog far must exceed fog near'),
  sparks: z.object({
    shape: z.enum(['round', 'seed', 'pearl', 'firefly']), core: color, halo: color, trail: color,
    size: bounded(.5, 2), haloSize: bounded(.2, 2), haloOpacity: bounded(0, 1), trailOpacity: bounded(0, 1),
  }).strict(),
  motion: z.object({ stretch: bounded(0, .4), squash: bounded(0, .3), bounce: bounded(0, .3), settle: bounded(.1, .7), wobble: bounded(0, .2), glow: bounded(0, .8) }).strict(),
  interface: z.object({ accent: color, ink: color, panel: color }).strict(),
}).strict();

export type ThemePresentation = z.infer<typeof themePresentationSchema>;

export function themeBackground(theme: ThemePresentation): string {
  const { top, bottom, haze } = theme.atmosphere;
  return `radial-gradient(ellipse at 73% 22%, ${haze}65 0%, transparent 57%), radial-gradient(ellipse at 28% 8%, ${top}cc, transparent 68%), linear-gradient(180deg, ${top} 0%, ${bottom} 88%)`;
}
