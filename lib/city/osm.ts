export type OsmFeature = { id: string; kind: string; name: string; category: string; points: number[][]; heightM?: number | null; levels?: number | null };
/** OSM geometry is observed; missing heights remain explicitly estimated. */
export function buildingHeight(feature: OsmFeature) {
  if (typeof feature.heightM === 'number' && Number.isFinite(feature.heightM) && feature.heightM > 0 && feature.heightM <= 1000) return { meters: feature.heightM, source: 'height-tag' as const };
  if (typeof feature.levels === 'number' && Number.isFinite(feature.levels) && feature.levels > 0 && feature.levels <= 200) return { meters: feature.levels * 3.2, source: 'levels-estimate' as const };
  return { meters: 12, source: 'default-estimate' as const };
}
export function closedFootprint(feature: OsmFeature) {
  const p = feature.points;
  return feature.kind === 'building' && p.length >= 4 && p.every(v => v.length === 2 && v.every(Number.isFinite)) && p[0][0] === p.at(-1)![0] && p[0][1] === p.at(-1)![1];
}
