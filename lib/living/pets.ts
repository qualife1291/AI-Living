import type { World } from "../world";
export const DEFAULT_PET_OWNERS: Record<string, string> = { cun: "an", muop: "chi" };
export function petOwners(world: World): Record<string, string> {
  const people = new Set([...world.people, ...(world.living?.residents ?? [])].map(p => p.id));
  return Object.fromEntries(Object.entries(world.living?.petOwners ?? DEFAULT_PET_OWNERS)
    .filter(([pet, owner]) => ["cun", "muop"].includes(pet) && people.has(owner)));
}
