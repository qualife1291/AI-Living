import defaults from "../../data/living/catalog.json" with { type: "json" };
import {
  catalogSchema,
  type LivingCatalog,
  type LivingState,
  type LivingTurn,
  type RealContext,
  type Resident,
} from "./schema.ts";
import { hashSeed, computeSimMs } from "../clock.ts";
import {
  transitionPath,
  actorTransition,
  actorsAt,
  nearby,
  project,
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
    daysExperienced: 1,
  };
  return { ...state, residents: population(state, state.startedOn) };
}
export function turnId(now: number) {
  return `living-${localDate(now)}-${Math.floor(((now + 7 * 3600000) % DAY) / 900000)}`;
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
): { state: LivingState; turn: LivingTurn; world: World } {
  const state = structuredClone(world.living ?? initializeLiving(now));
  state.residents = population(state, context.date);
  // Needs are simulated, elapsed in real time. Bound catch-up, never invent meals or earnings.
  const minutes = Math.min(
    360,
    Math.max(0, (now - Date.parse(state.lastTickAt)) / 60000),
  );
  const sleeping = context.hour < 6 || context.hour >= 22;
  state.energy = Math.max(
    0,
    Math.min(100, state.energy + (sleeping ? 0.12 : -0.035) * minutes),
  );
  state.hunger = Math.max(0, Math.min(100, state.hunger + 0.04 * minutes));
  state.social = Math.max(0, Math.min(100, state.social - 0.02 * minutes));
  const role = chooseRole(state, context);
  const peers = state.residents.filter((r) => r.roleId === role.id);
  const resident =
    peers[hashSeed(turnId(now)) % peers.length] ?? state.residents[0];
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
  const location = sleeping
    ? "Phòng An"
    : festival
      ? "Quảng trường"
      : role.place;
  const activity = festival
    ? `Tìm hiểu ${festival.title.slice(0, 55)}`
    : sleeping
      ? "Sạc pin và nghỉ đêm"
      : state.hunger > 70
        ? "Mua và ăn một bữa nhẹ"
        : role.activity;
  const kind = festival
    ? "social"
    : sleeping
      ? "rest"
      : state.hunger > 70
        ? "eat"
        : role.kind;
  const dialogue = sleeping
    ? []
    : [
        {
          speaker: "an",
          text: `${resident.name}, mình ghé ${location.toLowerCase()} một lát nhé.`,
        },
        { speaker: resident.id, text: role.greeting },
        {
          speaker: "an",
          text: "Ừ, mình làm từ từ thôi. Có gì mới mình sẽ kể bạn nghe.",
        },
      ];
  const turn: LivingTurn = {
    id: turnId(now),
    createdAt: new Date(now).toISOString(),
    date: context.date,
    title: sleeping
      ? "Một đêm yên trong xóm"
      : `${activity} cùng ${resident.name}`,
    summary: sleeping
      ? "An trở về phòng nghỉ. Khu phố vẫn giữ lịch sử và những người đã gặp."
      : `An dự định ghé ${location.toLowerCase()} và gặp ${resident.name}, ${role.label.toLowerCase()}. Đây là tình huống hư cấu dựa trên bối cảnh có ghi nguồn.`,
    location,
    activity,
    kind,
    residentId: resident.id,
    dialogue,
    generator: "rules",
    context,
    simStartedAt: computeSimMs(world.born, world.clock, now),
  };
  state.lastTickAt = turn.createdAt;
  state.lastTurnId = turn.id;
  state.daysExperienced = dayDiff(state.startedOn, context.date) + 1;
  const next = structuredClone(world);
  const an = next.people.find((p) => p.id === "an");
  if (an) {
    an.plan = {
      createdAt: turn.createdAt,
      pausedMs: next.clock?.pausedMs ?? 0,
      ...transitionPath(world, "an", now),
      simStartedAt: turn.simStartedAt,
      generator: "rules",
      steps: [{ location, activity, kind, duration: 180 }],
    };
    an.activity = activity;
  }
  if (!sleeping) {
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
        steps: [
          {
            location,
            activity: "Gặp và trò chuyện cùng An",
            kind: "social",
            duration: 180,
          },
        ],
      };
    }
  }
  next.livingTurn = turn;
  next.living = state;
  return { state, turn, world: next };
}

/** Crowd members stay stable across ticks; only the visible budget is rendered. */
export function crowdAt(
  state: LivingState,
  world: World,
  now: number,
): Actor[] {
  const seconds = computeSimMs(world.born, world.clock, now) / 1000;
  const visible = state.residents.slice(0, 60);
  const partner = state.residents.find(
    (r) => r.id === world.livingTurn?.residentId,
  );
  if (partner && !visible.some((r) => r.id === partner.id))
    visible[visible.length - 1] = partner;
  return visible.map((r, i) => {
    const role =
      state.catalog.roles.find((x) => x.id === r.roleId) ??
      state.catalog.roles[0];
    const list: Step[] = [
      {
        location: role.place,
        activity: role.activity,
        kind: role.kind,
        duration: 240,
      },
      {
        location: "Quảng trường",
        activity: "Đi dạo và gặp hàng xóm",
        kind: "social",
        duration: 90,
      },
      {
        location: "Sân chung",
        activity: "Nghỉ chân trong xóm",
        kind: "rest",
        duration: 150,
      },
    ];
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
          )
        : project(
            r.id,
            r.name,
            list,
            r.plan ? elapsed - total : seconds + i * 31,
            "routine",
            r.plan?.steps.at(-1)?.location,
          );
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
