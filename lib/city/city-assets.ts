import {resolveModel} from './asset-bindings.ts';
import {CORE_MODELS,CITIZEN_MODELS} from './character-models.ts';

/** All civilian styles are shared by near/crowd renderers; gallery extras load on demand. */
export const cityAssetIds = [...new Set([
  ...Object.values(CORE_MODELS),...CITIZEN_MODELS,
  ...['book','books','chair','chessboard','lamp','plant','shelf','table','monitor','keyboard','mouse'].map(key=>'supplied/props/'+key),
  'gobkit-animal/corgi','gobkit-animal007/quail','gobkit-animal007/chick',
  ...['car-sedan', 'car-hatchback', 'car-taxi', 'display-bread', 'display-fruit', 'bin'].map(key => resolveModel(key)!).filter(Boolean),
  'commercial/building-a', 'commercial/building-b', 'commercial/building-c', 'commercial/building-skyscraper-a', 'commercial/detail-parasol-a',
  'suburban/building-type-a', 'suburban/building-type-b', 'suburban/building-type-c', 'suburban/tree-large', 'suburban/tree-small',
  'watercraft/boat-fishing-small', 'watercraft/boat-row-small', 'watercraft/boat-house-a', 'watercraft/buoy',
  'trains/railroad-straight', 'trains/train-tram-modern', 'roads/traffic-light',
])];
