/** QA scenic-only groves outside the playable northern road/venue graph.
 * Never add these to sceneryObstacles, walkability, ground-truth actor data,
 * fauna population, world persistence or learned ecology samples.
 * The renderer reuses its existing instanced tree batches.
 */
export type ScenicGrove = Readonly<{ x: number; z: number; seed: number }>;
export const scenicGroves: readonly ScenicGrove[] = Object.freeze(
  Array.from({ length: 48 }, (_, i) => ({
    x: 145 + (i % 16) * 145 + ((i * 17) % 27 - 13),
    z: -455 + Math.floor(i / 16) * 58 + ((i * 13) % 19 - 9),
    seed: i + 500,
  })),
);
