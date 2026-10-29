import {scenarioFrame,type ActorFrame,type ScenarioFrame,type ScenarioId,type Vec3} from '../../lib/city/scenarios/index.ts';
// Citizens, scenery, props, cues and cameras share the same world-unit scale.
// Compressing only Y made natural human rigs too short for the authored contacts.
export const STAGE_Y=1;
export const stagePoint=(p:readonly number[]):Vec3=>[p[0],p[1]*STAGE_Y,p[2]];
export function motionSamples(id:ScenarioId,time:number){return Array.from({length:49},(_,i)=>scenarioFrame(id,Math.max(0,time-i*.0125)));}
function clipFor(actor:ActorFrame,frame:ScenarioFrame){if(actor.speedMps>.005)return actor.clip;if(frame.dialogue.some(l=>l.speaker===actor.id))return 'talk';if(frame.dialogue.length&&!actor.handTargets)return 'listen';return actor.clip;}
/** Causal .6s raised-cosine envelope; same result after playing or arbitrary seek. */
export function studioMotion(actor:ActorFrame,frames:ScenarioFrame[]){
 const layers=new Map<string,{clip:string;time:number;weight:number}>();let total=0,contact=0,lowContact=0;const sums={right:[0,0,0],left:[0,0,0]},weights={right:0,left:0};
 frames.forEach((frame,i)=>{const a=frame.actors.find(a=>a.id===actor.id)!;const w=Math.sin(Math.PI*i/48)**2,clip=clipFor(a,frame),v=layers.get(clip)??{clip,time:/walk|sprint/.test(clip)?actor.animationPhase*(clip==='sprint'?.5:2/3):frames[0].time,weight:0};v.weight+=w;layers.set(clip,v);total+=w;
  const goals={...a.handTargets};
  for(const prop of frame.props.filter(p=>p.visible&&p.holderId===a.id&&p.attachment!=='pocket'&&p.attachment!=='wrap')){const side=prop.attachment==='left-hand'?'left':'right';goals[side]??=prop.position;}
  for(const side of ['left','right'] as const){const p=goals[side];if(!p)continue;weights[side]+=w;const dx=p[0]-a.position[0],dz=p[2]-a.position[2],yaw=actor.yaw-a.yaw,point=stagePoint([actor.position[0]+dx*Math.cos(yaw)+dz*Math.sin(yaw),p[1],actor.position[2]+dz*Math.cos(yaw)-dx*Math.sin(yaw)]);for(let n=0;n<3;n++)sums[side][n]+=point[n]*w;}
  if(Object.keys(goals).length)contact+=w;if(Object.values(goals).some(p=>stagePoint(p!)[1]<1.5))lowContact+=w;
 });
 const targets:{right?:Vec3;left?:Vec3}={};for(const side of ['left','right'] as const)if(weights[side]>1e-8)targets[side]=sums[side].map(v=>v/weights[side]) as Vec3;
 // Approach and withdrawal keep the last known target while the reach fades.
 const bend=Math.min(1,lowContact/total);
 return{layers:[...layers.values()].map(v=>({...v,weight:v.weight/total})),targets,strength:contact/total,strengths:{right:weights.right/total,left:weights.left/total},bend};
}
