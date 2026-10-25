import { z } from "zod";
import { PLACES, STEP_KINDS } from "../event-schema.ts";
import scenariosData from "../../data/city/scenarios.json" with { type: "json" };
import type { LivingState, RealContext } from "./schema.ts";
import type { World } from "../world";
import { computeSimMs, hashSeed } from "../clock.ts";
export const scenarioSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]{0,60}$/),
    title: z.string().min(1).max(80),
    place: z.enum(PLACES),
    kind: z.enum(STEP_KINDS),
    tag: z.string().min(1).max(40),
    transport: z.enum([
      "walk",
      "bicycle",
      "motorbike",
      "bus",
      "metro",
      "plane",
    ]),
    energy: z.number().int().min(-20).max(20),
    hunger: z.number().int().min(-30).max(20),
    skill: z.number().int().min(0).max(3),
    adultOnly: z.boolean(),
  })
  .strict();
export const scenarios = z
  .array(scenarioSchema)
  .min(1)
  .max(100)
  .parse(scenariosData);
export type Scenario = (typeof scenarios)[number];
export type LearnedAction = { trials: number; meanReward: number };
export type AgentLearning = {
  adult: true;
  energy: number;
  hunger: number;
  health: number;
  skill: number;
  employment: "employed" | "seeking" | "studying";
  samples: number;
  actions: Record<string, LearnedAction>;
  memories: string[];
  lastTrainedAt?: string;
  lastReward?: number;
  citations?: number;
  pending?: {
    id: string;
    scenarioId: string;
    startedSimMs: number;
    durationMs: number;
    completed: boolean;
  };
};
export type Experience = {
  id: string;
  actorId: string;
  scenarioId: string;
  at: string;
  reward: number;
  source: "simulation";
  model: "contextual-bandit-v1";
};
export type LearningPopulation = Record<string, AgentLearning>;
export function initializeAgent(id: string): AgentLearning {
  return {
    adult: true,
    energy: 65 + (hashSeed(id) % 25),
    hunger: 20,
    health: 100,
    skill: 0,
    employment: "employed",
    samples: 0,
    actions: {},
    memories: [],
  };
}
/** A per-character contextual bandit: action values are actually fitted from completed outcomes. */
export function fitAction(
  agent: Pick<
    AgentLearning,
    "actions" | "samples" | "lastTrainedAt" | "lastReward"
  >,
  action: string,
  reward: number,
  at: string,
) {
  const bounded = Math.max(-1, Math.min(1, reward));
  const old = agent.actions[action] ?? { trials: 0, meanReward: 0 };
  const trials = old.trials + 1;
  agent.actions[action] = {
    trials,
    meanReward: old.meanReward + (bounded - old.meanReward) / trials,
  };
  agent.samples++;
  agent.lastTrainedAt = at;
  agent.lastReward = bounded;
}
export function chooseScenario(
  agent: AgentLearning,
  id: string,
  context: RealContext,
  rolePlace?: string,
): Scenario {
  if (context.hour < 6 || context.hour >= 22 || agent.energy < 20)
    return scenarios.find((s) => s.id === "rest-home")!;
  if (agent.health < 65) return scenarios.find((s) => s.id === "rehabilitate")!;
  if (agent.hunger > 72) return scenarios.find((s) => s.id === "lunch")!;
  if (agent.employment === "seeking")
    return scenarios.find((s) => s.id === "job-search")!;
  const rainy =
    context.weather.status === "fresh" &&
    (context.weather.precipitation ?? 0) > 0;
  const candidates = scenarios
    .filter((s) => !s.adultOnly || agent.adult)
    .filter((s) => !rainy || !["sport", "ecology"].includes(s.tag));
  return candidates
    .map((s) => {
      const model = agent.actions[s.id] ?? { trials: 0, meanReward: 0 };
      const exploration =
        0.45 * Math.sqrt(Math.log(agent.samples + 2) / (model.trials + 1));
      const affinity = s.place === rolePlace ? 0.3 : 0;
      const tie =
        (hashSeed(
          `${id}-${context.date}-${Math.floor(context.hour * 4)}-${s.id}`,
        ) %
          1000) /
        5000;
      return {
        scenario: s,
        score: model.meanReward + exploration + affinity + tie,
      };
    })
    .sort((a, b) => b.score - a.score)[0].scenario;
}
export function settleLearning(
  agent: AgentLearning,
  simMs: number,
  now: string,
  planMatches: boolean,
) {
  const pending = agent.pending;
  if (
    !pending ||
    pending.completed ||
    simMs - pending.startedSimMs < pending.durationMs
  )
    return false;
  pending.completed = true;
  if (!planMatches) return false;
  const scenario = scenarios.find((s) => s.id === pending.scenarioId);
  if (!scenario) return false;
  const before = {
    energy: agent.energy,
    hunger: agent.hunger,
    health: agent.health,
    skill: agent.skill,
  };
  agent.energy = Math.max(0, Math.min(100, agent.energy + scenario.energy));
  agent.hunger = Math.max(0, Math.min(100, agent.hunger + scenario.hunger));
  agent.skill = Math.min(100, agent.skill + scenario.skill);
  if (scenario.id === "minor-injury")
    agent.health = Math.max(45, agent.health - 8);
  if (scenario.id === "rehabilitate" || scenario.id === "hospital-check")
    agent.health = Math.min(100, agent.health + 18);
  if (scenario.id === "traffic-check")
    agent.citations = (agent.citations ?? 0) + 1;
  if (scenario.id === "job-change") agent.employment = "seeking";
  if (scenario.id === "job-search") agent.employment = "studying";
  if (scenario.id === "factory-shift" || scenario.id === "office-shift")
    agent.employment = "employed";
  const reward = Math.max(
    -1,
    Math.min(
      1,
      0.1 +
        (agent.skill - before.skill) * 0.2 +
        (agent.energy - before.energy) * 0.015 +
        (before.hunger - agent.hunger) * 0.01 +
        (agent.health - before.health) * 0.025,
    ),
  );
  fitAction(agent, scenario.id, reward, now);
  agent.memories = [
    ...agent.memories,
    `${now.slice(0, 10)}: ${scenario.title}; phản hồi ${reward.toFixed(2)}.`,
  ].slice(-24);
  return true;
}
/** Train completed plans for everyone, then schedule a bounded rotating cohort. */
export function prepareLearning(world: World, state: LivingState, now: number) {
  const learning: LearningPopulation = structuredClone(state.learning ?? {});
  const simMs = computeSimMs(world.born, world.clock, now);
  const all = [
    ...world.people.map((p) => ({ id: p.id, plan: p.plan })),
    ...state.residents.map((r) => ({ id: r.id, plan: r.plan })),
  ];
  const experiences = [...(state.experiences ?? [])];
  for (const person of all) {
    const agent = learning[person.id] ?? initializeAgent(person.id);
    if (!learning[person.id]) {
      const core = world.people.find((p) => p.id === person.id);
      if (core) {
        agent.energy = core.energy;
        agent.hunger = core.hunger;
      }
      if (person.id === "an") {
        agent.energy = state.energy;
        agent.hunger = state.hunger;
      }
    }
    const existingCore = world.people.find((p) => p.id === person.id);
    if (existingCore)
      agent.skill = Math.max(agent.skill, Math.min(100, existingCore.skill));
    const trained = settleLearning(
      agent,
      simMs,
      new Date(now).toISOString(),
      person.plan?.simStartedAt === agent.pending?.startedSimMs,
    );
    if (trained && agent.pending) {
      const action = agent.actions[agent.pending.scenarioId];
      experiences.push({
        id: agent.pending.id,
        actorId: person.id,
        scenarioId: agent.pending.scenarioId,
        at: new Date(now).toISOString(),
        reward: agent.lastReward ?? action.meanReward,
        source: "simulation",
        model: "contextual-bandit-v1",
      });
      const npc = state.residents.find((r) => r.id === person.id);
      if (npc)
        npc.memories = [...npc.memories, agent.memories.at(-1)!].slice(-20);
    }
    learning[person.id] = agent;
  }
  state.experiences = experiences.slice(-200);
  state.learning = learning;
  return learning;
}
export function cohortIds(state: LivingState, slot: number) {
  const ids = state.residents.map((r) => r.id);
  const take = Math.min(12, ids.length);
  return Array.from(
    { length: take },
    (_, i) => ids[(slot * 12 + i) % ids.length],
  );
}
