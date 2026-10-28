import { distance, places, type Actor, type Point } from "../life.ts";
import { nearestWalkable, segmentWalkable, walkable, WALK_RADIUS } from "./walk-ground.ts";
import {tagStateSchema} from './director-state.ts';

export type TagRole = { peerId: string; role: "chaser" | "runner"; swaps: number };
type Directive = TagRole & { goal: Point; speed: number };
type Pair = { a: string; b: string; location: string; chaser: string; grace: number; armed: boolean; swaps: number; goal: Point; runner: string };
export const TAG_REACH = WALK_RADIUS * 2 + 4;

/** Viewer-local play, using actual ground positions, never projected arrivals.
 * This requests goals only: WalkDirector still owns movement and all collisions. */
export class TagDirector {
  private pairs = new Map<string, Pair>();
  reset() { this.pairs.clear(); }
  exportState() { return structuredClone([...this.pairs]); }
  restoreState(value:unknown) {
    const entries=tagStateSchema.parse(value);
    if(new Set(entries.map(([key])=>key)).size!==entries.length||entries.some(([key,p])=>key!==JSON.stringify([p.a,p.b])||p.a===p.b||![p.a,p.b].includes(p.chaser)||![p.a,p.b].includes(p.runner)))throw Error('Invalid tag checkpoint');
    this.pairs=new Map(entries);
  }

  frame(actors: Actor[], dt: number): Map<string, Directive> {
    const active = new Map(actors.filter(a => a.kind === "tag" &&
      ["Công viên", "Sân thể thao"].includes(a.location)).map(a => [a.id, a]));
    for (const [key, pair] of this.pairs) {
      if (![pair.a, pair.b].every(id => active.get(id)?.location === pair.location)) this.pairs.delete(key);
    }
    const used = new Set([...this.pairs.values()].flatMap(p => [p.a, p.b]));
    if (dt > 0) {
      const ready = [...active.values()].filter(a => !a.walking &&
        distance(a.position, places[a.location]) <= 80).sort((a, b) => a.id.localeCompare(b.id));
      for (const a of ready) {
        if (used.has(a.id)) continue;
        const b = ready.find(b => !used.has(b.id) && a.id !== b.id && a.location === b.location &&
          distance(a.position, b.position) <= 65 && segmentWalkable(a.position, b.position));
        if (!b) continue;
        const key = JSON.stringify([a.id, b.id]);
        this.pairs.set(key, { a: a.id, b: b.id, location: a.location, chaser: a.id,
          runner: b.id, goal: [...b.position], grace: 1, armed: true, swaps: 0 });
        used.add(a.id); used.add(b.id);
      }
    }
    const result = new Map<string, Directive>();
    for (const pair of this.pairs.values()) {
      pair.grace = Math.max(0, pair.grace - dt);
      const a = active.get(pair.a)!, b = active.get(pair.b)!;
      const gap = distance(a.position, b.position);
      if (dt > 0 && gap > TAG_REACH + 3) pair.armed = true;
      if (dt > 0 && pair.armed && !pair.grace && gap <= TAG_REACH && segmentWalkable(a.position, b.position)) {
        pair.chaser = pair.chaser === a.id ? b.id : a.id;
        pair.swaps++; pair.grace = 1.6; pair.armed = false;
      }
      const chaser = pair.chaser === a.id ? a : b, runner = chaser === a ? b : a;
      if (dt > 0 && (pair.runner !== runner.id || distance(runner.position, pair.goal) < 3 || pair.swaps === 0 && distance(pair.goal, runner.position) < .1)) {
        const center = nearestWalkable(places[pair.location]);
        const candidates = Array.from({ length: 16 }, (_, i): Point => [
          center[0] + Math.cos(i * Math.PI / 8) * 36,
          center[1] + Math.sin(i * Math.PI / 8) * 36,
        ]).filter(p => walkable(p) && segmentWalkable(runner.position, p) && distance(runner.position, p) > 12);
        candidates.sort((p, q) => distance(q, chaser.position) - distance(p, chaser.position));
        pair.goal = candidates[0] ?? [...runner.position]; pair.runner = runner.id;
      }
      result.set(chaser.id, { peerId: runner.id, role: "chaser", swaps: pair.swaps, goal: [...runner.position], speed: 28 });
      result.set(runner.id, { peerId: chaser.id, role: "runner", swaps: pair.swaps, goal: [...pair.goal], speed: 20 });
    }
    return result;
  }
}
