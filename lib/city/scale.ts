/** One world unit = 10cm. Rendering proportions, independent from route timing. */
export const METERS = 10;
export const HUMAN_SCALE = 17.5 / 40;
export const VEHICLES = {
  car: { width: 18, height: 14, length: 44 },
  bus: { width: 24, height: 29, length: 100 },
  metro: { width: 28, height: 32, length: 120 },
};
export type Quality = 'eco' | 'balanced' | 'sharp';
export function pixelRatio(quality: Quality = 'balanced', dpr = 1) {
  return Math.max(1, Math.min(dpr, quality === 'eco' ? 1 : quality === 'sharp' ? 2.5 : 1.75));
}
