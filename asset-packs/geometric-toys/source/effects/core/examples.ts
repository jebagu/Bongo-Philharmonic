import { emptyLegacyScene as emptyScene, newPiece, validateScene, type Scene } from './contracts';
import { topology } from './geometry';
import type { Instrument } from './instruments';
import { PLANET_SONG_PRESETS } from './songbook';
import { CLASSIC_PRESETS } from './classics';
import { GAME_THEME_PRESETS } from './gameThemes';

export const FAVORITE_EXAMPLES = [
  { id: 'S13', name: 'Pachelbel’s Canon' },
  { id: 'F10', name: 'Toy Ensemble' },
] as const;

const MORE_EXAMPLES = [
  ...PLANET_SONG_PRESETS.filter(example => example.id !== 'S13'),
  { id: 'F15', name: 'Switch Chain' },
  { id: 'F16', name: 'Switch Fork' },
  { id: 'F17', name: 'Infinite Circuit' },
  { id: 'F11', name: 'Twinkle Trail' },
  { id: 'F12', name: 'Little Lamb' },
  { id: 'F13', name: 'Row Your Boat' },
  { id: 'F14', name: 'Morning Bells' },
  { id: 'F00', name: 'Empty planet' },
] as const;

export const EXAMPLE_GROUPS = [
  {name:'Favorites',examples:FAVORITE_EXAMPLES},
  {name:'New classics',examples:CLASSIC_PRESETS},
  {name:'Video game themes',examples:GAME_THEME_PRESETS},
  {name:'More presets',examples:MORE_EXAMPLES},
] as const;
export const EXAMPLES = EXAMPLE_GROUPS.flatMap(group => [...group.examples]);

export const SONGS = [
  { id: 'F11', song: 'Twinkle, Twinkle, Little Star', degrees: [0,0,4,4,5,5,4], instruments: ['glass','kalimba'], bpm: 96 },
  { id: 'F12', song: 'Mary Had a Little Lamb', degrees: [2,1,0,1,2,2,2], instruments: ['piano','marimba'], bpm: 100 },
  { id: 'F13', song: 'Row, Row, Row Your Boat', degrees: [0,0,0,1,2,2,1,2,3,4], instruments: ['guitar','kalimba'], bpm: 92 },
  { id: 'F14', song: 'Frère Jacques', degrees: [0,1,2,0,0,1,2,0], instruments: ['glass','piano'], bpm: 88 },
] as const;

/** Find a visible, non-repeating seam walk, so every phrase note is editable. */
function phrasePath(count: number): number[] {
  const front = (vertex: number) => -topology.vertices[vertex][1] > 0.28;
  function extend(path: number[]): number[] | null {
    if (path.length === count) return path;
    const options = topology.neighbors[path.at(-1)!].filter(v => front(v) && !path.includes(v));
    // Prefer progressing around the face before turning inward.
    options.sort((a,b) => topology.vertices[b][2]-topology.vertices[a][2] || a-b);
    for (const next of options) { const found = extend([...path,next]); if (found) return found; }
    return null;
  }
  const path = extend([44]);
  if (!path) throw Error('Could not fit a song phrase on the visible planet.');
  return path;
}

export function songScene(song: typeof SONGS[number]): Scene {
  const scene = emptyScene();
  scene.settings = {...scene.settings,bpm:song.bpm,propagation:'routes',quantization:0,travel:0.75,volume:0.55};
  const path = phrasePath(song.degrees.length+1);
  const generator = newPiece('generator',path[0],`${song.id}-spark`);
  generator.period=8; generator.reach=120; generator.path=path;
  scene.pieces.push(generator);
  song.degrees.forEach((degree,index) => {
    const note=newPiece('note',path[index+1],`${song.id}-note-${index}`);
    note.instrument=song.instruments[index%song.instruments.length] as Instrument;
    note.degree=degree; note.duration=index===song.degrees.length-1?1.2:0.48; note.level=0.55;
    scene.pieces.push(note);
  });
  return validateScene(scene);
}
