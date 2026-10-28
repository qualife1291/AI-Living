import {z} from 'zod';
import type {World} from '../world';
import {actorsAt,animalsAt,distance,type Actor,type Point} from '../life.ts';
import {crowdAt} from './engine.ts';
import {WalkDirector} from '../city/walkability.ts';
import {TrafficDirector,vehicleContains,type TrafficVehicle} from '../city/traffic.ts';
import {walkStateSchema,trafficStateSchema} from '../city/director-state.ts';
import {bodyWalkable,bodySegmentWalkable} from '../city/walk-ground.ts';
import {groundHash,groundGeometrySha256,serverGroundTime,GroundTimelineError} from './ground-timeline.ts';
import {descriptorSchema,sharedFrameSchema,SHARED_SCOPE,type SharedDescriptor,type SharedFrame} from './shared-ground-view.ts';
export const SHARED_LIMITS=Object.freeze({worldBytes:2097152,stateBytes:1887436,sourcePage:8,sourceBatchBytes:8388608,realTickMs:100,outerTicksPerBatch:20,physicsStepsPerBatch:120,frames:20,requestBytes:2048});
const count=z.number().int().nonnegative().safe(),num=z.number().finite().nonnegative(),hash=z.string().regex(/^[a-f0-9]{64}$/);
export const sharedStateSchema=z.object({version:z.literal(2),scope:z.literal(SHARED_SCOPE),sessionId:z.string().uuid(),worldBorn:z.string().datetime({offset:true}),geometrySha256:hash,genesisRealMs:num,cursorRealMs:num,simMs:num,sourceSeq:count.positive(),sourceSha256:hash,sourceRevision:count,sequence:count,walk:walkStateSchema,traffic:trafficStateSchema,descriptors:z.array(descriptorSchema).max(5000),frames:z.array(sharedFrameSchema).min(1).max(20),holds:count,lastReceiptDigest:hash.nullable(),nonce:z.string().uuid()}).strict();
export type SharedState=z.infer<typeof sharedStateSchema>;
export type SharedSource={seq:number;revision:number;capturedAt:number;raw:string};
export type Lifecycle={sourceSeq:number;revision:number;kind:'source'|'plan'|'enter'|'leave'|'clock';actorId?:string;before?:string;after?:string};
const fail=(code:string):never=>{throw new GroundTimelineError(code);};
export const sharedGeometrySha=()=>groundGeometrySha256().then(geometry=>groundHash({version:2,geometry,limits:SHARED_LIMITS,physics:'serialized-directors-continuous-check-v1'}));
function sourceWorld(source:SharedSource):World {
 if(!Number.isSafeInteger(source.seq)||source.seq<1||!Number.isSafeInteger(source.revision)||source.revision<0||!Number.isFinite(source.capturedAt)||new TextEncoder().encode(source.raw).byteLength>SHARED_LIMITS.worldBytes)fail('shared-source-invalid');
 const w=JSON.parse(source.raw) as World;serverGroundTime(w,source.capturedAt);
 const humans=[...w.people,...(w.living?.residents??[])];
 if(w.people.length!==3||humans.length>243||new Set(humans.map(p=>p.id)).size!==humans.length||humans.some(p=>!/^[a-z][a-z0-9-]{0,99}$/.test(p.id))||w.living&&w.living.residents.some(p=>!w.living!.catalog.roles.some(r=>r.id===p.roleId)))fail('shared-roster-invalid');
 return w;
}
export function projectionWorld(world:World,simMs:number):World {return {...world,clock:{...world.clock,pausedAt:0,pausedMs:world.clock?.pausedMs??0,scale:1,anchors:[{realMs:0,simMs,scale:1}]}};}
function projections(world:World,simMs:number){const view=projectionWorld(world,simMs);return {view,humans:[...actorsAt(view,0),...(view.living?crowdAt(view.living,view,0,undefined,240):[])],animals:animalsAt(view,0)};}
function descriptor(a:Actor):SharedDescriptor {
 return descriptorSchema.parse({id:a.id,name:a.name,from:a.from,location:a.location,activity:a.activity,kind:a.kind,source:a.source,...(a.transport?{transport:a.transport}:{}),...(a.homeAnchor?{homeAnchor:a.homeAnchor}:{}),...(a.tagGame?{tagGame:a.tagGame}:{}),...(a.petOwnerId?{petOwnerId:a.petOwnerId}:{}),...(a.bicycle?{bicycleRadius:a.bicycle.radius}:{})});
}
function appendFrame(s:SharedState,actors:Actor[],cars:TrafficVehicle[],realMs:number,simMs:number,sourceSeq:number){
 const byText=new Map(s.descriptors.map((d,i)=>[JSON.stringify(d),i]));
 const poses:SharedFrame['poses']=actors.map(a=>{const d=descriptor(a),key=JSON.stringify(d);let index=byText.get(key);if(index===undefined){index=s.descriptors.length;s.descriptors.push(d);byText.set(key,index);}return[index,[...a.position],a.walking,a.stationaryFor??0,a.bicycle?.yaw??0,a.bicycle?.distance??0];});
 if(cars.some(c=>c.type!=='car'))fail('shared-unsupported-traffic');
 const f={realMs,simMs,sourceSeq,poses,cars:structuredClone(cars) as SharedFrame['cars']};
 if(s.frames.at(-1)?.realMs===realMs)s.frames.pop();s.frames.push(f);if(s.frames.length>20)s.frames.shift();
}
function compact(s:SharedState){const used=new Set(s.frames.flatMap(f=>f.poses.map(p=>p[0]))),keys=[...used].sort((a,b)=>JSON.stringify(s.descriptors[a])<JSON.stringify(s.descriptors[b])?-1:1),mapping=new Map(keys.map((key,i)=>[key,i]));s.descriptors=keys.map(k=>s.descriptors[k]);s.frames.forEach(f=>f.poses.forEach(p=>{p[0]=mapping.get(p[0])!;}));}
function closest(a:Point,b:Point,c:Point,d:Point){const x=a[0]-c[0],z=a[1]-c[1],dx=b[0]-a[0]-d[0]+c[0],dz=b[1]-a[1]-d[1]+c[1],den=dx*dx+dz*dz,t=den?Math.max(0,Math.min(1,-(x*dx+z*dz)/den)):0;return Math.hypot(x+t*dx,z+t*dz);}
function safe(previous:Actor[],next:Actor[],oldCars:TrafficVehicle[],cars:TrafficVehicle[],deltaSeconds:number){
 const old=new Map(previous.map(a=>[a.id,a]));
 for(let i=0;i<next.length;i++){
  const a=next[i],p=old.get(a.id),radius=a.bicycle?.radius??4.8;
  if(!bodyWalkable(a.position,radius)||p&&(!bodySegmentWalkable(p.position,a.position,radius)||distance(p.position,a.position)>28*deltaSeconds+.00001))return false;
  for(let j=0;j<i;j++){const b=next[j],q=old.get(b.id),spacing=radius+(b.bicycle?.radius??4.8)+.35;if(closest(p?.position??a.position,a.position,q?.position??b.position,b.position)<spacing-1e-7)return false;}
  for(let k=0;k<cars.length;k++){
   const car=cars[k],before=oldCars[k]??car,turn=Math.atan2(Math.sin(car.yaw-before.yaw),Math.cos(car.yaw-before.yaw)),travel=distance(car.position,before.position),ped=distance(p?.position??a.position,a.position);
   const margin=(travel+Math.hypot(car.length/2,car.width/2)*Math.abs(turn)+ped)/8+travel*Math.abs(turn)/8+.001;
   for(let n=0;n<=4;n++){const t=n/4,point:Point=[(p?.position[0]??a.position[0])+(a.position[0]-(p?.position[0]??a.position[0]))*t,(p?.position[1]??a.position[1])+(a.position[1]-(p?.position[1]??a.position[1]))*t];if(vehicleContains({...car,position:[before.position[0]+(car.position[0]-before.position[0])*t,before.position[1]+(car.position[1]-before.position[1])*t],yaw:before.yaw+turn*t},point,radius+margin))return false;}
  }
 }
 for(let i=0;i<cars.length;i++)for(let j=0;j<i;j++)if(closest(oldCars[i]?.position??cars[i].position,cars[i].position,oldCars[j]?.position??cars[j].position,cars[j].position)<Math.hypot(cars[i].length,cars[i].width)+.01)return false;
 return true;
}
function currentActors(s:SharedState):Actor[]{const frame=s.frames.at(-1)!;return frame.poses.map(([key,position,walking,stationaryFor,yaw,travel])=>{const {bicycleRadius,...d}=s.descriptors[key];return {...d,position,walking,stationaryFor,progress:0,path:[position],...(bicycleRadius?{bicycle:{yaw,distance:travel,radius:bicycleRadius}}:{})} as Actor;});}
export async function bootstrapShared(source:SharedSource,sessionId:string):Promise<SharedState>{
 const world=sourceWorld(source),simMs=serverGroundTime(world,source.capturedAt),walk=new WalkDirector(),traffic=new TrafficDirector(),p=projections(world,simMs);
 const cars=traffic.frame(simMs/1000),actors=walk.frame(p.view,p.humans,simMs/1000,cars,p.animals);
 const s={version:2,scope:SHARED_SCOPE,sessionId,worldBorn:world.born,geometrySha256:await sharedGeometrySha(),genesisRealMs:source.capturedAt,cursorRealMs:source.capturedAt,simMs,sourceSeq:source.seq,sourceSha256:await groundHash(source.raw),sourceRevision:source.revision,sequence:0,walk:walk.exportState(),traffic:traffic.exportState(),descriptors:[],frames:[],holds:0,lastReceiptDigest:null,nonce:crypto.randomUUID()} as unknown as SharedState;
 appendFrame(s,actors,cars,source.capturedAt,simMs,source.seq);compact(s);return validateSharedState(s);
}
export async function validateSharedState(value:unknown){
 const s=sharedStateSchema.parse(value);if(s.geometrySha256!==await sharedGeometrySha()||s.cursorRealMs<s.genesisRealMs||s.frames.at(-1)!.realMs!==s.cursorRealMs||s.frames.at(-1)!.simMs!==s.simMs)fail('shared-state-integrity');
 const walk=new WalkDirector(),traffic=new TrafficDirector();walk.restoreState(s.walk);traffic.restoreState(s.traffic);
 if(s.frames.some((f,i)=>i>0&&f.realMs<=s.frames[i-1].realMs||f.poses.some(p=>!s.descriptors[p[0]])))fail('shared-frame-integrity');
 const actors=currentActors(s);if(!safe(actors,actors,s.frames.at(-1)!.cars,s.frames.at(-1)!.cars,0))fail('shared-position-integrity');return s;
}
async function lifecycle(a:World,b:World,source:SharedSource):Promise<Lifecycle[]>{
 const before=new Map([...a.people,...(a.living?.residents??[])].map(p=>[p.id,p])),after=new Map([...b.people,...(b.living?.residents??[])].map(p=>[p.id,p]));
 const out:Lifecycle[]=[{sourceSeq:source.seq,revision:source.revision,kind:'source'}];
 for(const [id,p]of before)if(!after.has(id))out.push({sourceSeq:source.seq,revision:source.revision,kind:'leave',actorId:id,before:await groundHash(p.plan??null)});
 for(const [id,p]of after){const old=before.get(id);if(!old)out.push({sourceSeq:source.seq,revision:source.revision,kind:'enter',actorId:id,after:await groundHash(p.plan??null)});else{const first=await groundHash(old.plan??null),second=await groundHash(p.plan??null);if(first!==second)out.push({sourceSeq:source.seq,revision:source.revision,kind:'plan',actorId:id,before:first,after:second});}}
 if(a.paused!==b.paused||(a.clock?.scale??1)!==(b.clock?.scale??1))out.push({sourceSeq:source.seq,revision:source.revision,kind:'clock'});return out;
}
/** Replay acceptance boundaries, with whole real ticks independent of invocation size/viewer. */
export async function replayShared(previous:SharedState,current:SharedSource,sources:SharedSource[],targetRealMs:number,nextBoundary:number|null=null){
 const s=await validateSharedState(previous);let world=sourceWorld(current);
 if(world.born!==s.worldBorn||current.seq!==s.sourceSeq||await groundHash(current.raw)!==s.sourceSha256||targetRealMs<s.cursorRealMs)fail('shared-source-or-clock-mismatch');
 if(sources.length>8||sources.some((r,i)=>r.seq<=(i?sources[i-1].seq:current.seq)||r.revision!==(i?sources[i-1].revision:current.revision)+1||r.capturedAt<(i?sources[i-1].capturedAt:s.cursorRealMs)))fail('shared-source-order');
 const walk=new WalkDirector(),traffic=new TrafficDirector();walk.restoreState(s.walk);traffic.restoreState(s.traffic);
 let index=0,physicsSteps=0,outerTicks=0;const events:Lifecycle[]=[];
 const adopt=async()=>{while(index<sources.length&&sources[index].capturedAt<=s.cursorRealMs+.0001){const source=sources[index++],next=sourceWorld(source);if(next.born!==s.worldBorn)fail('shared-world-identity');events.push(...await lifecycle(world,next,source));world=next;s.sourceSeq=source.seq;s.sourceRevision=source.revision;s.sourceSha256=await groundHash(source.raw);}};
 await adopt();
 const target=s.genesisRealMs+Math.floor((targetRealMs-s.genesisRealMs)/100)*100;
 while(outerTicks<20&&s.cursorRealMs+100<=target+.0001){
  const tickEnd=s.cursorRealMs+100;if(nextBoundary!==null&&nextBoundary<=tickEnd)break;
  let at=s.cursorRealMs,temp=world,scan=index,cost=0;
  while(at<tickEnd-.00001){while(scan<sources.length&&sources[scan].capturedAt<=at+.0001)temp=sourceWorld(sources[scan++]);const end=Math.min(tickEnd,sources[scan]?.capturedAt??Infinity),rate=temp.paused?0:temp.clock?.scale??1;cost+=rate?Math.ceil((end-at)*rate/100-1e-8):1;at=end;}
  if(physicsSteps+cost>120)break;
  while(s.cursorRealMs<tickEnd-.00001){
   await adopt();const boundary=Math.min(tickEnd,sources[index]?.capturedAt??Infinity),rate=world.paused?0:world.clock?.scale??1;
   const realStep=rate?Math.min(100/rate,boundary-s.cursorRealMs):boundary-s.cursorRealMs,newReal=s.cursorRealMs+realStep,newSim=s.simMs+realStep*rate;
   const p=projections(world,newSim),before=currentActors(s),oldCars=s.frames.at(-1)!.cars,oldWalk=walk.exportState(),oldTraffic=traffic.exportState();
   let cars=traffic.frame(newSim/1000,before.map(a=>a.position),before.map(a=>a.bicycle?.radius??4.8));
   let actors=walk.frame(p.view,p.humans,newSim/1000,cars,p.animals);
   if(!safe(before,actors,oldCars,cars,realStep*rate/1000)){
    traffic.restoreState(oldTraffic);traffic.holdAt(newSim/1000);cars=oldCars.map(c=>({...c,speed:0}));walk.restoreState(oldWalk);actors=walk.frame(p.view,p.humans,newSim/1000,cars,p.animals);s.holds++;
    if(!safe(before,actors,oldCars,cars,realStep*rate/1000)){walk.restoreState(oldWalk);walk.holdAt(newSim/1000);const active=new Set([...p.humans,...p.animals].map(a=>a.id));actors=before.filter(a=>active.has(a.id)).map(a=>({...a,walking:false}));}
   }
   walk.retain(new Set(actors.map(a=>a.id)));s.cursorRealMs=newReal;s.simMs=newSim;appendFrame(s,actors,cars,newReal,newSim,s.sourceSeq);physicsSteps++;
  }
  s.cursorRealMs=tickEnd;s.frames.at(-1)!.realMs=tickEnd;outerTicks++;await adopt();
 }
 s.walk=walk.exportState();s.traffic=traffic.exportState();compact(s);
 return {state:await validateSharedState(s),events,physicsSteps,outerTicks,consumedSources:index,backlogMs:Math.max(0,targetRealMs-s.cursorRealMs)};
}
