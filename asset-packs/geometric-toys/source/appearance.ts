import { BACKDROPS, type Backdrop } from './swatches';
import defaults from '../theme.json';
import { z } from 'zod';
export type GateIcon = 'arrow' | 'chevron' | 'triangle' | 'bolt' | 'comet';
export type SparkStyle = 'ember' | 'white' | 'lightning';
export const SPARK_STYLES: readonly {id: SparkStyle; name: string; description: string}[] = [
  {id:'ember',name:'Ember',description:'Hot orange with a glowing haze'},
  {id:'white',name:'White ball',description:'A simple moving white ball'},
  {id:'lightning',name:'Lightning',description:'A little yellow bolt with an electric trail'},
];
export type SwitchLook={style:'ink'|'toy'|'glow';icon:GateIcon;size:number;stroke:number;onColor:string;offColor:string;glow:number;animation:boolean};
export const DEFAULT_SWITCH_LOOK:Readonly<SwitchLook>=Object.freeze({style:'ink',icon:'arrow',size:1,stroke:1,onColor:'#ffd35b',offColor:'#ffffff',glow:0,animation:true});

export type Appearance = {
  version: 1;
  style: 'classic' | 'toys';
  surface: 'seams' | 'curved';
  pulseEffects: 'struts' | 'legacy';
  guitar: string;
  glass: string;
  kalimba: string;
  piano: string;
  marimba: string;
  'bongo-high': string;
  'bongo-low': string;
  kick: string;
  snare: string;
  'hi-hat': string;
  planet: string;
  generator: string;
  note: string;
  beat: string;
  background: string;
  backdrop: Backdrop;
  eyes: boolean;
  bounce: boolean;
  glow: number;
  size: number;
  lighting: number;
  switches: SwitchLook;
  sparkStyle: SparkStyle;
};

export const DEFAULT_APPEARANCE: Readonly<Appearance> = Object.freeze({...defaults,switches:{...DEFAULT_SWITCH_LOOK},sparkStyle:'white'} as Appearance);
export const APPEARANCE_STORAGE_KEY = 'bongo-planet-appearance-v1';

const color = z.string().regex(/^#[0-9a-f]{6}$/i);
const range = (min: number, max: number) => z.number().finite().min(min).max(max);
/** The complete current look in portable composition files and the agent guide. */
export const appearanceSchema = z.object({
  version: z.literal(1), style: z.literal('toys'), surface: z.literal('seams'), pulseEffects: z.literal('struts'),
  planet: color, generator: color, note: color, beat: color, background: color,
  guitar: color, glass: color, kalimba: color, piano: color, marimba: color,
  'bongo-high': color.default(defaults['bongo-high']), 'bongo-low': color.default(defaults['bongo-low']),
  kick: color.default(defaults.kick), snare: color.default(defaults.snare), 'hi-hat': color.default(defaults['hi-hat']),
  backdrop: z.enum(BACKDROPS.map(b => b.id)), eyes: z.literal(true), bounce: z.literal(true),
  glow: range(0, 2), size: range(0.65, 1.6), lighting: range(0.5, 2),
  sparkStyle: z.enum(['ember', 'white', 'lightning']),
  switches: z.object({
    style: z.enum(['ink', 'toy', 'glow']), icon: z.enum(['arrow', 'chevron', 'triangle', 'bolt', 'comet']),
    size: range(0.7, 1.6), stroke: range(0.65, 1.6), glow: range(0, 1),
    onColor: color, offColor: color, animation: z.boolean(),
  }).strict(),
}).strict();

/** Migrate standalone looks; appearance never changes the musical scene. */
export function validateAppearance(value: unknown): Appearance {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Expected an appearance object.');
  const input = value as Record<string, unknown>;
  if (input.version !== 1 || (input.style !== 'classic' && input.style !== 'toys')) throw Error('Unsupported appearance preset.');
  const result = { ...DEFAULT_APPEARANCE };
  result.switches={...DEFAULT_SWITCH_LOOK};
  if(input.switches!==undefined){const value=input.switches as Record<string,unknown>;if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid spark switches look');if(typeof value.style!=='string'||!['ink','toy','glow'].includes(value.style))throw Error('Invalid spark switches style');for(const [key,min,max] of [['size',.7,1.6],['stroke',.65,1.6],['glow',0,1]] as const){const n=value[key];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw Error(`Invalid switches ${key}`);}for(const key of ['onColor','offColor'] as const)if(typeof value[key]!=='string'||!/^#[0-9a-f]{6}$/i.test(value[key] as string))throw Error(`Invalid switches ${key}`);if(typeof value.animation!=='boolean')throw Error('Invalid switches animation');const icon=value.icon??DEFAULT_SWITCH_LOOK.icon;if(typeof icon!=='string'||!['arrow','chevron','triangle','bolt','comet'].includes(icon))throw Error('Invalid gate icon');result.switches={style:value.style as SwitchLook['style'],icon:icon as GateIcon,size:value.size as number,stroke:value.stroke as number,glow:value.glow as number,onColor:value.onColor as string,offColor:value.offColor as string,animation:value.animation};}
  if (input.sparkStyle !== undefined) {
    if (typeof input.sparkStyle !== 'string' || !['ember', 'white', 'lightning'].includes(input.sparkStyle)) throw Error('Invalid spark style.');
    result.sparkStyle = input.sparkStyle as SparkStyle;
  }
  result.style = 'toys'; // Earlier Original presets adopt the only supported style.
  if (input.surface !== undefined) {
    if (input.surface !== 'seams' && input.surface !== 'curved') throw Error('Invalid surface setting.');
    result.surface = 'seams';
  }
  // Version-one looks saved before strut sparks adopt the new default.
  if (input.pulseEffects !== undefined) {
    if (input.pulseEffects !== 'struts' && input.pulseEffects !== 'legacy') throw Error('Invalid pulse effects setting.');
    result.pulseEffects = 'struts';
  }
  if (input.backdrop !== undefined) {
    if (!BACKDROPS.some(b => b.id === input.backdrop)) throw Error('Invalid background setting.');
    result.backdrop = input.backdrop as Backdrop;
  }
  for (const key of ['planet', 'generator', 'note', 'beat', 'background'] as const) {
    if (typeof input[key] !== 'string' || !/^#[0-9a-f]{6}$/i.test(input[key])) throw Error(`Invalid ${key} color.`);
    result[key] = input[key];
  }
  for (const key of ['guitar', 'glass', 'kalimba', 'piano', 'marimba', 'bongo-high', 'bongo-low', 'kick', 'snare', 'hi-hat'] as const) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== 'string' || !/^#[0-9a-f]{6}$/i.test(input[key])) throw Error(`Invalid ${key} color.`);
    result[key] = input[key];
  }
  for (const key of ['eyes', 'bounce'] as const) {
    if (input[key] !== undefined && typeof input[key] !== 'boolean') throw Error(`Invalid ${key} setting.`);
    result[key] = true;
  }
  for (const [key, min, max] of [['glow', 0, 2], ['size', 0.65, 1.6], ['lighting', 0.5, 2]] as const) {
    const n = input[key];
    if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) throw Error(`Invalid ${key} setting.`);
    result[key] = n;
  }
  return appearanceSchema.parse(result);
}

export function readAppearance(storage: Pick<Storage, 'getItem'>): Appearance {
  try {
    const saved = storage.getItem(APPEARANCE_STORAGE_KEY);
    return saved ? validateAppearance(JSON.parse(saved)) : { ...DEFAULT_APPEARANCE };
  } catch { return { ...DEFAULT_APPEARANCE }; }
}
