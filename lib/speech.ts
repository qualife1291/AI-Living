import type { World, EpisodeEvent } from "./world";
import { nearby, contextualLine, simulationTime, type Actor } from "./life.ts";

export type Speech = {
  speaker: string;
  text: string;
  source: "ai" | "routine";
  key: string;
};

export function wrapSpeech(text: string, max = 36): string[] {
  const lines: string[] = [];
  let current = "";
  const words = text
    .trim()
    .split(/\s+/)
    .flatMap((w) =>
      w.length > max ? (w.match(new RegExp(`.{1,${max}}`, "gu")) ?? [w]) : [w],
    );

  for (const word of words) {
    if (current.length + word.length + 1 > max && current) {
      lines.push(current);
      current = word;
    } else {
      current += (current ? " " : "") + word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function speechAt(
  world: World,
  actors: Actor[],
  events: Pick<
    EpisodeEvent,
    "id" | "source" | "createdAt" | "dialogue" | "simStartedAt"
  >[],
  now: number,
): Speech | null {
  const wall = world.clock?.pausedAt ?? now;
  for (const e of events) {
    if (e.source !== "ai") continue;
    const elapsed =
      e.simStartedAt !== undefined
        ? (simulationTime(world, now) - e.simStartedAt) / 1000
        : (wall - Date.parse(e.createdAt)) / 1000;
    if (elapsed < 0 || elapsed > 1206) continue;
    for (let index = 0; index < (e.dialogue?.length ?? 0); index++) {
      const d = e.dialogue[index];
      const a = actors.find((actor) => actor.id === d.speaker);
      if (
        a &&
        !a.walking &&
        typeof d.atSecond === "number" &&
        elapsed >= d.atSecond &&
        elapsed < d.atSecond + 6 &&
        (!d.location || d.location === a.location)
      ) {
        return {
          speaker: a.id,
          text: d.text,
          source: "ai",
          key: `${e.id}-${index}`,
        };
      }
    }
  }

  const elapsed = simulationTime(world, now) / 1000;
  const slot = Math.floor(elapsed / 9);
  if (elapsed % 9 > 7) return null;

  const pairs = actors.filter((a) =>
    actors.some((b) => a.id !== b.id && nearby(a, b)),
  );
  if (!pairs.length) return null;

  const a = pairs[slot % pairs.length];
  const b = actors.find((peer) => a.id !== peer.id && nearby(a, peer))!;
  return {
    speaker: a.id,
    text: contextualLine(a, b, Math.floor(slot / pairs.length)),
    source: "routine",
    key: `routine-${slot}-${a.id}`,
  };
}

export function bubbleOffset(
  position: [number, number],
  view: string,
  text: string,
): [number, number] | null {
  const [x, y, w, h] = view.split(" ").map(Number);
  const [px, py] = position;
  if (px < x || px > x + w || py < y || py > y + h) return null;

  const height = wrapSpeech(text).length * 15 + 31;
  const left = Math.max(x + 8, Math.min(x + w - 256, px - 124));
  const proposed = py - 109 - height;
  const top = Math.max(y + 8, Math.min(y + h - height - 8, proposed));
  return [left - (px - 124), top - proposed];
}
