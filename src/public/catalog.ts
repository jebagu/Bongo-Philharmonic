import { INSTRUMENTS } from '../../foundation/src/core/instruments';
import type { AssetSetId } from '../model';
export interface InstrumentDefinition {
  id: string; name: string; assetSetId: AssetSetId; portrait: string; percussion: boolean;
}
const instruments: InstrumentDefinition[] = INSTRUMENTS.map(item => ({
  id: item.id, name: item.name, assetSetId: 'bongo',
  portrait: `${import.meta.env.BASE_URL}art/geometric-toys/${item.id}-portrait.png`,
  percussion: item.kind === 'percussion',
}));
export function getInstruments(set: AssetSetId): InstrumentDefinition[] {
  if (set !== 'bongo') throw Error('This sound set is available in the local application only.');
  return instruments.map(item => ({ ...item }));
}
export function getInstrument(set: AssetSetId, id: string): InstrumentDefinition {
  const item = getInstruments(set).find(item => item.id === id);
  if (!item) throw Error(`Unknown Bongo instrument: ${id}.`);
  return { ...item };
}
