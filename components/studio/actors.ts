import type {ScenarioFrame} from '../../lib/city/scenarios/index.ts';
import type {StudioAvatar} from './avatar.ts';
import {stagePoint,motionSamples,studioMotion} from './motion.ts';
export function poseStudioActors(actors:Map<string,StudioAvatar>,frame:ScenarioFrame){
 const samples=motionSamples(frame.id,frame.time),contacts=[];
 for(const actor of frame.actors){const avatar=actors.get(actor.id);if(!avatar)continue;const motion=studioMotion(actor,samples);
  avatar.poseTimeline(motion.layers,stagePoint(actor.position),actor.yaw,motion.bend);for(const side of ['left','right'] as const)if(motion.targets[side])avatar.reachTimeline({[side]:motion.targets[side]},motion.strengths[side]);
  contacts.push({id:actor.id,skinned:true,height:avatar.height,head:avatar.head().toArray(),hands:{right:avatar.hand('right').toArray(),left:avatar.hand('left').toArray()},targets:motion.targets,reach:motion.strength});
 }
 return contacts;
}
