import { distance, type Actor, type Point } from "../life.ts";
import { petOwners } from "../living/pets.ts";
import { nearestWalkable } from "./walk-ground.ts";
import type { World } from "../world";
type GroundPose = { position: Point; heading: number };

/** Requests ground goals; never replaces an animal's actual position or policy. */
export class PetWalkDirector {
  private waiting = new Set<string>();
  reset() { this.waiting.clear(); }
  frame(world: World, actors: Actor[], pets: Actor[], ground: Map<string, GroundPose>) {
    const goals = new Map<string, Point>(), links = new Map<string, string>(), holds = new Set<string>();
    const owners = petOwners(world), groups = new Map<string, Actor[]>();
    for (const pet of pets) {
      const owner = actors.find(a => a.id === owners[pet.id] && a.kind === "walk-pet" && (!a.transport || a.transport === "walk"));
      if (!owner) continue;
      groups.set(owner.id, [...(groups.get(owner.id) ?? []), pet]); links.set(pet.id, owner.id);
    }
    for (const [ownerId, companions] of groups) {
      const owner = actors.find(a => a.id === ownerId)!, pose = ground.get(ownerId) ?? { position: owner.position, heading: 0 };
      const gaps = companions.map(p => distance(pose.position, ground.get(p.id)?.position ?? p.position));
      if (gaps.some(d => d > 40)) this.waiting.add(ownerId);
      else if (gaps.every(d => d < 25)) this.waiting.delete(ownerId);
      if (this.waiting.has(ownerId)) holds.add(ownerId);
      companions.sort((a,b) => a.id.localeCompare(b.id)).forEach((pet, i) => {
        const side = companions.length > 1 ? (i ? 1 : -1) * 12 : 10;
        goals.set(pet.id, nearestWalkable([
          pose.position[0] - Math.sin(pose.heading) * 16 + Math.cos(pose.heading) * side,
          pose.position[1] - Math.cos(pose.heading) * 16 - Math.sin(pose.heading) * side,
        ]));
      });
    }
    for (const id of this.waiting) if (!groups.has(id)) this.waiting.delete(id);
    return { goals, links, holds };
  }
}
