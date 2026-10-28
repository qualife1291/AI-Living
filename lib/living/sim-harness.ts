/** Offline, synthetic hourly ordinary-plan rollout. No DB, LLM, render or I/O. */
import { hashSeed, mulberry32 } from "../clock.ts";
import { actionSteps } from "./activities.ts";
import { planKey, pendingPlanMatches } from "./plan-identity.ts";
import { decisionContext } from "./linucb.ts";
import {
  advanceNeeds, availableScenarios, chooseScenario, expectedReward,
  initializeAgent, scenarios, settleLearning,
  type AgentLearning,
} from "./learning.ts";
import type { RealContext } from "./schema.ts";
import type { PersonPlan } from "../world.ts";

const HOUR = 3_600_000, DAY = 24 * HOUR;
const BASE_DAY = Date.UTC(2026, 9, 1);
const places = [...new Set(scenarios.map(s => s.place))];
const actionIndex = new Map(scenarios.map((s, i) => [s.id, i]));
const durations = new Map(scenarios.map(s => [s.id,
  actionSteps(s.place, s.title, s.kind).reduce((n, step) => n + step.duration, 0) * 1000]));

export type RolloutOptions = {
  policy: "tabular" | "linucb";
  agents: number;
  days: number;
  seeds: number[];
  shiftDay: number | null;
};
export type Metric = { mean: number; ci95: [number, number] | null; n: number; min: number; max: number };
type Selector = typeof chooseScenario;

/** Across independent seed means, never treating individual actions as IID. */
export function summarize(values: number[]): Metric | null {
  if (!values.length) return null;
  if (values.some(v => !Number.isFinite(v))) throw Error("Non-finite metric");
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const df = values.length - 1;
  // Student t .975 quantiles for df 1..30, asymptotic expansion beyond that.
  const quantiles = [0,12.706,4.303,3.182,2.776,2.571,2.447,2.365,2.306,2.262,2.228,
    2.201,2.179,2.16,2.145,2.131,2.12,2.11,2.101,2.093,2.086,2.08,2.074,2.069,
    2.064,2.06,2.056,2.052,2.048,2.045,2.042];
  const z = 1.959963984540054;
  const t = quantiles[df] ?? z + (z ** 3 + z) / (4 * df) + (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df ** 2);
  const variance = df ? values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / df : 0;
  const margin = t * Math.sqrt(variance / values.length);
  return { mean, ci95: df ? [mean - margin, mean + margin] : null,
    n: values.length, min: Math.min(...values), max: Math.max(...values) };
}

export function normalizedEntropy(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) return 0;
  return Math.max(0, Math.min(1,
    -counts.reduce((sum, n) => n ? sum + n / total * Math.log2(n / total) : sum, 0) / Math.log2(scenarios.length)));
}

/** First 3-day window meeting .9; null is censored, never silently converted to 0. */
export function competenceDay(ratios: number[], start = 0): number | null {
  for (let i = start + 2; i < ratios.length; i++)
    if ((ratios[i - 2] + ratios[i - 1] + ratios[i]) / 3 >= .9) return i + 1 - start;
  return null;
}

function contextAt(seed: number, day: number, hour: number, shiftDay: number | null): RealContext {
  const shifted = shiftDay !== null && day >= shiftDay;
  const rain = mulberry32(hashSeed(`H1-weather:${seed}:${day}:${hour}`))() < (shifted ? .8 : .2);
  const date = new Date(BASE_DAY + day * DAY).toISOString().slice(0, 10);
  const at = new Date(BASE_DAY + (day * 24 + hour - 7) * HOUR).toISOString();
  const weekday = new Date(BASE_DAY + day * DAY).getUTCDay();
  return { date, hour, weekday, timezone: "Asia/Ho_Chi_Minh", fetchedAt: at,
    weather: {status:"fresh",source:"synthetic-H1",observedAt:at,temperature:30,
      humidity:70,precipitation:rain?2:0,code:null,windKph:0},
    calendar: {weekend:weekday===0||weekday===6,holidays:day%17===0?["synthetic-holiday"]:[],
      source:"synthetic-H1",status:"fresh",coverage:"synthetic, not a real calendar"},
    traffic:{status:"unavailable",label:"not simulated"},
    festivals:{status:"unavailable",label:"not simulated"} };
}

function project(agent: AgentLearning, id: string, time: number, sleeping: boolean) {
  // advanceNeeds only changes scalars. Never clone/refit posterior matrices for an oracle probe.
  const projected = { ...agent };
  advanceNeeds(projected, id, time, sleeping);
  return projected;
}

/** A feasible, depth-1 completion-reward oracle on the policy's OWN state.
 * It projects the same elapsed needs drift as the actual settlement, and does
 * not train or read future weather. This is opportunity cost, not trajectory regret.
 */
export function oracleReward(agent: AgentLearning, id: string, context: RealContext, time: number) {
  const sleeping = context.hour < 6 || context.hour >= 22;
  let best = -Infinity;
  const projected = new Map<number, AgentLearning>();
  for (const candidate of availableScenarios(agent, context)) {
    const duration = durations.get(candidate.id)!;
    if (!(duration > 0 && duration <= HOUR)) throw Error("Ordinary-plan profile requires duration <= 1 hour");
    if (!projected.has(duration)) projected.set(duration, project(agent,id,time+duration,sleeping));
    best = Math.max(best, expectedReward(projected.get(duration)!, candidate));
  }
  return best;
}

function validate(options: RolloutOptions) {
  const integer = (value: number, lo: number, hi: number) => Number.isInteger(value) && value >= lo && value <= hi;
  if (!["tabular","linucb"].includes(options.policy) || !integer(options.agents,1,240) ||
    !integer(options.days,3,365) || !Array.isArray(options.seeds) || !integer(options.seeds.length,1,100) ||
    options.seeds.some(s=>!integer(s,0,0xffffffff)) || new Set(options.seeds).size!==options.seeds.length ||
    options.shiftDay!==null && !integer(options.shiftDay,1,options.days-1)) throw Error("Invalid rollout configuration");
}

function seedRun(options: RolloutOptions, seed: number, selector: Selector) {
  const population = Array.from({length:options.agents},(_,i)=>{
    const id=`H1:${seed}:resident:${i}`;
    return {id,agent:initializeAgent(id),last:"",repeated:0,
      needRatios:[] as number[]};
  });
  let totalReturn=0,totalRegret=0,totalForced=0,completedPlans=0;
  let totalEntropy=0,totalVoluntaryEntropy=0,totalShare=0,worstShare=0;
  const dailyNeedOk: number[]=[],dailyReturn: number[]=[];
  for(let day=0;day<options.days;day++) {
    const monitors=population.map(()=>({counts:Array(scenarios.length).fill(0) as number[],
      voluntary:Array(scenarios.length).fill(0) as number[],ok:0}));
    let dayReward=0;
    for(let hour=0;hour<24;hour++) {
      const time=(day*24+hour)*HOUR,context=contextAt(seed,day,hour,options.shiftDay);
      const sleeping=hour<6||hour>=22;
      for(let i=0;i<population.length;i++) {
        const resident=population[i],{agent,id}=resident,monitor=monitors[i];
        advanceNeeds(agent,id,time,sleeping);
        if(agent.energy>=25&&agent.hunger<=75&&agent.health>=65)monitor.ok++;
        const candidates=availableScenarios(agent,context);
        const placeIndex=(hashSeed(id)+(options.shiftDay!==null&&day>=options.shiftDay?1:0))%places.length;
        const choice=selector(agent,id,context,places[placeIndex],options.policy);
        if(!candidates.some(s=>s.id===choice.id))throw Error("Selector violated hard priority/gate");
        const best=oracleReward(agent,id,context,time);
        const steps=actionSteps(choice.place,choice.title,choice.kind);
        const duration=steps.reduce((n,s)=>n+s.duration,0)*1000;
        if(!(duration>0&&duration<=HOUR))throw Error("Ordinary-plan duration outside profile");
        const plan:PersonPlan={createdAt:context.fetchedAt,pausedMs:0,simStartedAt:time,
          from:choice.place,steps,transport:choice.transport==="plane"?"bus":choice.transport,generator:"rules"};
        agent.pending={id:`synthetic:${seed}:${i}:${day}:${hour}`,scenarioId:choice.id,
          startedSimMs:time,durationMs:duration,completed:false,
          context:decisionContext(agent,context.weather),planKey:planKey(plan)};
        const predicted=expectedReward(project(agent,id,time+duration,sleeping),choice);
        const samples=agent.samples;
        advanceNeeds(agent,id,time+duration,sleeping);
        const at=new Date(BASE_DAY+time+duration-7*HOUR).toISOString();
        if(!settleLearning(agent,time+duration,at,pendingPlanMatches(agent.pending,plan)) ||
          agent.samples!==samples+1 || !Number.isFinite(agent.lastReward) ||
          Math.abs(agent.lastReward!-predicted)>1e-12)throw Error("Settlement/expected reward mismatch");
        const reward=agent.lastReward!;
        if(reward < -1 || reward > 1 || reward > best+1e-12)throw Error("Invalid reward/oracle bound");
        totalReturn+=reward;dayReward+=reward;totalRegret+=Math.max(0,best-reward);completedPlans++;
        const index=actionIndex.get(choice.id)!;monitor.counts[index]++;
        if(candidates.length===1)totalForced++;else monitor.voluntary[index]++;
        if(resident.last===choice.id)resident.repeated++;
        resident.last=choice.id;
      }
    }
    dailyReturn.push(dayReward/options.agents);
    dailyNeedOk.push(monitors.reduce((n,m)=>n+m.ok/24,0)/options.agents);
    for(let i=0;i<population.length;i++) {
      const monitor=monitors[i],share=Math.max(...monitor.counts)/24;
      population[i].needRatios.push(monitor.ok/24);
      totalEntropy+=normalizedEntropy(monitor.counts);
      totalVoluntaryEntropy+=normalizedEntropy(monitor.voluntary);
      totalShare+=share;worstShare=Math.max(worstShare,share);
    }
  }
  const competence=population.map(r=>competenceDay(r.needRatios));
  const recovery=options.shiftDay===null?[]:population.map(r=>competenceDay(r.needRatios,options.shiftDay!));
  const attained=competence.filter((n):n is number=>n!==null);
  const recovered=recovery.filter((n):n is number=>n!==null);
  const agentDays=options.agents*options.days;
  return {seed,completedPlans,trainedSamples:population.reduce((n,r)=>n+r.agent.samples,0),
    returnPerAgentDay:totalReturn/agentDays,
    immediateRegretPerAgentDay:totalRegret/agentDays,
    needOkRatio:dailyNeedOk.reduce((a,b)=>a+b,0)/options.days,
    timeToCompetenceDays:attained.length?attained.reduce((a,b)=>a+b,0)/attained.length:null,
    competentFraction:attained.length/options.agents,
    daysToRecover:recovered.length?recovered.reduce((a,b)=>a+b,0)/recovered.length:null,
    recoveredFraction:recovery.length?recovered.length/options.agents:null,
    actionEntropy:totalEntropy/agentDays,
    voluntaryActionEntropy:totalVoluntaryEntropy/agentDays,
    repeatRate:population.reduce((n,r)=>n+r.repeated/(options.days*24-1),0)/options.agents,
    meanMaxActionShare:totalShare/agentDays,worstAgentDayActionShare:worstShare,
    forcedFraction:totalForced/completedPlans,dailyNeedOk,dailyReturn};
}

export function runLearningRollout(options: RolloutOptions, selector: Selector = chooseScenario) {
  validate(options);
  const runs=options.seeds.map(seed=>seedRun(options,seed,selector));
  const metrics=["returnPerAgentDay","immediateRegretPerAgentDay","needOkRatio",
    "timeToCompetenceDays","competentFraction","daysToRecover","recoveredFraction",
    "actionEntropy","voluntaryActionEntropy","repeatRate","meanMaxActionShare",
    "worstAgentDayActionShare","forcedFraction"] as const;
  const summary=Object.fromEntries(metrics.map(key=>[key,summarize(runs.map(r=>r[key]).filter((v):v is number=>v!==null))]));
  return {kind:"synthetic-hourly-ordinary-rollout-v1",config:{...options,seeds:[...options.seeds]},
    acceptanceProfile:options.agents===24&&options.days===60&&options.seeds.length>=20&&options.shiftDay===30,
    runtime:["initializeAgent","chooseScenario","availableScenarios","actionSteps","advanceNeeds","pendingPlanMatches","settleLearning"],
    oracle:"Depth-1 feasible completion reward on each policy's own state, same elapsed needs drift. Not counterfactual long-horizon regret.",
    sampling:"One completed ordinary plan per agent per simulation hour; 3-minute actionSteps, hourly gaps. No social encounters, travel/ground/city cohort simulation.",
    intervention:"Seeded rain probability .2 to .8 and role-place rotation on shiftDay; no live weather or law/calendar claims.",
    uncertainty:"95% Student-t intervals over independent seed means; competence/recovery means conditional on attainment, fractions report censoring.",
    socialDensity:null,diffusionDays:null,
    productionAccess:false,runs,summary};
}
