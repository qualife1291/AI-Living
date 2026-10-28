import { z } from "zod";
import { PLACES, STEP_KINDS } from "../event-schema.ts";
import scenariosData from "../../data/city/scenarios.json" with { type: "json" };
import type { LivingState, RealContext } from "./schema.ts";
import type { World, PersonPlan } from "../world";
import { computeSimMs, hashSeed, worldTime } from "../clock.ts";
import { decisionContext, fitLinear, linearScore, validDecisionContext, type LinearArm } from "./linucb.ts";
import {SKILL_DOMAINS,type SkillDomain,type DomainGain} from "./skills.ts";
import {pendingPlanMatches} from "./plan-identity.ts";
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
    minSkill: z.number().int().min(0).max(100).optional(),
    skillDomain: z.enum(SKILL_DOMAINS).optional(),
    minDomainSkill: z.number().int().min(0).max(100).optional(),
  })
  .strict().refine(s=>s.minDomainSkill===undefined || s.skillDomain!==undefined,{message:"Domain gate requires a skill domain"});
export const scenarios = z
  .array(scenarioSchema)
  .min(1)
  .max(100)
  .parse(scenariosData);
export type Scenario = (typeof scenarios)[number];
const scenariosByTag = new Map<string, Scenario[]>();
for (const scenario of scenarios) scenariosByTag.set(scenario.tag, [...(scenariosByTag.get(scenario.tag) ?? []), scenario]);
export type LearnedAction = { trials: number; meanReward: number };
export type AgentLearning = {
  adult: true;
  socialNeed?: number;
  energy: number;
  hunger: number;
  health: number;
  skill: number;
  domainSkills?: Partial<Record<SkillDomain,number>>;
  /** Compatibility only: old scalar gates that were already open, not earned points. */
  legacySkillGates?: string[];
  employment: "employed" | "seeking" | "studying";
  samples: number;
  actions: Record<string, LearnedAction>;
  linear?: Record<string, LinearArm>;
  /** Exact version of the separately persisted posterior; never a sample count. */
  policyRevision?: number;
  memories: string[];
  lastTrainedAt?: string;
  lastReward?: number;
  citations?: number;
  needsUpdatedSimMs?: number;
  recentActions?: string[];
  pending?: {
    id: string;
    scenarioId: string;
    startedSimMs: number;
    durationMs: number;
    completed: boolean;
    context?: number[];
    planKey?: string;
  };
};
export type Experience = {
  id: string;
  actorId: string;
  scenarioId: string;
  at: string;
  reward: number;
  source: "simulation";
  model: "contextual-bandit-v1" | "disjoint-linucb-v1";
  context?: number[];
  skillGain?: DomainGain;
};
export type LearningPopulation = Record<string, AgentLearning>;
export function meetsSkillGate(agent: Pick<AgentLearning,"skill"|"domainSkills"|"legacySkillGates">, scenario: Scenario) {
  return agent.skill >= (scenario.minSkill??0) && (scenario.minDomainSkill===undefined || !agent.domainSkills ||
    agent.legacySkillGates?.includes(scenario.id) || (agent.domainSkills[scenario.skillDomain!]??0)>=scenario.minDomainSkill);
}
export function initializeAgent(id: string): AgentLearning {
  return {
    adult: true,
    socialNeed: 35 + hashSeed(id)%40,
    energy: 65 + (hashSeed(id) % 25),
    hunger: 20,
    health: 100,
    skill: 0,
    domainSkills: {},
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
  policy: "tabular" | "linucb" = "linucb",
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
    .filter(s=>meetsSkillGate(agent,s))
    .filter((s) => !s.adultOnly || agent.adult)
    // Accidents and violations are reactive events, never purposeful errands.
    .filter((s) => !["minor-injury", "traffic-check", "job-change"].includes(s.id))
    .filter((s) => !rainy || !["sport", "ecology"].includes(s.tag));
  return candidates
    .map((s) => {
      const model = agent.actions[s.id] ?? { trials: 0, meanReward: 0 };
      let exploration =
        0.45 * Math.sqrt(Math.log(agent.samples + 2) / (model.trials + 1));
      let prediction = model.meanReward * .7;
      if (policy === "linucb" && agent.linear?.[s.id]) {
        const estimate = linearScore(agent.linear[s.id], decisionContext(agent, context.weather));
        prediction = estimate.mean * .7; exploration = estimate.uncertainty;
      }
      const affinity = s.place === rolePlace ? 0.3 : 0;
      const energyNeed = Math.max(0, (70 - agent.energy) / 70), foodNeed = Math.max(0, (agent.hunger - 15) / 85);
      const needs = energyNeed * s.energy / 18 * .8 - foodNeed * s.hunger / 28 * .9;
      const recent = agent.recentActions ?? [], repetitions = recent.filter(id => id === s.id).length;
      const novelty = -repetitions * .12 - (recent.at(-1) === s.id ? .18 : 0);
      const satiety = s.kind === "eat" && agent.hunger < 35 ? -.3 : 0;
      const unnecessaryRest = s.id === "rest-home" && agent.energy >= 65 ? -.35 : 0;
      const evening = context.hour >= 18 ? (s.kind === "work" ? -.25 : ["social", "play"].includes(s.kind) ? .12 : 0) : 0;
      const taste = (hashSeed(`${id}:${s.tag}`) % 101 - 50) / 500;
      const related = (scenariosByTag.get(s.tag) ?? []).filter(other => other.id !== s.id).map(other => agent.actions[other.id]).filter(Boolean);
      const transfer = related.length ? related.reduce((sum, action) => sum + action.meanReward * Math.min(1, action.trials / 3), 0) / related.length * .12 : 0;
      const tie =
        (hashSeed(
          `${id}-${context.date}-${Math.floor(context.hour * 4)}-${s.id}`,
        ) %
          1000) /
        5000;
      return {
        scenario: s,
        score: prediction + exploration + affinity + needs + novelty + satiety + unnecessaryRest + evening + taste + transfer + tie,
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
  if (!agent.domainSkills) {
    // Keep previously unlocked activities; never turn historical scalar skill
    // into invented proficiency in every domain. New gains start at zero.
    agent.legacySkillGates = scenarios.filter(s=>s.minDomainSkill!==undefined && agent.skill >= (s.minSkill??0)).map(s=>s.id);
    agent.domainSkills = {};
  }
  agent.energy = Math.max(0, Math.min(100, agent.energy + scenario.energy));
  agent.hunger = Math.max(0, Math.min(100, agent.hunger + scenario.hunger));
  agent.skill = Math.min(100, agent.skill + scenario.skill);
  if (scenario.skillDomain && scenario.skill > 0)
    agent.domainSkills[scenario.skillDomain] = Math.min(100,(agent.domainSkills[scenario.skillDomain]??0)+scenario.skill);
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
      (agent.skill - before.skill) * .16 +
        (agent.energy - before.energy) * (.008 + (100 - before.energy) / 100 * .018) +
        (before.hunger - agent.hunger) * (.005 + before.hunger / 100 * .02) +
        (agent.health - before.health) * (.015 + (100 - before.health) / 100 * .04),
    ),
  );
  fitAction(agent, scenario.id, reward, now);
  if (validDecisionContext(pending.context)) {
    agent.linear ??= {};
    agent.linear[scenario.id] = fitLinear(agent.linear[scenario.id], pending.context, reward);
  }
  agent.recentActions = [...(agent.recentActions ?? []), scenario.id].slice(-6);
  agent.memories = [
    ...agent.memories,
    `${now.slice(0, 10)}: ${scenario.title}; phản hồi ${reward.toFixed(2)}.`,
  ].slice(-24);
  return true;
}
export function hasUnfinishedLearning(agent: AgentLearning | undefined, plan: PersonPlan | undefined, simMs: number) {
  const pending = agent?.pending;
  const planActive = plan?.simStartedAt !== undefined && simMs < plan.simStartedAt + plan.steps.reduce((s,step)=>s+step.duration,0)*1000;
  return !!planActive || !!pending && !pending.completed && pendingPlanMatches(pending,plan) && simMs < pending.startedSimMs + pending.durationMs;
}

/** Needs drift in simulation time; legacy agents start at the current anchor.
 * This never awards a completed meal, skill or income just for elapsed time. */
function advanceNeeds(agent: AgentLearning, id: string, simMs: number, sleeping: boolean) {
  const elapsed = Math.min(360, Math.max(0, (simMs - (agent.needsUpdatedSimMs ?? simMs)) / 60000));
  const metabolism = .9 + hashSeed(id) % 21 / 100;
  agent.energy = Math.max(0, Math.min(100, agent.energy + (sleeping ? .12 : -.035) * elapsed * metabolism));
  agent.hunger = Math.max(0, Math.min(100, agent.hunger + (sleeping ? .012 : .04) * elapsed * metabolism));
  agent.needsUpdatedSimMs = simMs;
}
/** Train completed plans for everyone, then schedule a bounded rotating cohort. */
export function prepareLearning(world: World, state: LivingState, now: number, collect?: (e: Experience) => void) {
  const learning: LearningPopulation = structuredClone(state.learning ?? {});
  const simMs = computeSimMs(world.born, world.clock, now);
  const hour = worldTime(world, now).hour;
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
        agent.legacySkillGates = scenarios.filter(s=>s.minDomainSkill!==undefined && core.skill >= (s.minSkill??0)).map(s=>s.id);
      }
      if (person.id === "an") {
        agent.energy = state.energy;
        agent.hunger = state.hunger;
      }
    }
    const existingCore = world.people.find((p) => p.id === person.id);
    if (existingCore)
      agent.skill = Math.max(agent.skill, Math.min(100, existingCore.skill));
    advanceNeeds(agent, person.id, simMs, hour < 6 || hour >= 22);
    const domain = scenarios.find(s=>s.id===agent.pending?.scenarioId)?.skillDomain;
    const beforeDomain = domain ? agent.domainSkills?.[domain]??0 : 0;
    const trained = settleLearning(
      agent,
      simMs,
      new Date(now).toISOString(),
      pendingPlanMatches(agent.pending,person.plan),
    );
    if (trained && agent.pending) {
      const action = agent.actions[agent.pending.scenarioId];
      const experience: Experience = {
        id: agent.pending.id,
        actorId: person.id,
        scenarioId: agent.pending.scenarioId,
        at: new Date(now).toISOString(),
        reward: agent.lastReward ?? action.meanReward,
        source: "simulation",
        model: validDecisionContext(agent.pending.context) && agent.linear?.[agent.pending.scenarioId] ? "disjoint-linucb-v1" : "contextual-bandit-v1",
        ...(validDecisionContext(agent.pending.context) ? { context: [...agent.pending.context] } : {}),
        ...(domain && (agent.domainSkills?.[domain]??0)>beforeDomain ? {skillGain:{domain,before:beforeDomain,after:agent.domainSkills![domain]!,amount:agent.domainSkills![domain]!-beforeDomain}} : {}),
      };
      experiences.push(experience);
      collect?.(experience);
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
  const ids = state.residents.map((r) => r.id).sort((a, b) => hashSeed(a) - hashSeed(b) || a.localeCompare(b));
  const take = Math.min(24, Math.max(12, Math.ceil(ids.length / 10)), ids.length);
  if (!take) return [];
  const groups = Math.ceil(ids.length / take);
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
  let stride = Math.max(1, Math.floor(groups / 3));
  while (gcd(stride, groups) !== 1) stride++;
  // Five-minute viewers and hourly cloud runs both visit every group. The old
  // slot*12 formula repeatedly selected the same subset on hourly runs.
  const withinHour = ((slot % 12) + 12) % 12;
  const group = ((Math.floor(slot / 12) + withinHour * stride) % groups + groups) % groups;
  return Array.from(
    { length: take },
    (_, i) => ids[(group * take + i) % ids.length],
  );
}
