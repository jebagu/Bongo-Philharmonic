import { INSTRUMENTS } from '../foundation/src/core/instruments';
import manifest from '../asset-packs/mario-paint/manifest.json' with { type: 'json' };
import type { AssetSetId } from './model';

export interface InstrumentDefinition {
  id: string;
  name: string;
  assetSetId: AssetSetId;
  portrait: string;
  percussion: boolean;
}

const BASE = import.meta.env?.BASE_URL ?? '/';
const bongo: InstrumentDefinition[] = INSTRUMENTS.map(instrument => ({
  id: instrument.id,
  name: instrument.name,
  assetSetId: 'bongo',
  portrait: `${BASE}art/geometric-toys/${instrument.id}-portrait.png`,
  percussion: instrument.kind === 'percussion',
}));
const mario: InstrumentDefinition[] = manifest.instruments.map(instrument => ({
  id: instrument.id,
  name: instrument.name,
  assetSetId: 'mario',
  portrait: `${BASE}asset-packs/mario-paint/${instrument.sprite}`,
  // Every native picture has thirteen pitched staff positions, including Boat.
  percussion: false,
}));

export function getInstruments(assetSetId: AssetSetId): InstrumentDefinition[] {
  return (assetSetId === 'mario' ? mario : bongo).map(instrument => ({ ...instrument }));
}

export function getInstrument(assetSetId: AssetSetId, typeId: string): InstrumentDefinition {
  const instrument = (assetSetId === 'mario' ? mario : bongo).find(item => item.id === typeId);
  if (!instrument) throw Error(`Unknown ${assetSetId === 'mario' ? 'Mario Paint' : 'Bongo Planet'} instrument: ${typeId}.`);
  return { ...instrument };
}
