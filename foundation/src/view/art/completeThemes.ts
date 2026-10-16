import { DEFAULT_APPEARANCE, validateAppearance, type Appearance } from './appearance';
import { LOOK_THEMES } from './themes';
import type { ThemePresentation } from './themePresentation';
import previousCatalog from '../../../assets/theme-engine/catalog-v1.json' with { type: 'json' };
import previousSkyCatalog from '../../../assets/theme-engine/catalog-v2.json' with { type: 'json' };
import previousSceneryCatalog from '../../../assets/theme-engine/catalog-v3.json' with { type: 'json' };
import previousClearCatalog from '../../../assets/theme-engine/catalog-v4.json' with { type: 'json' };

export type CompleteTheme = { id: ThemePresentation['id']; name: string; description: string; look: Appearance };

const nightLights: ThemePresentation['lights'] = {
  ambient: '#c2daee', ambientPower: 1.05, key: '#fff0ce', keyPower: 2.5, keyPosition: [-2, 3, 4],
  fill: '#80c7d5', fillPower: 1, fillPosition: [3, -1, 0],
};

const space: ThemePresentation = {
  id: 'deep-space', version: 1,
  materials: { roughness: .45, clearcoat: .15, texture: 'none' },
  lights: { ambient: '#d4ddff', ambientPower: 1.15, key: '#fff1da', keyPower: 2.7, keyPosition: [-2, 3, 4], fill: '#939cfa', fillPower: .75, fillPosition: [3, -1, 2] },
  shadows: { strength: .75, softness: 2 },
  atmosphere: { top: '#14233e', bottom: '#030711', haze: '#55779e', decoration: 'stars', backgroundBlur: 0, fog: false, fogNear: 3.8, fogFar: 7, rim: '#9eb9ff', rimOpacity: .09 },
  sparks: { shape: 'round', core: '#ffffff', halo: '#a5bfff', trail: '#c5d7ff', size: .9, haloSize: .65, haloOpacity: .35, trailOpacity: .5 },
  motion: { stretch: .20, squash: .12, bounce: .12, settle: .22, wobble: .025, glow: .25 },
  interface: { accent: '#647ada', ink: '#263556', panel: '#fffaf2' },
};

function define(id: ThemePresentation['id'], name: string, description: string, look: Partial<Appearance>, changes: Partial<ThemePresentation>): CompleteTheme {
  const presentation = { ...structuredClone(space), ...changes, id };
  return { id, name, description, look: validateAppearance({ ...structuredClone(DEFAULT_APPEARANCE), ...look, theme: presentation }) };
}

const themeStudies: readonly CompleteTheme[] = [
  define('deep-space', 'Deep Space', 'Chalk, stars and cool starlight', LOOK_THEMES[0].look, {}),
  define('nebula-space', 'Nebula', 'Lilac clay beneath a distant toy nebula', { ...LOOK_THEMES[1].look, lighting: .85 }, {
    materials: { roughness: .6, clearcoat: .12, texture: 'clay' },
    lights: nightLights,
    shadows: { strength: .65, softness: 2.5 },
    atmosphere: { ...space.atmosphere, top: '#152b46', bottom: '#071020', haze: '#486381', decoration: 'distant-nebula', backgroundBlur: .6, fog: true, fogNear: 3.9, fogFar: 8, rim: '#a8e2d5', rimOpacity: .12 },
    sparks: { ...space.sparks, shape: 'pearl', halo: '#e0aeff', trail: '#efc9ff', haloOpacity: .5, haloSize: .8 },
    motion: { ...space.motion, stretch: .24, settle: .28, wobble: .04 },
    interface: { accent: '#936caa', ink: '#423054', panel: '#fff8f5' },
  }),
  define('sunday-picnic', 'Sunday Picnic', 'Painted wood in afternoon sunshine', {
    planet: '#82a89a', planetFinish: 'paintedWood', gridColor: '#f9ebca', gridOpacity: .5, gridWidth: 1,
    background: '#ffdfae', backdrop: 'peach', lighting: .9, size: 1.1, generator: '#f4bd43',
    guitar: '#ed9b56', glass: '#a8d9e0', kalimba: '#a8c878', piano: '#baa1d5', marimba: '#e58d99',
    'bongo-high': '#ebaa66', 'bongo-low': '#c88b56', kick: '#779cc8', snare: '#e397a5', 'hi-hat': '#d6b45d',
    switches: { ...DEFAULT_APPEARANCE.switches, onColor: '#e9a82e', offColor: '#fff0ce' },
  }, {
    materials: { roughness: .4, clearcoat: .3, texture: 'wood' },
    lights: { ambient: '#fff5e4', ambientPower: 1.25, key: '#ffe0ad', keyPower: 3, keyPosition: [-3, 4, 3], fill: '#dbe9e3', fillPower: .65, fillPosition: [3, 1, 2] },
    shadows: { strength: .6, softness: 3 },
    atmosphere: { top: '#7c5a67', bottom: '#111a2a', haze: '#d7ac83', decoration: 'clouds', backgroundBlur: 0, fog: true, fogNear: 3.65, fogFar: 7, rim: '#fff2cf', rimOpacity: .06 },
    sparks: { shape: 'seed', core: '#fff9df', halo: '#ffd15e', trail: '#efbf59', size: .85, haloSize: .65, haloOpacity: .45, trailOpacity: .6 },
    motion: { stretch: .17, squash: .12, bounce: .17, settle: .18, wobble: .035, glow: .2 },
    interface: { accent: '#e4855c', ink: '#44364c', panel: '#fff8e9' },
  }),
  define('cloud-pudding', 'Cloud Pudding', 'Soft clay floating among little clouds', {
    planet: '#a29bc9', planetFinish: 'clay', gridColor: '#ded2f0', gridOpacity: .45, gridWidth: .9,
    background: '#dce7f2', backdrop: 'lavender', lighting: .9, size: 1.12, generator: '#efbd70',
    guitar: '#ebb397', glass: '#b6d7ec', kalimba: '#e7cd8b', piano: '#c5addb', marimba: '#d991ad',
    'bongo-high': '#dfb494', 'bongo-low': '#c4a2c5', kick: '#a6b9d1', snare: '#ddadbd', 'hi-hat': '#decb9f',
    switches: { ...DEFAULT_APPEARANCE.switches, onColor: '#d58b7e', offColor: '#d9cce7' },
  }, {
    materials: { roughness: .93, clearcoat: .03, texture: 'clay' },
    lights: { ambient: '#f2ecff', ambientPower: 1.5, key: '#fff0de', keyPower: 2.3, keyPosition: [-2, 4, 4], fill: '#bcd4f0', fillPower: .8, fillPosition: [3, 0, 3] },
    shadows: { strength: .4, softness: 4 },
    atmosphere: { top: '#667496', bottom: '#12182d', haze: '#b2c4de', decoration: 'clouds', backgroundBlur: 0, fog: true, fogNear: 3.35, fogFar: 6.5, rim: '#f5e8ff', rimOpacity: .08 },
    sparks: { shape: 'pearl', core: '#ffffff', halo: '#d4fff1', trail: '#c0e8e0', size: 1.1, haloSize: .7, haloOpacity: .35, trailOpacity: .5 },
    motion: { stretch: .32, squash: .22, bounce: .24, settle: .42, wobble: .095, glow: .17 },
    interface: { accent: '#c47699', ink: '#4b3656', panel: '#fff9f2' },
  }),
  define('firefly-garden', 'Fireflies', 'Jade enamel and little pools of golden light', {
    planet: '#285d5e', planetFinish: 'velvet', gridColor: '#91b3b2', gridOpacity: .3, gridWidth: .8,
    background: '#1b3151', backdrop: 'mint', lighting: .85, size: 1.1, generator: '#e8bc55', sparkStyle: 'ember',
    guitar: '#dd9279', glass: '#a3d7e3', kalimba: '#b5c998', piano: '#adabd5', marimba: '#c48ba9',
    'bongo-high': '#d5a06e', 'bongo-low': '#aa8472', kick: '#8faed0', snare: '#c18fa4', 'hi-hat': '#d4bc75',
    switches: { ...DEFAULT_APPEARANCE.switches, onColor: '#f1ce79', offColor: '#a6c7c0' },
  }, {
    materials: { roughness: .27, clearcoat: .65, texture: 'enamel' },
    lights: nightLights,
    shadows: { strength: .65, softness: 2.5 },
    atmosphere: { top: '#152b46', bottom: '#071020', haze: '#486381', decoration: 'fireflies', backgroundBlur: 0, fog: true, fogNear: 3.9, fogFar: 8, rim: '#a8e2d5', rimOpacity: .12 },
    sparks: { shape: 'firefly', core: '#fff2d7', halo: '#ff7414', trail: '#ff8c2a', size: 1, haloSize: 1, haloOpacity: .95, trailOpacity: .7 },
    motion: { stretch: .16, squash: .1, bounce: .10, settle: .3, wobble: .05, glow: .65 },
    interface: { accent: '#b79745', ink: '#273c51', panel: '#fff9e9' },
  }),
];

/** The approved lineup; Blue Marble is the separate captured browser look. */
export const COMPLETE_THEMES: readonly CompleteTheme[] = themeStudies.filter(theme => ['nebula-space', 'firefly-garden'].includes(theme.id));
/** Retain the studies for old composition files and future design work, outside the picker. */
export const ARCHIVED_COMPLETE_THEMES: readonly CompleteTheme[] = themeStudies.filter(theme => !COMPLETE_THEMES.includes(theme));

export function applyCompleteTheme(id: string, original: Appearance): Appearance {
  if (id === 'original') return structuredClone(original);
  const theme = themeStudies.find(theme => theme.id === id);
  if (!theme) throw Error('Unknown complete theme');
  return structuredClone(theme.look);
}

const previousLooks = [...previousCatalog, ...previousSkyCatalog, ...previousSceneryCatalog, ...previousClearCatalog];

/** Only retire untouched browser presets; customized and imported values stay portable. */
export function isArchivedThemePreset(look: Appearance): boolean {
  if (!ARCHIVED_COMPLETE_THEMES.some(theme => theme.id === look.theme?.id)) return false;
  return [...ARCHIVED_COMPLETE_THEMES.map(theme => theme.look), ...previousLooks]
    .some(previous => JSON.stringify(validateAppearance(previous)) === JSON.stringify(look));
}

/** Refresh untouched experiment presets after this visual revision; preserve custom/imported values. */
export function refreshSavedTheme(look: Appearance): Appearance {
  const previous = previousLooks.some(theme => theme.theme?.id === look.theme?.id && JSON.stringify(validateAppearance(theme)) === JSON.stringify(look));
  if (!previous) return look;
  return applyCompleteTheme(look.theme!.id, look);
}

export const EXPERIMENT_LOOK_KEY = 'bongo-planet-theme-experiment-look-v1';
export const ORIGINAL_LOOK_KEY = 'bongo-planet-theme-experiment-original-v1';
export const ARCHIVED_LOOK_KEY = 'bongo-planet-theme-experiment-archived-look-v1';
export const PRODUCTION_ORIGINAL_LOOK_KEY = 'bongo-planet-original-look-v1';
export function isThemeExperiment(path: string, search = '') {
  return /\/theme-experiment\/?$/.test(path) || new URLSearchParams(search).get('theme-experiment') === '1';
}
