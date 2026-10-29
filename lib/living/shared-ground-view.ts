/** Read-only server frame decoding/sampling. No physics, source inference or extrapolation. */
import {z} from 'zod';
import {STEP_KINDS} from '../event-schema.ts';
import type {Actor} from '../life';
import type {TrafficVehicle} from '../city/traffic';
import {MAX_WORLD_BODIES} from '../city/director-state.ts';
const num=z.number().finite(),point=z.tuple([num.min(-5000).max(5000),num.min(-5000).max(5000)]),count=num.int().nonnegative().safe();
export const SHARED_SCOPE='server-shared-ground-v2';
export const descriptorSchema=z.object({id:z.string().regex(/^[a-z][a-z0-9-]{0,99}$/),name:z.string().max(100),from:z.string().max(100),location:z.string().max(100),activity:z.string().max(240),kind:z.enum(STEP_KINDS),source:z.enum(['plan','routine']),transport:z.enum(['walk','bicycle','motorbike','bus','metro']).optional(),homeAnchor:point.optional(),tagGame:z.object({peerId:z.string().max(100),role:z.enum(['chaser','runner']),swaps:count}).strict().optional(),petOwnerId:z.string().max(100).optional(),bicycleRadius:num.positive().max(10).optional()}).strict();
export const sharedFrameSchema=z.object({realMs:num.nonnegative(),simMs:num.nonnegative(),sourceSeq:count,poses:z.array(z.tuple([count,point,z.boolean(),num.nonnegative(),num,num.nonnegative()])).max(MAX_WORLD_BODIES),cars:z.array(z.object({id:z.string().max(100),position:point,yaw:num,type:z.literal('car'),width:num.positive(),length:num.positive(),height:num.positive(),speed:num.nonnegative().max(24.000001)}).strict()).length(12)}).strict();
export const sharedViewSchema=z.object({version:z.literal(2),scope:z.literal(SHARED_SCOPE),worldBorn:z.string().datetime({offset:true}),checkpoint:z.string().regex(/^[a-f0-9]{64}$/),sequence:count,sourceRevision:count,cursorRealMs:num.nonnegative(),simMs:num.nonnegative(),backlogMs:num.nonnegative(),paused:z.boolean(),descriptors:z.array(descriptorSchema).max(5000),frames:z.array(sharedFrameSchema).min(1).max(20),eligibleForReward:z.literal(false),eligibleForP2P:z.literal(false)}).strict();
export type SharedGroundView=z.infer<typeof sharedViewSchema>;
export type SharedFrame=z.infer<typeof sharedFrameSchema>;
export type SharedDescriptor=z.infer<typeof descriptorSchema>;
export function validateSharedView(value:unknown):SharedGroundView {
 const view=sharedViewSchema.parse(value);
 for(let i=0;i<view.frames.length;i++){
  const f=view.frames[i];
  if(i&&f.realMs<=view.frames[i-1].realMs||f.realMs>view.cursorRealMs+.001||f.simMs>view.simMs+.001||f.poses.some(p=>!view.descriptors[p[0]])||new Set(f.poses.map(p=>view.descriptors[p[0]].id)).size!==f.poses.length||new Set(f.cars.map(c=>c.id)).size!==12)throw Error('Invalid shared frame');
 }
 return view;
}
const decoded=new WeakMap<SharedGroundView,Map<SharedFrame,{actors:Actor[];cars:TrafficVehicle[]}>>();
export function decodeSharedFrame(view:SharedGroundView,frame:SharedFrame){
 let cache=decoded.get(view);if(!cache){cache=new Map();decoded.set(view,cache);}const found=cache.get(frame);if(found)return found;
 const result={actors:frame.poses.map(([key,position,walking,stationaryFor,heading,travelled])=>{
  const {bicycleRadius,...d}=view.descriptors[key];
  return {...d,position:[...position],walking,stationaryFor,progress:0,path:[[...position]],...(bicycleRadius?{bicycle:{yaw:heading,distance:travelled,radius:bicycleRadius}}:{})} as Actor;
 }),cars:frame.cars as TrafficVehicle[]};cache.set(frame,result);return result;
}
/** Same absolute target time yields the same poses regardless of viewer arrival or selection. */
export function sampleSharedGround(view:SharedGroundView,realMs:number){
 if(!Number.isFinite(realMs)){const f=view.frames.at(-1)!;return {...decodeSharedFrame(view,f),realMs:f.realMs,simMs:f.simMs,sourceSeq:f.sourceSeq};}
 const frames=view.frames;let index=0;while(index+1<frames.length&&frames[index+1].realMs<=realMs)index++;
 const a=frames[index],b=frames[index+1];const first=decodeSharedFrame(view,a);
 if(!b||realMs<=a.realMs)return {...first,realMs:a.realMs,simMs:a.simMs,sourceSeq:a.sourceSeq};
 const t=Math.max(0,Math.min(1,(realMs-a.realMs)/(b.realMs-a.realMs))),second=decodeSharedFrame(view,b),other=new Map(second.actors.map(p=>[p.id,p]));
 // Birth/removal or a different body envelope is a discontinuity, not a swept
 // interval. Hold the entire old frame until the next committed frame exists.
 if(first.actors.length!==second.actors.length||first.actors.some(p=>!other.has(p.id)||(p.bicycle?.radius??4.8)!==(other.get(p.id)!.bicycle?.radius??4.8)))return {...first,realMs:a.realMs,simMs:a.simMs,sourceSeq:a.sourceSeq};
 const blend=(p:readonly number[],q:readonly number[]):[number,number]=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];
 const actors=first.actors.map(p=>{const q=other.get(p.id);if(!q)return p;return {...p,position:blend(p.position,q.position),walking:q.walking,bicycle:p.bicycle&&q.bicycle?{...p.bicycle,yaw:p.bicycle.yaw+Math.atan2(Math.sin(q.bicycle.yaw-p.bicycle.yaw),Math.cos(q.bicycle.yaw-p.bicycle.yaw))*t,distance:p.bicycle.distance+(q.bicycle.distance-p.bicycle.distance)*t}:p.bicycle};});
 const cars=first.cars.map((p,i)=>{const q=second.cars[i];return {...p,position:blend(p.position,q.position),yaw:p.yaw+Math.atan2(Math.sin(q.yaw-p.yaw),Math.cos(q.yaw-p.yaw))*t,speed:p.speed+(q.speed-p.speed)*t};});
 return {actors,cars,realMs,simMs:a.simMs+(b.simMs-a.simMs)*t,sourceSeq:a.sourceSeq};
}
