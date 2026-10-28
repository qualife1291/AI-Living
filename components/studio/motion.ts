import {scenarioFrame,type ActorFrame,type ScenarioFrame,type ScenarioId,type Vec3} from '../../lib/city/scenarios/index.ts';
// Studio uses the city's authored chibi proportions and navigation footprint.
// One vertical stage transform applies to scenery, props, cues and cameras alike.
export const STAGE_Y=.34;
export const stagePoint=(p:readonly number[]):Vec3=>[p[0],p[1]*STAGE_Y,p[2]];
export function motionSamples(id:ScenarioId,time:number){return Array.from({length:9},(_,i)=>scenarioFrame(id,Math.max(0,time-i*.075)));}
function clipFor(actor:ActorFrame,frame:ScenarioFrame){if(actor.speedMps>.005)return actor.clip;if(frame.dialogue.some(l=>l.speaker===actor.id))return 'talk';if(frame.dialogue.length&&!actor.handTargets)return 'listen';return actor.clip;}
/** Causal .6s raised-cosine envelope; same result after playing or arbitrary seek. */
export function studioMotion(actor:ActorFrame,frames:ScenarioFrame[]){
 const layers=new Map<string,{clip:string;time:number;weight:number}>();let total=0,contact=0;const sums={right:[0,0,0],left:[0,0,0]},weights={right:0,left:0};
 frames.forEach((frame,i)=>{const a=frame.actors.find(a=>a.id===actor.id)!;const w=1+Math.cos(Math.PI*i/9),clip=clipFor(a,frame),v=layers.get(clip)??{clip,time:/walk|sprint/.test(clip)?actor.animationPhase*(clip==='sprint'?.5:2/3):frames[0].time,weight:0};v.weight+=w;layers.set(clip,v);total+=w;
  for(const side of ['left','right'] as const){const p=a.handTargets?.[side];if(!p)continue;weights[side]+=w;for(let n=0;n<3;n++)sums[side][n]+=stagePoint(p)[n]*w;}
  if(a.handTargets)contact+=w;
 });
 const targets:{right?:Vec3;left?:Vec3}={};for(const side of ['left','right'] as const)if(weights[side])targets[side]=sums[side].map(v=>v/weights[side]) as Vec3;
 // Approach and withdrawal keep the last known target while the reach fades.
 const low=Object.values(targets).some(p=>p[1]<1.5),bend=low?Math.min(1,contact/total):0;
 return{layers:[...layers.values()].map(v=>({...v,weight:v.weight/total})),targets,strength:contact/total,bend};
}
