/** Synthetic browser-only fixture; writes no database or production state. */
import { seed } from "../lib/world.ts";
import { initializeLiving } from "../lib/living/engine.ts";
import { actorsAt } from "../lib/life.ts";
import { socialFrame } from "../lib/living/social.ts";
import { worldTime, weatherAt } from "../lib/clock.ts";
import { groundObstacles } from "../lib/city/walkability.ts";
const now = Date.now(), world = structuredClone(seed);
world.born = "2026-10-24T17:00:00.000Z";
world.living = initializeLiving(now);
const setup = simMs => {
  world.clock = { scale: 1, pausedAt: null, pausedMs: 0, anchors: [{ realMs: now, simMs, scale: 1 }] };
  for (const p of world.people) p.plan = { createdAt: new Date(now - 60000).toISOString(), simStartedAt: simMs - 60000, pausedMs: 0, from: "Xưởng sáng tạo", generator: "rules", steps: [{ location: "Xưởng sáng tạo", activity: "Cùng xem cách sắp xếp dụng cụ", kind: "work", duration: 180 }] };
};
for (let n = 0; n < 228; n++) {
  setup(43200000 + n * 1000);
  const frame = socialFrame(world, actorsAt(world, now), [], now);
  if (frame.exchanges.some(e => e.a === "an" && e.speech.key.endsWith(":0"))) break;
}
if (process.argv.includes("--motion")) {
  setup(43200000);
  world.people[0].plan = { createdAt: new Date(now).toISOString(), simStartedAt: 43199000, pausedMs: 0, from: "Phòng An", steps: [{ location: "Phòng Bình", activity: "Ghé thăm Bình", kind: "social", duration: 180 }] };
}
console.log(JSON.stringify({ world, events: [], revision: 1, serverNow: new Date(now).toISOString(), obstacles: groundObstacles, weatherState: { ...weatherAt(world.born, worldTime(world, now)), label: "Cảnh thử nghiệm · mô phỏng" } }));
