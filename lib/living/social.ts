import scripts from "../../data/social-scenes.json" with { type: "json" };
import { distance, places, simulationTime, type Actor, type Point } from "../life.ts";
import { hashSeed, worldTime } from "../clock.ts";
import { speechAt, type Speech } from "../speech.ts";
import type { World, EpisodeEvent } from "../world";

export type SocialPose = { peerId: string; gesture: string; speaking: boolean; source: "script" | "ai" };
export type Exchange = { a: string; b: string; title: string; speech: Speech; source: "script" | "ai" };

/** A stable frontage slot, in metres × 10. No two visible residents share a slot.
 * This is visual staging, not a change to the durable navigation/history model. */
function actorOrdinal(world: World, id: string) {
  const core = world.people.findIndex(p => p.id === id);
  return core >= 0 ? core : world.people.length + Math.max(0, world.living?.residents.findIndex(p => p.id === id) ?? 0);
}
export function standingOffset(world: World, id: string, reservedIndex?: number): Point {
  const original = actorOrdinal(world, id);
  // Slots63–71 are reserved for focused/turn partners beyond the visible cohort.
  const ordinal = reservedIndex ?? (original < 63 ? original : 63 + original % 9);
  const columns = [0, -1, 1, -2, 2, -3, 3];
  return [columns[ordinal % 7] * 14, Math.floor(ordinal / 7) * 14];
}

export function spaceActors(world: World, actors: Actor[]): Actor[] {
  const late = actors.filter(a => actorOrdinal(world, a.id) >= 63).map(a => a.id).sort();
  return actors.map(actor => {
    // Undo the legacy renderer offsets. Keep the simulation API/plan origins intact.
    const core = world.people.findIndex(p => p.id === actor.id), jitter = hashSeed(actor.id);
    const old: Point = core >= 0 ? [(core - 1) * 25, core * 7] : [((jitter % 9) - 4) * 7, ((Math.floor(jitter / 9) % 7) - 3) * 5];
    const raw: Point = [actor.position[0] - old[0], actor.position[1] - old[1]], offset = standingOffset(world, actor.id, late.includes(actor.id) ? 63 + late.indexOf(actor.id) : undefined);
    const first = actor.path[0] ?? places[actor.from] ?? raw, last = actor.path.at(-1) ?? places[actor.location] ?? raw;
    // Ease into/out of the same slot. No position jump when walking becomes idle.
    const weight = actor.walking ? Math.min(1, Math.max(0, 1 - distance(raw, first) / 80) + Math.max(0, 1 - distance(raw, last) / 80)) : 1;
    return { ...actor, position: [raw[0] + offset[0] * weight, raw[1] + offset[1] * weight] };
  });
}

const format = (text: string, a: Actor, b: Actor) => text.replaceAll("{a}", a.name).replaceAll("{b}", b.name);

/** One shared simulation timeline drives speech, turns, facing and gestures in 2D/3D.
 * Ambient scenes were authored by development agents; they are explicitly scripts.
 * Persisted model events keep their distinct AI provenance and take priority. */
export function socialFrame(world: World, actors: Actor[], events: EpisodeEvent[], now: number, livingSpeech: Speech | null = null) {
  const spaced = spaceActors(world, actors), poses = new Map<string, SocialPose>(), exchanges: Exchange[] = [];
  const seconds = simulationTime(world, now) / 1000;
  const claim = (a: Actor, b: Actor, speech: Speech, title: string, source: "script" | "ai", gesture = "explain") => {
    poses.set(a.id, { peerId: b.id, gesture: speech.speaker === a.id ? gesture : "listen", speaking: speech.speaker === a.id, source });
    poses.set(b.id, { peerId: a.id, gesture: speech.speaker === b.id ? gesture : "listen", speaking: speech.speaker === b.id, source });
    exchanges.push({ a: a.id, b: b.id, speech, title, source });
  };
  const eventSpeech = speechAt(world, spaced, events, now);
  const aiEvent = eventSpeech?.source === "ai" ? events.find(e => e.dialogue?.some((_, i) => eventSpeech.key === `${e.id}-${i}`)) : undefined;
  const persisted = aiEvent ? eventSpeech : livingSpeech;
  if (persisted && (livingSpeech || persisted.source === "ai")) {
    const a = spaced.find(a => a.id === persisted.speaker && !a.walking);
    const lineIndex = aiEvent?.dialogue?.findIndex((_, i) => persisted.key === `${aiEvent.id}-${i}`) ?? -1;
    const otherSpeaker = aiEvent ? [...aiEvent.dialogue.slice(lineIndex + 1), ...aiEvent.dialogue.slice(0, lineIndex)].find(d => d.speaker !== persisted.speaker)?.speaker : persisted.speaker === "an" ? world.livingTurn?.residentId : "an";
    const b = a && spaced.find(b => b.id === otherSpeaker && !b.walking && a.location === b.location && distance(a.position, b.position) <= 60);
    if (a && b) claim(a, b, persisted, aiEvent?.title ?? world.livingTurn?.title ?? "Chuyện trong xóm", persisted.source === "ai" ? "ai" : "script");
  }
  const hour = worldTime(world, now).hour;
  if (hour >= scripts.quietHours[1] && hour < scripts.quietHours[0]) {
    const idle = spaced.filter(a => !a.walking && !/^Phòng |Bệnh viện|Phòng khám/.test(a.location)).sort((a, b) => a.id.localeCompare(b.id));
    for (const a of idle) {
      if (poses.has(a.id)) continue;
      const b = idle.filter(b => b.id !== a.id && !poses.has(b.id) && b.location === a.location && distance(a.position, b.position) >= scripts.minPairDistance - .1 && distance(a.position, b.position) <= scripts.maxPairDistance).sort((x, y) => distance(a.position, x.position) - distance(a.position, y.position) || x.id.localeCompare(y.id))[0];
      if (!b) continue;
      const candidates = scripts.scenes.filter(s => s.places.includes(a.location) && (s.kinds.includes(a.kind) || s.kinds.includes(b.kind)));
      if (!candidates.length) continue;
      const key = `${a.location}:${a.id}:${b.id}`, hash = hashSeed(key);
      const cycle = scripts.cooldownSeconds + 48, slot = Math.floor((seconds + hash % cycle) / cycle), phase = (seconds + hash % cycle) % cycle;
      const scene = candidates[(hash + slot) % candidates.length];
      // Reserve this pair even through its quiet interval: no swapping partners mid-scene.
      poses.set(a.id, { peerId: b.id, gesture: "idle", speaking: false, source: "script" });
      poses.set(b.id, { peerId: a.id, gesture: "idle", speaking: false, source: "script" });
      let cursor = 0;
      for (let i = 0; i < scene.turns.length; i++) {
        const turn = scene.turns[i];
        if (phase >= cursor && phase < cursor + turn.seconds) {
          // A new arrival waits for the next opening instead of starting on a reply.
          if (phase - cursor < turn.seconds - 1 && phase <= Math.min(a.stationaryFor ?? Infinity, b.stationaryFor ?? Infinity)) {
            const speaker = turn.speaker === "a" ? a : b;
            claim(a, b, { speaker: speaker.id, text: format(turn.text, a, b), source: "routine", key: `${key}:${slot}:${i}` }, scene.title, "script", turn.gesture);
          }
          break;
        }
        cursor += turn.seconds;
      }
    }
  }
  return { actors: spaced, poses, exchanges };
}
