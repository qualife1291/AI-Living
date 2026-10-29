import type { LivingState, RealContext } from "./schema";
import type { World, PersonPlan } from "../world";
import { animalRoster, animalsAt, actorsAt, actorTransition, type Step } from "../life.ts";
import { crowdAt } from "./engine.ts";
import { petOwners } from "./pets.ts";
import { computeSimMs, hashSeed } from "../clock.ts";
import { fitAction, type LearnedAction } from "./learning.ts";
import {planKey} from './plan-identity.ts';
export type AnimalAction = "rest" | "forage" | "play" | "shelter";
export type AnimalPolicy = {
  samples: number;
  actions: Record<string, LearnedAction>;
  energy: number;
  lastTrainedAt?: string;
  lastReward?: number;
  plan?: PersonPlan;
  pending?: {
    id: string;
    action: AnimalAction;
    started: number;
    done: boolean;
    cancelled?: boolean;
    planKey?: string;
    durationMs?: number;
  };
};
const labels: Record<AnimalAction, string> = {
  rest: "Nghỉ ở nơi yên tĩnh",
  forage: "Tìm thức ăn và nước theo tập tính",
  play: "Khám phá và chơi nhẹ",
  shelter: "Trú ở nơi có mái che",
};
function accompaniedPets(world: World, state: LivingState, now: number) {
  const snapshot = { ...world, living: state }, owners = petOwners(snapshot);
  const walking = new Set([...actorsAt(snapshot, now), ...crowdAt(state, snapshot, now, undefined, state.residents.length)]
    .filter(a => a.kind === "walk-pet" && (!a.transport || a.transport === "walk")).map(a => a.id));
  return new Set(Object.entries(owners).filter(([, owner]) => walking.has(owner)).map(([pet]) => pet));
}
export function updateAnimalLearning(
  world: World,
  state: LivingState,
  context: RealContext,
  now: number,
) {
  settleAnimalLearning(world, state, now);
  const policies = structuredClone(state.animalLearning ?? {});
  const simMs = computeSimMs(world.born, world.clock, now);
  const before = animalsAt(world, now);
  const accompanied = accompaniedPets(world, state, now);
  for (const animal of animalRoster({...world,living:state})) {
    if (accompanied.has(animal.id)) continue; // The walk interrupts autonomous choices, without earning a reward.
    const policy: AnimalPolicy = policies[animal.id] ?? {
      samples: 0,
      actions: {},
      energy: 80,
    };
    const rain =
      context.weather.status === "fresh" &&
      (context.weather.precipitation ?? 0) > 0;
    const night = context.hour >= 21 || context.hour < 6;
    // Slow simulation clocks need several pulses to finish a plan. Do not
    // continuously replace it and thereby prevent any valid settlement.
    if(policy.pending&&!policy.pending.done){
      const matches=!!policy.plan&&policy.plan.simStartedAt===policy.pending.started&&(!policy.pending.planKey||planKey(policy.plan)===policy.pending.planKey);
      const emergency=rain&&policy.pending.action!=='shelter'||!rain&&(night||policy.energy<30)&&policy.pending.action!=='rest';
      if(matches&&!emergency)continue;
      policy.pending.done=true;policy.pending.cancelled=true;
    }
    const options: AnimalAction[] = ["rest", "forage", "play"];
    const action: AnimalAction = rain
      ? "shelter"
      : night || policy.energy < 30
        ? "rest"
        : options
            .map((id) => ({
              id,
              score:
                (policy.actions[id]?.meanReward ?? 0) +
                0.6 *
                  Math.sqrt(
                    Math.log(policy.samples + 2) /
                      ((policy.actions[id]?.trials ?? 0) + 1),
                  ) +
                (hashSeed(
                  `${animal.id}-${context.date}-${context.hour}-${id}`,
                ) %
                  100) /
                  500,
            }))
            .sort((a, b) => b.score - a.score)[0].id;
    const location =
      action === "shelter"
        ? animal.species === "cat"
          ? "Bếp chung"
          : animal.species === "dog"
            ? "Sân chung"
            : "Vườn nhỏ"
        : animal.species === "bird"
          ? "Vườn nhỏ"
          : action === "forage"
            ? "Bếp chung"
            : "Công viên";
    const actor = before.find((a) => a.id === animal.id)!;
    policy.plan = {
      createdAt: new Date(now).toISOString(),
      pausedMs: world.clock?.pausedMs ?? 0,
      simStartedAt: simMs,
      ...actorTransition(actor),
      generator: "rules",
      steps: [
        {
          location,
          activity: labels[action],
          kind: (action === "play"
            ? "play"
            : action === "forage"
              ? "eat"
              : "rest") as Step["kind"],
          duration: 180,
        },
      ],
    };
    policy.pending = {
      id: `animal-${animal.id}-${Math.floor(now / 900000)}`,
      action,
      started: simMs,
      done: false,
      planKey:planKey(policy.plan),
      durationMs:policy.plan.steps.reduce((sum,s)=>sum+s.duration*1000,0),
    };
    policies[animal.id] = policy;
  }
  state.animalLearning = policies;
}

export function settleAnimalLearning(
  world: World,
  state: LivingState,
  now: number,
) {
  const simMs = computeSimMs(world.born, world.clock, now);
  let count = 0;
  const accompanied = accompaniedPets(world, state, now);
  for (const [id, policy] of Object.entries(state.animalLearning ?? {})) {
    if (accompanied.has(id) && policy.pending && !policy.pending.done) {
      policy.pending.done = true; policy.pending.cancelled = true;
      continue;
    }
    const duration=policy.plan?.steps.reduce((sum,s)=>sum+s.duration*1000,0)??180000;
    if(policy.pending&&!policy.pending.done&&(!policy.plan||policy.plan.simStartedAt!==policy.pending.started||policy.pending.planKey&&planKey(policy.plan)!==policy.pending.planKey||policy.pending.durationMs!==undefined&&policy.pending.durationMs!==duration)){
      policy.pending.done=true;policy.pending.cancelled=true;continue;
    }
    if (
      policy.pending &&
      !policy.pending.done &&
      simMs - policy.pending.started >= duration
    ) {
      policy.pending.done = true;
      const reward = policy.pending.action === "play" ? 0.2 : 0.55;
      fitAction(
        policy,
        policy.pending.action,
        reward,
        new Date(now).toISOString(),
      );
      count++;
      policy.energy = Math.max(
        0,
        Math.min(
          100,
          policy.energy + (policy.pending.action === "play" ? -6 : 7),
        ),
      );
    }
  }
  return count;
}
