import { meetingSteps, microActivity, actionSteps } from "./activities.ts";
import { DEFAULT_PET_OWNERS } from "./pets.ts";
import { updateAnimalLearning } from "./animal-learning.ts";
import {
  prepareLearning,
  cohortIds,
  chooseScenario,
  scenarios,
  hasUnfinishedLearning,
} from "./learning.ts";
import defaults from "../../data/living/catalog.json" with { type: "json" };
import socialScripts from "../../data/social-scenes.json" with { type: "json" };
import {
  catalogSchema,
  type LivingCatalog,
  type LivingState,
  type LivingTurn,
  type RealContext,
  type Resident,
} from "./schema.ts";
import { hashSeed, computeSimMs, worldTime } from "../clock.ts";
import { routineFrom } from "../daily-routines.ts";
import {
  transitionPath,
  actorTransition,
  actorsAt,
  nearby,
  project,
  places,
  distance,
  type Actor,
  type Step,
} from "../life.ts";
import type { World } from "../world";

export const defaultCatalog = catalogSchema.parse(defaults);
const DAY = 86400000;
export function localDate(now: number) {
  return new Date(now + 7 * 3600000).toISOString().slice(0, 10);
}
function dayDiff(a: string, b: string) {
  return Math.max(0, Math.floor((Date.parse(b) - Date.parse(a)) / DAY));
}
export function population(state: LivingState, date: string): Resident[] {
  const count = Math.min(
    state.catalog.maxPopulation,
    state.catalog.initialPopulation +
      dayDiff(state.startedOn, date) * state.catalog.newResidentsPerDay,
  );
  const residents = [...state.residents];
  const add = (role: LivingCatalog["roles"][number]) => {
    const i = residents.length;
    residents.push({
      id: `neighbor-${i + 1}`,
      name: `${state.catalog.names[i % state.catalog.names.length]} ${Math.floor(i / state.catalog.names.length) + 1}`,
      roleId: role.id,
      color: ["#8f9bc4", "#98b789", "#d69b79", "#83aeb5", "#b49bc4"][i % 5],
      arrivedOn: date,
      familiarity: 0,
      memories: [],
    });
  };
  for (const role of state.catalog.roles)
    if (
      !residents.some((r) => r.roleId === role.id) &&
      residents.length < state.catalog.maxPopulation
    )
      add(role);
  while (residents.length < count)
    add(state.catalog.roles[residents.length % state.catalog.roles.length]);
  return residents;
}
export function initializeLiving(
  now: number,
  catalog: LivingCatalog = defaultCatalog,
): LivingState {
  const state: LivingState = {
    version: 1,
    startedOn: localDate(now),
    lastTickAt: new Date(now).toISOString(),
    lastTurnId: null,
    residents: [],
    catalog,
    energy: 82,
    hunger: 25,
    social: 60,
    skills: {},
    petOwners: { ...DEFAULT_PET_OWNERS },
    daysExperienced: 1,
  };
  return { ...state, residents: population(state, state.startedOn) };
}
export function turnId(now: number) {
  return `living-v2-${localDate(now)}-${Math.floor(((now + 7 * 3600000) % DAY) / 300000)}`;
}
function chooseRole(state: LivingState, context: RealContext) {
  const roles = state.catalog.roles;
  const id =
    context.hour < 6 || context.hour >= 22
      ? "rest"
      : state.energy < 28
        ? "doctor"
        : state.hunger > 70
          ? "vendor"
          : context.weather.status === "fresh" &&
              (context.weather.precipitation ?? 0) > 0
            ? "librarian"
            : context.calendar.weekend || context.calendar.holidays.length
              ? "neighbor"
              : context.hour < 11
                ? "colleague"
                : context.hour < 16
                  ? "teacher"
                  : "neighbor";
  const novelty = hashSeed(`${context.date}-${Math.floor(context.hour * 4)}`);
  if (
    state.energy >= 28 &&
    state.hunger <= 70 &&
    context.hour >= 6 &&
    context.hour < 22 &&
    !(
      context.weather.status === "fresh" &&
      (context.weather.precipitation ?? 0) > 0
    ) &&
    novelty % 4 === 0
  )
    return roles[Math.floor(novelty / 4) % roles.length];
  return (
    roles.find((r) => r.id === id) ??
    roles[hashSeed(turnId(Date.parse(context.fetchedAt))) % roles.length]
  );
}
export function planLivingTurn(
  world: World,
  context: RealContext,
  now: number,
): { state: LivingState; turn: LivingTurn; world: World; newExperiences: import("./learning").Experience[] } {
  const state = structuredClone(world.living ?? initializeLiving(now));
  // Add new built-in content without overwriting user roles or erasing residents.
  for (const role of defaultCatalog.roles)
    if (
      !state.catalog.roles.some((r) => r.id === role.id) &&
      state.catalog.roles.length < 40
    )
      state.catalog.roles.push(structuredClone(role));
  state.residents = population(state, context.date);
  const newExperiences: import("./learning").Experience[] = [];
  const learning = prepareLearning(world, state, now, (e) => newExperiences.push(e));
  const simNow = computeSimMs(world.born, world.clock, now);
  const anBusy = hasUnfinishedLearning(learning.an, world.people.find(p => p.id === "an")?.plan, simNow);
  state.energy = learning.an.energy;
  state.hunger = learning.an.hunger;
  // Bound the shared social drift; energy/hunger advance per actor in simulation time.
  const minutes = Math.min(
    360,
    Math.max(0, (now - Date.parse(state.lastTickAt)) / 60000),
  );
  const sleeping = context.hour < 6 || context.hour >= 22;
  // prepareLearning advances every actor's own needs once; do not drift An twice.
  state.social = Math.max(0, Math.min(100, state.social - 0.02 * minutes));
  const role = chooseRole(state, context);
  learning.an.energy = state.energy;
  learning.an.hunger = state.hunger;
  const chosen = chooseScenario(learning.an, "an", context, role.place);
  const available = state.residents.filter(r => !hasUnfinishedLearning(learning[r.id], r.plan, simNow));
  const peers = available.filter((r) => r.roleId === role.id);
  const resident =
    (anBusy ? state.residents.find(r => r.id === world.livingTurn?.residentId) : undefined) ?? peers[hashSeed(turnId(now)) % peers.length] ?? available[hashSeed(turnId(now)) % available.length] ?? state.residents[0];
  const encounter = !sleeping && !anBusy && available.some(r => r.id === resident.id);
  const festival =
    !sleeping &&
    state.energy >= 28 &&
    state.hunger <= 70 &&
    context.festivals.status === "fresh"
      ? context.festivals.items?.find(
          (item) =>
            item.startDate <= context.date && item.endDate >= context.date,
        )
      : undefined;
  let location = sleeping ? "Phòng An" : festival ? "Quảng trường" : role.place;
  let activity = festival
    ? `Tìm hiểu ${festival.title.slice(0, 55)}`
    : sleeping
      ? "Sạc pin và nghỉ đêm"
      : state.hunger > 70
        ? "Mua và ăn một bữa nhẹ"
        : role.activity;
  let kind = festival
    ? "social"
    : sleeping
      ? "rest"
      : state.hunger > 70
        ? "eat"
        : role.kind;
  if (!sleeping && !festival && state.energy >= 28 && state.hunger <= 70) {
    location = chosen.place;
    activity = chosen.title;
    kind = chosen.kind as Step["kind"];
  }
  if (anBusy) {
    const current = actorsAt(world, now).find(a => a.id === "an");
    if (current) { location = current.location as typeof location; activity = current.activity; kind = current.kind; }
  }
  const matchingScripts = socialScripts.scenes.filter(s => s.places.includes(location) && s.kinds.includes(kind));
  const script = matchingScripts[hashSeed(turnId(now)) % matchingScripts.length];
  const dialogue = !encounter
    ? []
    : script ? script.turns.map(line => ({ speaker: line.speaker === "a" ? "an" : resident.id, text: line.text.replaceAll("{a}", "An").replaceAll("{b}", resident.name) })) : [
        {
          speaker: "an",
          text: `${resident.name}, mình dành một lát ở ${location.toLowerCase()} cùng bạn nhé?`,
        },
        { speaker: resident.id, text: "Được chứ, mình cùng làm từng việc nhỏ thôi." },
        {
          speaker: "an",
          text: "Vậy mình bắt đầu từ phần đơn giản trước nhé?",
        },
        { speaker: resident.id, text: "Ừ, không cần vội. Xong rồi mình nghỉ một chút." },
      ];
  const turn: LivingTurn = {
    id: turnId(now),
    createdAt: new Date(now).toISOString(),
    date: context.date,
    title: anBusy ? activity : sleeping
      ? "Một đêm yên trong xóm"
      : encounter ? `${activity} cùng ${resident.name}` : activity,
    summary: anBusy ? `An tiếp tục kế hoạch đang làm tại ${location.toLowerCase()}; chưa tạo cuộc gặp mới hoặc ghi nhận kết quả khi chưa hoàn tất.` : sleeping
      ? "An trở về phòng nghỉ. Khu phố vẫn giữ lịch sử và những người đã gặp."
      : encounter ? `An dự định ghé ${location.toLowerCase()} và gặp ${resident.name}, ${role.label.toLowerCase()}. Đây là tình huống hư cấu dựa trên bối cảnh có ghi nguồn.` : `An làm việc riêng tại ${location.toLowerCase()}; những người đang bận tiếp tục kế hoạch của họ.`,
    location,
    activity,
    kind,
    residentId: resident.id,
    dialogue,
    generator: "rules",
    scriptId: encounter ? script?.id : undefined,
    scenarioId: anBusy ? learning.an.pending?.scenarioId : encounter ? "friendship" : !festival
      ? sleeping
        ? "rest-home"
        : state.energy < 28
          ? "hospital-check"
          : state.hunger > 70
            ? "lunch"
            : chosen.id
      : undefined,
    transport: anBusy ? world.people.find(p => p.id === "an")?.plan?.transport : chosen.transport,
    context,
    simStartedAt: computeSimMs(world.born, world.clock, now),
  };
  state.lastTickAt = turn.createdAt;
  state.lastTurnId = turn.id;
  state.daysExperienced = dayDiff(state.startedOn, context.date) + 1;
  const next = structuredClone(world);
  const an = next.people.find((p) => p.id === "an");
  if (an && !anBusy) {
    an.plan = {
      createdAt: turn.createdAt,
      pausedMs: next.clock?.pausedMs ?? 0,
      ...transitionPath(world, "an", now),
      simStartedAt: turn.simStartedAt,
      generator: "rules",
      transport: chosen.transport === "plane" ? "bus" : chosen.transport,
      steps: encounter ? meetingSteps(location, activity) : actionSteps(location, activity, kind),
    };
    an.activity = activity;
  }
  if (encounter) {
    const actor = crowdAt(state, { ...world, livingTurn: turn }, now).find(
      (a) => a.id === resident.id,
    );
    if (actor) {
      const jitter = hashSeed(resident.id);
      const position: [number, number] = [
        actor.position[0] - ((jitter % 9) - 4) * 7,
        actor.position[1] - ((Math.floor(jitter / 9) % 7) - 3) * 5,
      ];
      resident.plan = {
        createdAt: turn.createdAt,
        pausedMs: next.clock?.pausedMs ?? 0,
        simStartedAt: turn.simStartedAt,
        ...actorTransition(actor, position),
        steps: meetingSteps(location, "Trò chuyện cùng An"),
      };
    }
  }
  if (turn.scenarioId && !anBusy)
    learning.an.pending = {
      id: turn.id,
      scenarioId: turn.scenarioId,
      startedSimMs: turn.simStartedAt!,
      durationMs: (an?.plan?.steps.reduce((sum,step)=>sum+step.duration,0) ?? 180) * 1000,
      completed: false,
    };
  const slot = Math.floor(now / 300000);
  for (const id of ["binh", "chi", ...cohortIds(state, slot)]) {
    if (encounter && id === resident.id) continue; // A newly assigned partner keeps its encounter route.
    const agent = learning[id];
    if (!agent) continue;
    const person = next.people.find((p) => p.id === id);
    const npc = state.residents.find((r) => r.id === id);
    if (hasUnfinishedLearning(agent, person?.plan ?? npc?.plan, simNow)) continue;
    const rolePlace = npc
      ? state.catalog.roles.find((r) => r.id === npc.roleId)?.place
      : id === "binh" ? "Thư viện" : id === "chi" ? "Vườn nhỏ" : person?.location;
    const scenario = chooseScenario(agent, id, context, rolePlace);
    const previous = person
      ? actorsAt(world, now).find((a) => a.id === id)
      : crowdAt(state, { ...world, livingTurn: turn }, now).find(
          (a) => a.id === id,
        );
    // Off-screen residents still receive a route based on their last destination.
    const origin = person
      ? transitionPath(world, id, now)
      : previous
        ? actorTransition(previous, [
            previous.position[0] - ((hashSeed(id) % 9) - 4) * 7,
            previous.position[1] - ((Math.floor(hashSeed(id) / 9) % 7) - 3) * 5,
          ])
        : {
            from: npc?.plan?.steps.at(-1)?.location ?? rolePlace ?? "Sân chung",
          };
    const target =
      scenario.id === "rest-home" && person
        ? `Phòng ${person.name}`
        : scenario.id === "rest-home"
          ? "Khu dân cư"
          : scenario.place;
    const plan = {
      createdAt: turn.createdAt,
      pausedMs: next.clock?.pausedMs ?? 0,
      simStartedAt: turn.simStartedAt,
      ...origin,
      generator: "rules" as const,
      transport: scenario.transport === "plane" ? "bus" : scenario.transport,
      steps: actionSteps(target, scenario.title, scenario.kind as Step["kind"]),
    };
    if (person) {
      person.plan = plan;
      person.activity = scenario.title;
    }
    if (npc) npc.plan = plan;
    agent.pending = {
      id: `${turn.id}-${id}`,
      scenarioId: scenario.id,
      startedSimMs: turn.simStartedAt!,
      durationMs: 180000,
      completed: false,
    };
  }
  // Keep each partner's learning tied to an activity that actually has a plan.
  if (resident.plan && encounter) {
    const socialScenario = scenarios.find((s) => s.id === "friendship")!;
    learning[resident.id].pending = {
      id: `${turn.id}-${resident.id}`,
      scenarioId: socialScenario.id,
      startedSimMs: turn.simStartedAt!,
      durationMs: resident.plan.steps.reduce((sum,step)=>sum+step.duration,0)*1000,
      completed: false,
    };
  }
  updateAnimalLearning({ ...next, living: state }, state, context, now);
  next.livingTurn = turn;
  next.living = state;
  return { state, turn, world: next, newExperiences };
}

const agendaCache = new Map<string, Step[]>();
const errands: [string, string, Step["kind"]][] = [
  ["Thư viện", "Tra một mục sách cho việc đang làm", "read"],
  ["Quảng trường", "Xem bảng tin rồi trở lại việc riêng", "read"],
  ["Phố đi bộ", "Đi một đoạn, thư giãn tay và mắt", "rest"],
  ["Quán cà phê", "Nghỉ chân và hỏi thăm nếu gặp người quen", "social"],
  ["Chợ nhỏ", "Xem các món cần cho bữa cơm", "read"],
  ["Bưu điện", "Xem hướng dẫn gửi thư", "read"],
  ["Lớp học cộng đồng", "Xem lại một ghi chú học tập", "read"],
  ["Văn phòng", "Trao đổi một ghi chú công việc", "social"],
  ["Nhà văn hóa", "Xem thông tin sinh hoạt cộng đồng", "read"],
  ["Trường nghề", "Xem một bài thực hành", "read"],
  ["Sân chung", "Đi bộ, chào người quen nếu gặp", "social"],
  ["Siêu thị", "Xem danh sách đồ dùng cần tìm", "read"],
  ["Xưởng xe máy", "Xem một ghi chú bảo dưỡng dụng cụ", "read"],
  ["Bến xe buýt", "Xem bảng hướng dẫn đi lại trong khu phố", "read"],
];
/** Staggered 24h agendas: residents work, eat, take separate breaks and go home.
 * Unlike the old eight-minute loop, the whole crowd never gathers at one plaza. */
export function residentRoutine(state: LivingState, r: Resident): Step[] {
  const role = state.catalog.roles.find(x => x.id === r.roleId) ?? state.catalog.roles[0];
  const key = `${r.id}:${role.id}:${role.place}:${role.activity}:${role.kind}`;
  const cached = agendaCache.get(key); if (cached) return cached;
  const h = hashSeed(r.id), shift = (h % 45) / 60;
  const breakPlace = ["Công viên", "Quán cà phê", "Phố đi bộ", "Quảng trường", "Thư viện"][h % 5];
  const home = "Khu dân cư", workplace = role.id === "rest" ? home : role.place;
  const slots: [number, string, string, Step["kind"]][] = [
    [0, home, "Nghỉ đêm trong khu dân cư", "rest"],
    [6 + shift, h % 2 ? "Chợ nhỏ" : "Quán cà phê", "Ăn sáng trước giờ làm", "eat"],
    [6.35 + shift, breakPlace, "Chuẩn bị cho công việc trong ngày", "read"],
    [7.5 + shift, workplace, role.activity, role.kind],
    [11.25 + shift, h % 2 ? "Nhà hàng" : "Chợ nhỏ", "Ăn trưa, nghỉ một lát", "eat"],
    [11.6 + shift, breakPlace, "Nghỉ tay sau bữa trưa", "rest"],
    [12.25 + shift, workplace, role.activity, role.kind],
    [15.5 + shift, breakPlace, "Tạm nghỉ, trò chuyện nếu gặp bạn", breakPlace === "Thư viện" ? "read" : "social"],
    [16.25 + shift, workplace, role.activity, role.kind],
    [18 + shift, h % 3 ? "Nhà hàng" : "Siêu thị", "Ăn tối và mua đồ dùng", "eat"],
    [18.4 + shift, breakPlace, "Xem lại việc riêng cuối ngày", "read"],
    [19 + shift, breakPlace, "Đi dạo thư giãn cuối ngày", "social"],
    [21 + shift, home, "Về nhà nghỉ, giữ yên tĩnh", "rest"],
  ];
  const result: Step[] = [];
  for (const [i, [hour, location, activity, kind]] of slots.entries()) {
    let remaining = ((slots[i + 1]?.[0] ?? 24) - hour) * 3600;
    if (location === home || (kind === "eat" && remaining <= 1500) || remaining <= 300) { result.push({ location, activity, kind, duration: remaining }); continue; }
    const local = errands.filter(([name]) => name !== location && distance(places[name], places[location]) <= 550)
      .sort((a, b) => distance(places[a[0]], places[location]) - distance(places[b[0]], places[location])).slice(0, 4);
    let beat = 0;
    while (remaining > .0001) {
      const phase = (h + i * 13 + beat) % 4;
      const labels = ["chuẩn bị phần tiếp theo", "làm một phần nhỏ", "kiểm tra lại kết quả", "sắp xếp chỗ làm"];
      const duration = Math.min(remaining, 160 + (h + i * 37 + beat * 53) % 151);
      result.push({ location, activity: `${activity}: ${labels[phase]}`.slice(0, 80), kind, duration }); remaining -= duration;
      if (remaining > 60 && ++beat % 2 === 0) {
        const visit = local[(h + beat + i) % local.length];
        const trip = visit ? distance(places[visit[0]], places[location]) : 0;
        const pause = Math.min(remaining, Math.max(75 + (h + beat) % 46, trip / 8 + 35));
        result.push({ location: visit?.[0] ?? location, activity: visit?.[1] ?? "Nghỉ tay, xem lại bước tiếp theo", kind: visit?.[2] ?? "rest", duration: pause }); remaining -= pause;
      }
    }
  }
  if (agendaCache.size >= 512) agendaCache.delete(agendaCache.keys().next().value!);
  agendaCache.set(key, result); return result;
}

/** Crowd members stay stable across ticks; only the visible budget is rendered. */
export function crowdAt(
  state: LivingState,
  world: World,
  now: number,
  focusId?: string,
  limit = 60,
): Actor[] {
  const seconds = computeSimMs(world.born, world.clock, now) / 1000;
  const visible = state.residents.slice(0, Math.max(1, Math.min(240, limit)));
  const partner = state.residents.find(
    (r) => r.id === world.livingTurn?.residentId,
  );
  const focused = state.residents.find((r) => r.id === focusId);
  let replaced = 0;
  for (const preferred of [partner, focused])
    if (preferred && !visible.some((r) => r.id === preferred.id))
      visible[visible.length - 1 - replaced++] = preferred;
  return visible.map((r) => {
    const list = residentRoutine(state, r);
    const elapsed =
      r.plan?.simStartedAt !== undefined
        ? Math.max(0, seconds - r.plan.simStartedAt / 1000)
        : Infinity;
    const total =
      r.plan?.steps.reduce((sum, step) => sum + step.duration, 0) ?? 0;
    const actor =
      r.plan && elapsed < total
        ? project(
            r.id,
            r.name,
            r.plan.steps,
            elapsed,
            "plan",
            r.plan.from,
            r.plan.originPath,
            r.plan.transport,
          )
        : project(
            r.id,
            r.name,
            r.plan ? routineFrom(list, worldTime(world, now).hour * 3600 - (elapsed - total)) : list,
            r.plan ? elapsed - total : worldTime(world, now).hour * 3600,
            "routine",
            r.plan?.steps.at(-1)?.location,
          );
    if (!actor.walking && (!r.plan || elapsed >= total)) Object.assign(actor, microActivity(r.id, seconds, actor.kind, actor.activity));
    const jitter = hashSeed(r.id);
    actor.position = [
      actor.position[0] + ((jitter % 9) - 4) * 7,
      actor.position[1] + ((Math.floor(jitter / 9) % 7) - 3) * 5,
    ];
    return actor;
  });
}

export function livingSpeechAt(
  world: World,
  now: number,
): import("../speech").Speech | null {
  const turn = world.livingTurn;
  if (!turn || !world.living || turn.simStartedAt === undefined) return null;
  const elapsed =
    (computeSimMs(world.born, world.clock, now) - turn.simStartedAt) / 1000;
  const an = actorsAt(world, now).find((a) => a.id === "an");
  const peer = crowdAt(world.living, world, now).find(
    (a) => a.id === turn.residentId,
  );
  if (!an || !peer || !nearby(an, peer)) return null;
  const index = Math.floor((elapsed - 120) / 7);
  if (index < 0 || index >= turn.dialogue.length || (elapsed - 120) % 7 >= 6)
    return null;
  const line = turn.dialogue[index];
  return {
    speaker: line.speaker,
    text: line.text,
    source: turn.generator === "local-llm" ? "ai" : "routine",
    key: `${turn.id}-${index}`,
  };
}
