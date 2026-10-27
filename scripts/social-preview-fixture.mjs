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
const detail = process.argv.find(arg => arg.startsWith("--detail="))?.split("=")[1];
const detailPlaces = { read: ["Thư viện", "read", "Đọc và ghi lại một trang sách"], garden: ["Vườn nhỏ", "garden", "Chăm từng chậu rau trong vườn"], eat: ["Quán cà phê", "eat", "Nghỉ tay với tách nước"], market: ["Chợ nhỏ", "social", "Cùng xem các món cho bữa cơm"] };
for (const kind of ["drink", "run", "jump", "tag", "cycle", "exercise", "walk-pet", "shop", "study"]) detailPlaces[kind] = [kind === "shop" ? "Chợ nhỏ" : kind === "study" ? "Thư viện" : "Công viên", kind, `Kiểm thử hoạt động ${kind}`];
if (detailPlaces[detail]) {
  setup(43200000);
  const [location, kind, activity] = detailPlaces[detail];
  for (const p of world.people) p.plan = { ...p.plan, from: location, steps: [{ location, kind, activity, duration: 3600 }] };
}
console.log(JSON.stringify({ world, events: [], revision: 1, serverNow: new Date(now).toISOString(), obstacles: groundObstacles, weatherState: { ...weatherAt(world.born, worldTime(world, now)), label: "Cảnh thử nghiệm · mô phỏng" } }));
