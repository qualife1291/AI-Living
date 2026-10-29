import {resolveModel} from './asset-bindings.ts';
import {CORE_MODELS,CITIZEN_FALLBACK} from './character-models.ts';

/** Startup set only. Focused NPCs and the gallery load their own assets on demand. */
export const cityAssetIds = [...new Set([
  ...Object.values(CORE_MODELS),CITIZEN_FALLBACK,
  ...['car-sedan', 'car-hatchback', 'car-taxi', 'display-bread', 'display-fruit', 'bin'].map(key => resolveModel(key)!).filter(Boolean),
  'commercial/building-a', 'commercial/building-b', 'commercial/building-c', 'commercial/building-skyscraper-a', 'commercial/detail-parasol-a',
  'suburban/building-type-a', 'suburban/building-type-b', 'suburban/building-type-c', 'suburban/tree-large', 'suburban/tree-small',
  'watercraft/boat-fishing-small', 'watercraft/boat-row-small', 'watercraft/boat-house-a', 'watercraft/buoy',
  'trains/railroad-straight', 'trains/train-tram-modern', 'roads/traffic-light',
])];
