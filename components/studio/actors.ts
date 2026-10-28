import type {ScenarioFrame} from '../../lib/city/scenarios/index.ts';
import type {RiggedAvatar} from '../city/three/rigged-avatar.ts';
import {stagePoint,motionSamples,studioMotion} from './motion.ts';
export function poseStudioActors(actors:Map<string,RiggedAvatar>,frame:ScenarioFrame){
 const samples=motionSamples(frame.id,frame.time),contacts=[];
 for(const actor of frame.actors){const avatar=actors.get(actor.id);if(!avatar)continue;const motion=studioMotion(actor,samples);
  for(const prop of frame.props.filter(p=>p.visible&&p.holderId===actor.id&&p.attachment!=="pocket"&&p.attachment!=="wrap")){
   const side=prop.attachment==='left-hand'?'left':'right';if(!motion.targets[side]){motion.targets[side]=stagePoint(prop.position);motion.strength=1;}
  }
  avatar.poseTimeline(motion.layers,stagePoint(actor.position),actor.yaw,motion.bend);avatar.reachTimeline(motion.targets,motion.strength);
  contacts.push({id:actor.id,skinned:true,height:avatar.height,head:avatar.head().toArray(),hands:{right:avatar.hand('right').toArray(),left:avatar.hand('left').toArray()},targets:motion.targets,reach:motion.strength});
 }
 return contacts;
}
