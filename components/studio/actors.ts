import type {ScenarioFrame} from '../../lib/city/scenarios/index.ts';
import type {StudioAvatar} from './avatar.ts';
import {stagePoint,motionSamples,studioMotion} from './motion.ts';
export function poseStudioActors(actors:Map<string,StudioAvatar>,frame:ScenarioFrame){
 const samples=motionSamples(frame.id,frame.time),contacts=[];
 for(const actor of frame.actors){const avatar=actors.get(actor.id);if(!avatar)continue;const motion=studioMotion(actor,samples);
  const goals=Object.values(motion.targets),targetY=goals.length?goals.reduce((s,p)=>s+p[1],0)/goals.length:avatar.height;
  const forward=goals.length?goals.reduce((s,p)=>s+(p[0]-actor.position[0])*Math.sin(actor.yaw)+(p[2]-actor.position[2])*Math.cos(actor.yaw),0)/goals.length:0;
  const lean=motion.bend<.5?Math.min(.38,Math.max(0,(avatar.height*.72-targetY)/avatar.height))*Math.min(1,Math.max(0,forward/2))*motion.strength:0;
  avatar.poseTimeline(motion.layers,stagePoint(actor.position),actor.yaw,motion.bend,lean);for(const side of ['left','right'] as const)if(motion.targets[side])avatar.reachTimeline({[side]:motion.targets[side]},motion.strengths[side]);
  contacts.push({id:actor.id,skinned:true,height:avatar.height,head:avatar.head().toArray(),hands:{right:avatar.hand('right').toArray(),left:avatar.hand('left').toArray()},targets:motion.targets,reach:motion.strength});
 }
 return contacts;
}
