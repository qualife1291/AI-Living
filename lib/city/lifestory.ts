import { hashSeed, computeSimMs } from "../clock.ts";
import type { World } from "../world";
/** Fictional adult baseline; age advances with the same simulation clock as movement. */
export function lifeStory(world: World, id: string, now: number) {
  const resident = world.living?.residents.find((p) => p.id === id);
  const since = resident ? Date.parse(`${resident.arrivedOn}T00:00:00+07:00`) : Date.parse(world.born);
  const startSim = resident ? computeSimMs(world.born, world.clock, Math.max(since, Date.parse(world.born))) : 0;
  const days = Math.max(0, Math.floor((computeSimMs(world.born, world.clock, now) - startSim) / 86400000));
  const baseline = 20 + hashSeed(id) % 25;
  const age = baseline + Math.floor(days / 365.25);
  const agent = world.living?.learning?.[id];
  return { age, baseline, days, arrivedOn: resident?.arrivedOn ?? world.born.slice(0, 10), samples: agent?.samples ?? 0,
    chapter: !agent?.samples ? "Những ngày đầu" : agent.samples < 20 ? "Làm quen nhịp sống" : agent.samples < 100 ? "Tích lũy trải nghiệm" : "Xây dựng thói quen",
    memories: agent?.memories ?? resident?.memories ?? world.people.find((p) => p.id === id)?.memories ?? [] };
}
export function interiorKind(name: string) {
  return /quán|bếp|chợ|ăn/i.test(name) ? "dining" : /viện|học|trường/i.test(name) ? "study" : /khám|viện phục hồi/i.test(name) ? "clinic" : /phòng |dân cư/i.test(name) ? "home" : "work";
}
export function interiorPhase(seconds: number) {
  const t = ((seconds % 120) + 120) % 120;
  return { floor: t < 40 ? 0 : t < 80 ? 1 : 2, liftY: t < 30 ? 0 : t < 40 ? (t - 30) / 10 : t < 70 ? 1 : t < 80 ? 1 + (t - 70) / 10 : t < 110 ? 2 : 2 * (1 - (t - 110) / 10), doorsOpen: t % 40 < 25 };
}
