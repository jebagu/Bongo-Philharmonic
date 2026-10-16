import type { GateIcon } from './appearance';

type Point = readonly [number, number];
/** Whisper half pixel: faint off-state ink; on-state fill remains opaque. */
export const GATE_OUTLINE = Object.freeze({ width: 0.5, opacity: 0.25 });
export const GATE_ICONS: readonly { id: GateIcon; name: string; polygons: readonly (readonly Point[])[] }[] = [
  { id: 'arrow', name: 'Arrow', polygons: [[[2,9],[12,9],[12,4],[22,12],[12,20],[12,15],[2,15]]] },
  { id: 'chevron', name: 'Chevron', polygons: [[[1,5],[6,5],[13,12],[6,19],[1,19],[8,12]],[[10,5],[15,5],[22,12],[15,19],[10,19],[17,12]]] },
  { id: 'triangle', name: 'Triangle', polygons: [[[5,4],[21,12],[5,20]]] },
  { id: 'bolt', name: 'Bolt', polygons: [[[2,14],[9,6],[10,10],[21,4],[14,18],[13,14]]] },
  { id: 'comet', name: 'Comet', polygons: [[[9,5],[23,12],[9,19],[12,12]],[[1,8],[7,8],[7,9.5],[1,9.5]],[[2,14.5],[7,14.5],[7,16],[2,16]]] },
];

/** The tray and sphere use exactly the same flat glyphs. Outline is Off; solid is On. */
export function gateIconSvg(icon: GateIcon, on: boolean, color = 'currentColor'): string {
  const glyph = GATE_ICONS.find(g => g.id === icon)!;
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="${on ? color : 'none'}" stroke="${color}" stroke-width="${on ? 0 : GATE_OUTLINE.width}" opacity="${on ? 1 : GATE_OUTLINE.opacity}" stroke-linejoin="round">${glyph.polygons.map(points => `<polygon vector-effect="non-scaling-stroke" points="${points.map(p => p.join(',')).join(' ')}"/>`).join('')}</svg>`;
}
