import { socialCategory } from "./action-presentation.ts";
import { DialogueGrammar } from "./dialogue-grammar.ts";
import scripts from "../../data/social-scenes.json" with { type: "json" };
import { distance, places, simulationTime, type Actor, type Point } from "../life.ts";
import { hashSeed, worldTime } from "../clock.ts";
import { speechAt, type Speech } from "../speech.ts";
import type { World, EpisodeEvent } from "../world";

export type SocialPose = { peerId: string; gesture: string; speaking: boolean; source: "script" | "ai" };
export type Exchange = { a: string; b: string; title: string; speech: Speech; source: "script" | "ai" };
export const SOCIAL_TIMING = { minimumLineSeconds: 2.4, maximumLineSeconds: 4, gapSeconds: .3, minimumCooldownSeconds: 20, maximumCooldownSeconds: 45 } as const;
export const spokenSeconds = (text: string) => Math.max(SOCIAL_TIMING.minimumLineSeconds, Math.min(SOCIAL_TIMING.maximumLineSeconds, .8 + text.length / 30));

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
      const candidates = scripts.scenes.filter(s => s.places.includes(a.location) && (s.kinds.includes(socialCategory(a.kind)) || s.kinds.includes(socialCategory(b.kind))));
      if (!candidates.length) continue;
      const key = `${a.location}:${a.id}:${b.id}`, hash = hashSeed(key);
      const scene = candidates[hash % candidates.length];
      const duration = scene.turns.reduce((total, turn) => total + spokenSeconds(turn.text) + SOCIAL_TIMING.gapSeconds, 0);
      const cycle = duration + SOCIAL_TIMING.minimumCooldownSeconds + hash % 26, slot = Math.floor((seconds + hash % cycle) / cycle), phase = (seconds + hash % cycle) % cycle;
      // Reserve this pair even through its quiet interval: no swapping partners mid-scene.
      poses.set(a.id, { peerId: b.id, gesture: "idle", speaking: false, source: "script" });
      poses.set(b.id, { peerId: a.id, gesture: "idle", speaking: false, source: "script" });
      let cursor = 0;
      for (let i = 0; i < scene.turns.length; i++) {
        const turn = scene.turns[i];
        const duration = spokenSeconds(turn.text);
        if (phase >= cursor && phase < cursor + duration + SOCIAL_TIMING.gapSeconds) {
          // A new arrival waits for the next opening instead of starting on a reply.
          if (phase - cursor < duration && phase <= Math.min(a.stationaryFor ?? Infinity, b.stationaryFor ?? Infinity)) {
            const speaker = turn.speaker === "a" ? a : b;
            claim(a, b, { speaker: speaker.id, text: format(turn.text, a, b), source: "routine", key: `${key}:${slot}:${i}` }, scene.title, "script", turn.gesture);
          }
          break;
        }
        cursor += duration + SOCIAL_TIMING.gapSeconds;
      }
    }
  }
  return { actors: spaced, poses, exchanges };
}

type EncounterLine = { speaker: string; text: string; gesture?: string };
type Encounter = { key: string; speechPrefix: string; a: string; b: string; location: string; title: string; source: "script" | "ai"; lines: EncounterLine[]; lineIndex: number; lineStartedAt: number; presentedIndex: number; cooldown: number };
type Frame = ReturnType<typeof socialFrame>;

/** Viewer-local presentation state. Keep this instance across world polling.
 * Navigation and history remain authoritative; only readable dialogue uses wall
 * seconds so a slow simulation does not hold one sentence for minutes. */
export class SocialDirector {
  private encounters = new Map<string, Encounter>();
  private cooldowns = new Map<string, number>();
  private seen = new Set<string>();
  private sceneNumber = 0;
  private grammar = new DialogueGrammar();
  private elapsed = 0;
  private previousNow: number | undefined;
  private previousSim: number | undefined;
  private previouslyPaused = false;
  private born: string | undefined;

  /** Start reading time after the renderer has delivered this line to the HUD. */
  presented(key: string, now: number) {
    for (const e of this.encounters.values()) if (`${e.speechPrefix}-${e.lineIndex}` === key && e.presentedIndex !== e.lineIndex) {
      e.presentedIndex = e.lineIndex;
      e.lineStartedAt = Math.max(e.lineStartedAt, this.elapsed + Math.max(0, now - (this.previousNow ?? now)) / 1000);
    }
  }

  reset() {
    this.encounters.clear(); this.cooldowns.clear(); this.seen.clear(); this.grammar.reset();
    this.sceneNumber = 0; this.elapsed = 0; this.previousNow = undefined;
    this.previousSim = undefined; this.previouslyPaused = false; this.born = undefined;
  }

  frame(world: World, actors: Actor[], events: EpisodeEvent[], now: number, _legacyLivingSpeech: Speech | null = null, alreadySpaced = false): Frame {
    void _legacyLivingSpeech; // Compatibility argument: the whole stored dialogue is authoritative.
    const sim = simulationTime(world, now);
    if (this.born !== undefined && (this.born !== world.born || (this.previousSim !== undefined && sim < this.previousSim - 1000))) this.reset();
    this.born = world.born;
    if (this.previousNow !== undefined && !this.previouslyPaused) {
      const until = world.paused ? Math.min(now, world.clock?.pausedAt ?? this.previousNow) : now;
      this.elapsed += Math.max(0, until - this.previousNow) / 1000;
    }
    this.previousNow = now; this.previousSim = sim; this.previouslyPaused = world.paused;
    const spaced = alreadySpaced ? actors : spaceActors(world, actors), byId = new Map(spaced.map(a => [a.id, a]));
    const poses = new Map<string, SocialPose>(), exchanges: Exchange[] = [];
    const hour = worldTime(world, now).hour, awake = hour >= 6 && hour < 22;
    const eligible = (a: Actor | undefined): a is Actor => !!a && !a.walking && (a.transport === undefined || a.transport === "walk") && !/^Phòng |Bệnh viện|Phòng khám/.test(a.location);
    const pairAvailable = (a: Actor | undefined, b: Actor | undefined, maximum = 60) => eligible(a) && eligible(b) && a.id !== b.id && a.location === b.location && distance(a.position, b.position) <= maximum;
    const finish = (encounter: Encounter) => {
      this.encounters.delete(encounter.key);
      for (const id of [encounter.a, encounter.b]) this.cooldowns.set(id, this.elapsed + encounter.cooldown);
    };
    for (const encounter of this.encounters.values()) {
      const a = byId.get(encounter.a), b = byId.get(encounter.b);
      if (!awake || !pairAvailable(a, b) || a?.location !== encounter.location) { finish(encounter); continue; }
      const duration = spokenSeconds(encounter.lines[encounter.lineIndex].text) + SOCIAL_TIMING.gapSeconds;
      if (this.elapsed - encounter.lineStartedAt >= duration) {
        if (encounter.lineIndex === encounter.lines.length - 1) { finish(encounter); continue; }
        encounter.lineIndex++;
        const nextStart = encounter.lineStartedAt + duration;
        // A late frame must show the next reply before consuming its reading time.
        encounter.lineStartedAt = this.elapsed - nextStart > .2 ? this.elapsed : nextStart;
      }
    }
    const locked = (id: string) => [...this.encounters.values()].some(e => e.a === id || e.b === id);
    const start = (key: string, speechPrefix: string, a: Actor, b: Actor, title: string, source: Encounter["source"], lines: EncounterLine[]) => {
      const hash = hashSeed(key);
      this.encounters.set(key, { key, speechPrefix, a: a.id, b: b.id, location: a.location, title, source, lines, lineIndex: 0, lineStartedAt: this.elapsed, presentedIndex: -1,
        cooldown: SOCIAL_TIMING.minimumCooldownSeconds + hash % 26 });
    };
    const startStored = (key: string, prefix: string, title: string, source: Encounter["source"], lines: EncounterLine[], location?: string) => {
      if (this.seen.has(key) || lines.length < 2) return;
      const ids = [...new Set(lines.map(line => line.speaker))];
      if (ids.length !== 2) return;
      const a = byId.get(ids[0]), b = byId.get(ids[1]);
      if (!pairAvailable(a, b) || !a || !b || (location && a.location !== location)) return;
      const occupied = [...this.encounters.values()].filter(e => [e.a, e.b].some(id => ids.includes(id)));
      // A stored AI scene can replace ambient staging. Another stored scene waits
      // for the existing reply sequence rather than cutting it after one line.
      if (occupied.some(e => e.source === "ai") || (source !== "ai" && occupied.length)) return;
      for (const encounter of occupied) finish(encounter);
      this.seen.add(key);
      start(key, prefix, a, b, title, source, lines);
      if (this.seen.size > 512) this.seen.delete(this.seen.values().next().value!);
    };
    if (awake && !world.paused) {
      // Read the whole persisted dialogue once; one-line legacy display windows
      // must not select a new partner or reset playback after every poll.
      for (const event of events) {
        if (event.source !== "ai" || !event.dialogue?.length) continue;
        const eventElapsed = event.simStartedAt !== undefined ? (sim - event.simStartedAt) / 1000 : (now - Date.parse(event.createdAt)) / 1000;
        const scheduled = event.dialogue.map(line => line.atSecond).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
        const opening = scheduled.length ? Math.min(...scheduled) : 0;
        const last = scheduled.length ? Math.max(...scheduled) : opening;
        if (eventElapsed < opening || eventElapsed > Math.max(opening + 120, last + 6)) continue;
        const locations = [...new Set(event.dialogue.map(line => line.location).filter(Boolean))];
        if (locations.length > 1) continue;
        startStored(`event:${event.id}`, event.id, event.title, "ai", event.dialogue, locations[0]);
      }
      const turn = world.livingTurn;
      if (turn?.dialogue?.length && turn.simStartedAt !== undefined) {
        const age = (sim - turn.simStartedAt) / 1000;
        if (age >= 0 && age <= 180) startStored(`living:${turn.id}`, turn.id, turn.title, turn.generator === "local-llm" ? "ai" : "script", turn.dialogue, turn.location);
      }
      const idle = spaced.filter(a => eligible(a) && !locked(a.id) && (this.cooldowns.get(a.id) ?? 0) <= this.elapsed).sort((a, b) => a.id.localeCompare(b.id));
      for (const a of idle) {
        if (locked(a.id)) continue;
        const b = idle.filter(b => !locked(b.id) && pairAvailable(a, b, scripts.maxPairDistance) && distance(a.position, b.position) >= scripts.minPairDistance - .1)
          .sort((x, y) => distance(a.position, x.position) - distance(a.position, y.position) || x.id.localeCompare(y.id))[0];
        if (!b) continue;
        const candidates = scripts.scenes.filter(s => s.places.includes(a.location) && (s.kinds.includes(socialCategory(a.kind)) || s.kinds.includes(socialCategory(b.kind))));
        if (!candidates.length) continue;
        const pairKey = `${a.location}:${a.id}:${b.id}`, serial = this.sceneNumber++, script = candidates[(hashSeed(pairKey) + serial) % candidates.length];
        start(`ambient:${pairKey}:${serial}`, `${pairKey}:${serial}`, a, b, script.title, "script", this.grammar.lines(a, b, a.location, serial, script.turns.length));
      }
    }
    for (const encounter of this.encounters.values()) {
      const line = encounter.lines[encounter.lineIndex];
      const speaking = this.elapsed - encounter.lineStartedAt < spokenSeconds(line.text) ? { line, index: encounter.lineIndex } : undefined;
      for (const [id, peerId] of [[encounter.a, encounter.b], [encounter.b, encounter.a]]) poses.set(id, { peerId, source: encounter.source,
        speaking: speaking?.line.speaker === id, gesture: speaking ? speaking.line.speaker === id ? speaking.line.gesture ?? "explain" : "listen" : "listen" });
      if (speaking) exchanges.push({ a: encounter.a, b: encounter.b, title: encounter.title, source: encounter.source,
        speech: { speaker: speaking.line.speaker, text: speaking.line.text, source: encounter.source === "ai" ? "ai" : "routine", key: `${encounter.speechPrefix}-${speaking.index}` } });
    }
    for (const [id, until] of this.cooldowns) if (until < this.elapsed - 60) this.cooldowns.delete(id);
    return { actors: spaced, poses, exchanges };
  }
}
