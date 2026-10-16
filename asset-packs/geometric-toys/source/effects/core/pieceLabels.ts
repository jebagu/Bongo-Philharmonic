import type { Piece, Scene } from './contracts';
import { instrumentName } from './instruments';

export function pieceFamily(piece: Piece): string {
  return piece.kind === 'generator' ? 'Generator' : piece.kind === 'note' ? instrumentName(piece.instrument ?? 'piano') : 'Marimba';
}

/** Keep assigned names stable across moves, deletion, history and save/load. */
export function labelPieces(scene: Scene): Scene {
  const maximum = new Map<string, number>();
  const reserved = new Set<string>();
  for (const piece of scene.pieces) {
    const family = pieceFamily(piece);
    if (piece.label?.startsWith(`${family} `)) {
      reserved.add(piece.label);
      maximum.set(family, Math.max(maximum.get(family) ?? 0, Number(piece.label.slice(family.length + 1))));
    }
  }
  const used = new Set<string>();
  return { ...scene, pieces: scene.pieces.map(piece => {
    const family = pieceFamily(piece);
    let label = piece.label;
    if (!label?.startsWith(`${family} `) || used.has(label)) {
      let number = (maximum.get(family) ?? 0) + 1;
      if (number > 999999) number = 1;
      while (reserved.has(`${family} ${number}`) || used.has(`${family} ${number}`)) number++;
      maximum.set(family, number); label = `${family} ${number}`;
    }
    used.add(label);
    return { ...piece, label };
  }) };
}
