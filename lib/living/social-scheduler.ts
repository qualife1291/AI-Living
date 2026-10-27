import { computeSimMs, hashSeed, worldTime } from "../clock.ts";
import { actorTransition, distance } from "../life.ts";
import { crowdAt } from "./engine.ts";
import { initializeAgent } from "./learning.ts";
import { meetingSteps } from "./activities.ts";
import type { World } from "../world";
/** Pure, simulation-time scheduling. Persist the result with world revision CAS. */
export function scheduleResidentSocial(input: World, now: number) {
  if (!input.living || input.paused) return { world: input, changed: false, pairs: 0 };
  const sim = computeSimMs(input.born,input.clock,now), old = input.living.socialSchedule;
  if (old && sim >= old.checkedSimMs && sim-old.checkedSimMs < 20000) return {world:input,changed:false,pairs:0};
  const world=structuredClone(input),state=world.living!, schedule=state.socialSchedule ??= {checkedSimMs:sim,cooldowns:{},pending:[]};
  const elapsed=old ? Math.max(0,Math.min(300,(sim-old.checkedSimMs)/1000)) : 0;
  schedule.checkedSimMs=sim;state.learning??={};
  const residents=new Map(state.residents.map(r=>[r.id,r]));
  for(const resident of state.residents){const agent=state.learning[resident.id]??=initializeAgent(resident.id);agent.socialNeed=Math.min(100,(agent.socialNeed??50)+elapsed*.03);}
  for(const meeting of schedule.pending){
    if(sim<meeting.startedSimMs+meeting.durationMs)continue;
    const a=residents.get(meeting.a),b=residents.get(meeting.b);
    // A replaced or cancelled plan cannot earn a social outcome.
    if(a?.plan?.simStartedAt!==meeting.startedSimMs||b?.plan?.simStartedAt!==meeting.startedSimMs)continue;
    for(const r of [a,b]){r.familiarity=Math.min(100,r.familiarity+1);state.learning[r.id].socialNeed=Math.max(0,(state.learning[r.id].socialNeed??50)-25);}
  }
  schedule.pending=schedule.pending.filter(p=>sim<p.startedSimMs+p.durationMs);
  for(const key of Object.keys(schedule.cooldowns))if(schedule.cooldowns[key]<=sim)delete schedule.cooldowns[key];
  const hour=worldTime(world,now).hour;
  if(hour<6||hour>=22)return {world,changed:true,pairs:0};
  const busy=(id:string)=>{const p=residents.get(id)?.plan;return p?.simStartedAt!==undefined&&sim<p.simStartedAt+p.steps.reduce((s,v)=>s+v.duration,0)*1000;};
  const actors=crowdAt(state,world,now,undefined,state.residents.length).filter(a=>!a.walking&&!busy(a.id)&&!/^Phòng |Khu dân cư|Bệnh viện|Phòng khám/.test(a.location)&&["social","play","exercise","run"].includes(a.kind));
  actors.sort((a,b)=>(state.learning![b.id].socialNeed??50)-(state.learning![a.id].socialNeed??50)||a.id.localeCompare(b.id));
  const used=new Set<string>();let pairs=0;
  for(const a of actors){
    if(pairs>=8)break;
    if(used.has(a.id)||(state.learning[a.id].socialNeed??50)<45)continue;
    const b=actors.filter(b=>b.id!==a.id&&!used.has(b.id)&&a.location===b.location&&distance(a.position,b.position)<=60&&(state.learning![b.id].socialNeed??50)>=45&&!schedule.cooldowns[[a.id,b.id].sort().join(":")]).sort((b,c)=>distance(a.position,b.position)-distance(a.position,c.position)||b.id.localeCompare(c.id))[0];
    if(!b)continue;
    const id=[a.id,b.id].sort().join(":"),steps=meetingSteps(a.location,"Hỏi thăm và cùng làm một việc nhỏ"),durationMs=steps.reduce((s,v)=>s+v.duration,0)*1000;
    for(const actor of [a,b]){const h=hashSeed(actor.id),position:[number,number]=[actor.position[0]-((h%9)-4)*7,actor.position[1]-((Math.floor(h/9)%7)-3)*5];residents.get(actor.id)!.plan={createdAt:new Date(now).toISOString(),pausedMs:world.clock?.pausedMs??0,simStartedAt:sim,...actorTransition(actor,position),generator:"rules",transport:"walk",steps:structuredClone(steps)};used.add(actor.id);}
    schedule.pending.push({id,a:a.id,b:b.id,location:a.location,startedSimMs:sim,durationMs});schedule.cooldowns[id]=sim+durationMs+60000;pairs++;
  }
  return {world,changed:true,pairs};
}
