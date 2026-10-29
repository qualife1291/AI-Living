import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { mkdirSync, writeFileSync } from 'node:fs';
import { scenarioDefinitions, scenarioFrame, walletDropHeight } from '../lib/city/scenarios/index.ts';

const args=process.argv.slice(2), selected=args.find(a=>a.startsWith('--suite='))?.slice(8)??'all';
if(args.includes('--auto-patch=true')||args.some(a=>a.startsWith('--render-mode=')))throw new Error('This command measures deterministic scenario logic. Automatic code patching and GPU/video rendering are separate capabilities; no score or rendered video is fabricated.');
const suites=scenarioDefinitions.filter(s=>selected==='all'||s.id===selected);assert.ok(suites.length,`Unknown suite ${selected}`);
const clips=new Set(['idle','walk','sprint','pick-up','holding-right','holding-both','interact-right','emote-yes','emote-no','sit']);
const started=performance.now(),results=[],metrics={};
const test=(name,run)=>{try{run();results.push({name,ok:true});}catch(e){results.push({name,ok:false,error:e.message});}};
const gap=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
function swept(a0,a1,b0,b1){const p=[a0[0]-b0[0],a0[2]-b0[2]],v=[a1[0]-a0[0]-b1[0]+b0[0],a1[2]-a0[2]-b1[2]+b0[2]],at=Math.max(0,Math.min(1,-(p[0]*v[0]+p[1]*v[1])/(v[0]**2+v[1]**2||1)));return Math.hypot(p[0]+v[0]*at,p[1]+v[1]*at);}

test('four explicit 120-second casts, ages, palettes and five camera specifications',()=>{
 assert.equal(scenarioDefinitions.length,4);assert.equal(new Set(scenarioDefinitions.map(s=>s.id)).size,4);
 for(const d of scenarioDefinitions){assert.equal(d.duration,120);assert.equal(d.shots.length,5);assert.equal(d.shots[0].at,0);assert.equal(new Set(d.cast.map(a=>a.id)).size,d.cast.length);for(const a of d.cast){assert.ok(a.age>0&&a.heightMeters>0&&a.radius>0);assert.match(a.wardrobe.shirt,/^#[a-f0-9]{6}$/i);}for(const s of d.shots)assert.ok(s.lensMm>=24&&s.lensMm<=105&&s.aperture>0);}
 assert.equal(scenarioDefinitions.find(s=>s.id==='wallet-return').cast.find(a=>a.id==='minh').age,62);
 assert.equal(scenarioDefinitions.find(s=>s.id==='kitten-care').cast.find(a=>a.id==='mai').age,8);
 assert.equal(scenarioDefinitions.find(s=>s.id==='bakery-courtesy').cast.find(a=>a.id==='ba').mobility,'crutch');
});

for(const d of suites)test(`${d.id}: 7201 frames have bounded travel, swept personal space, obstacle clearance and camera motion`,()=>{
 const snapshot=JSON.stringify(scenarioDefinitions);let previous,minGap=Infinity,maxSpeed=0,maxActorStep=0,maxPropStep=0,maxCameraStep=0,minFocus=Infinity;
 for(let frame=0;frame<=7200;frame++){
  const f=scenarioFrame(d.id,frame/60),humans=f.actors.filter(a=>a.species!=='cat');
  assert.equal(f.time,frame/60);assert.equal(f.complete,frame===7200);assert.equal(f.actors.length,d.cast.length);
  assert.equal(new Set(f.props.map(p=>p.id)).size,f.props.length);assert.equal(new Set(f.events.map(e=>e.type)).size,f.events.length);
  assert.ok(f.events.every(e=>e.at<=f.time));assert.ok(f.dialogue.every(line=>line.at<=f.time&&f.time<line.until));
  for(const a of f.actors){assert.ok([...a.position,a.yaw,a.speedMps,a.travelMeters,a.animationTime,a.animationPhase,a.expression.blend].every(Number.isFinite));assert.ok(clips.has(a.clip));assert.ok(a.speedMps<=2.8&&a.speedMps>=0);assert.ok(a.expression.blend>=0&&a.expression.blend<=1);maxSpeed=Math.max(maxSpeed,a.speedMps);}
  for(const p of f.props){assert.ok([...p.position,...p.rotation,...p.size].every(Number.isFinite));assert.ok(p.size.every(n=>n>0));assert.ok(p.position[1]-p.size[1]/2>=-.001,`${d.id}/${p.id} passes under floor`);assert.equal(p.attachedTo,p.holderId);if(p.holderId)assert.ok(f.actors.some(a=>a.id===p.holderId));}
  assert.ok([...f.camera.position,...f.camera.target,f.camera.fov,f.camera.focusDistance].every(Number.isFinite));assert.ok(f.camera.fov>=13&&f.camera.fov<=54);minFocus=Math.min(minFocus,f.camera.focusDistance);assert.ok(f.camera.focusDistance>20);
  for(let i=0;i<humans.length;i++){
   const a=humans[i];
   for(const o of f.environment.filter(o=>o.solid)){const dx=Math.max(0,Math.abs(a.position[0]-o.position[0])-o.size[0]/2),dz=Math.max(0,Math.abs(a.position[2]-o.position[2])-o.size[2]/2);assert.ok(Math.hypot(dx,dz)>=a.radius-1e-6,`${d.id}/${a.id} overlaps ${o.id} at ${f.time}`);}
   for(let j=i+1;j<humans.length;j++){const b=humans[j],distance=Math.hypot(a.position[0]-b.position[0],a.position[2]-b.position[2]);minGap=Math.min(minGap,distance);assert.ok(distance>=Math.max(8,a.radius+b.radius)-1e-6,`${d.id}/${a.id}/${b.id} overlap at ${f.time}`);if(previous){const oldA=previous.actors.find(p=>p.id===a.id),oldB=previous.actors.find(p=>p.id===b.id);assert.ok(swept(oldA.position,a.position,oldB.position,b.position)>=Math.max(8,a.radius+b.radius)-1e-5,'Swept bodies intersect between frames');}}
  }
  if(previous){for(const a of f.actors){const old=previous.actors.find(o=>o.id===a.id),step=gap(a.position,old.position);maxActorStep=Math.max(maxActorStep,step);assert.ok(step<.5,`${a.id} root teleport at ${f.time}`);const yaw=Math.atan2(Math.sin(a.yaw-old.yaw),Math.cos(a.yaw-old.yaw));assert.ok(Math.abs(yaw)<.16,`${a.id} turns abruptly`);}for(const p of f.props){const old=previous.props.find(o=>o.id===p.id),step=gap(p.position,old.position);maxPropStep=Math.max(maxPropStep,step);assert.ok(step<.7,`${p.id} prop teleport at ${f.time}`);}const step=gap(f.camera.position,previous.camera.position);maxCameraStep=Math.max(maxCameraStep,step);assert.ok(step<3.3,'Camera teleport');}
  previous=f;
 }
 assert.equal(JSON.stringify(scenarioDefinitions),snapshot,'Projection never modifies cast/definition data');
 metrics[d.id]={frames:7201,minimumHumanGapUnits:Number(minGap.toFixed(4)),maximumSpeedMps:Number(maxSpeed.toFixed(4)),maximumActorStepUnits:Number(maxActorStep.toFixed(4)),maximumPropStepUnits:Number(maxPropStep.toFixed(4)),maximumCameraStepUnits:Number(maxCameraStep.toFixed(4)),minimumFocusDistanceUnits:Number(minFocus.toFixed(4)),staticOverlaps:0,sweptHumanOverlaps:0};
});

test('wallet is one conserved item: inspect, identify, offer, return; no reward is taken',()=>{
 const id='wallet-return';for(let t=0;t<=120;t+=.125){const f=scenarioFrame(id,t),wallet=f.props.filter(p=>p.id==='wallet');assert.equal(wallet.length,1);assert.equal(wallet[0].ownerId,'minh');assert.equal(f.state.walletCount,1);assert.equal(f.state.rewardAccepted,false);}
 assert.equal(scenarioFrame(id,12.1).state.walletHolder,null);assert.equal(scenarioFrame(id,42).state.walletHolder,'tuan');assert.equal(scenarioFrame(id,94).state.walletHolder,'minh');
 const events=scenarioFrame(id,120).events;const time=type=>events.find(e=>e.type===type).at;
 assert.ok(time('item-picked')<time('owner-identified')&&time('owner-identified')<time('return-offered')&&time('return-offered')<time('wallet-returned'));
 assert.ok(Math.abs(time('inspection-started')-time('item-noticed')-.35)<1e-8);
 assert.ok(time('reward-offered')<time('reward-declined'));
 const f=scenarioFrame(id,86),wallet=f.props.find(p=>p.id==='wallet');for(const a of f.actors)assert.ok(gap(a.handTargets.right,wallet.position)<1e-9,'Both offered grip targets meet the one item');
});

test('wallet drop obeys gravity and restitution .15 rather than copying a supplied score or bounce',()=>{
 const impact=Math.sqrt(15/98.1),bounceVelocity=98.1*impact*.15,peak=impact+bounceVelocity/98.1;
 assert.ok(Math.abs(walletDropHeight(0)-7.8)<1e-8);assert.ok(Math.abs(walletDropHeight(impact)-.3)<1e-8);
 assert.ok(Math.abs(walletDropHeight(peak)-.3-7.5*.15**2)<1e-8);assert.equal(walletDropHeight(5),.3);
 for(let t=0;t<2;t+=.001)assert.ok(walletDropHeight(t)>=.3-1e-8);
});

test('water and brooms move once in the right order, hands are free before receiving, fatigue settles gradually',()=>{
 const id='sanitation-gratitude',holder=t=>scenarioFrame(id,t).props.find(p=>p.id==='cup').holderId;
 assert.equal(holder(46),null);assert.equal(holder(47),'lan');assert.equal(holder(82),'hanh');
 assert.equal(scenarioFrame(id,70).props.find(p=>p.id==='hanh-broom').holderId,null);
 assert.equal(scenarioFrame(id,101).props.find(p=>p.id==='spare-broom').holderId,null);
 const end=scenarioFrame(id,120);assert.equal(end.props.filter(p=>p.kind==='cup').length,1);assert.equal(end.props.filter(p=>p.kind==='leaf').length,8);assert.equal(end.state.leavesGathered,8);
 const events=end.events,time=type=>events.find(e=>e.type===type).at;assert.ok(time('water-purchased')<time('water-offered')&&time('water-offered')<time('water-received')&&time('water-received')<time('water-sipped'));
 let last=scenarioFrame(id,0);for(let n=1;n<=7200;n++){const f=scenarioFrame(id,n/60);assert.ok(Math.abs(f.state.workerFatigue-last.state.workerFatigue)<.01);assert.ok(Math.abs(f.state.sweepIntensity-last.state.sweepIntensity)<.01);last=f;}
});

test('kitten scene keeps the child back, requests help before care, warms before carrying and avoids a medical tutorial',()=>{
 const id='kitten-care',end=scenarioFrame(id,120),time=type=>end.events.find(e=>e.type===type).at;
 assert.ok(time('child-calls-adult')<time('rescue-contacted')&&time('rescue-contacted')<time('rescue-guidance-confirmed')&&time('rescue-guidance-confirmed')<time('kitten-warmed')&&time('kitten-warmed')<time('kitten-supported'));
 assert.equal(end.state.childRushed,false);assert.equal(end.state.milkGiven,false);assert.equal(end.state.medicalProcedureSimulated,false);
 for(let t=0;t<88;t+=.1){const f=scenarioFrame(id,t),mai=f.actors.find(a=>a.id==='mai'),cat=f.actors.find(a=>a.id==='miu');assert.ok(Math.hypot(mai.position[0]-cat.position[0],mai.position[2]-cat.position[2])>=12);assert.equal(cat.carrierId,null);}
 const carried=scenarioFrame(id,119),cat=carried.actors.find(a=>a.id==='miu'),thanh=carried.actors.find(a=>a.id==='thanh');assert.equal(cat.carrierId,'thanh');assert.ok(Math.abs(thanh.handTargets.right[0]-cat.position[0]+.35)<1e-9);assert.ok(Math.abs(thanh.handTargets.right[1]-cat.position[1]-1.8)<1e-9,"Support under the cat belly, not its root at the feet");assert.equal(carried.props.find(p=>p.id==='warm-cloth').attachment,'wrap');
});

test('bakery preserves FIFO except the explicit consented courtesy and conserves five loaves',()=>{
 const id='bakery-courtesy',expected=['teacher','guest-2','guest-3','guest-4','office'];
 assert.deepEqual(scenarioFrame(id,24).state.queueOrder,expected.slice(0,4));
 for(let t=25;t<=120;t+=.1){const f=scenarioFrame(id,t);assert.deepEqual(f.state.queueOrder,expected);assert.equal(f.state.officeCutQueue,false);const bread=f.props.filter(p=>p.kind==='bread');assert.equal(bread.length,5);assert.equal(bread.filter(p=>p.ownerId==='seller').length,f.state.breadStock);assert.equal(bread.filter(p=>p.ownerId==='ba').length,t>=99?1:0);if(f.state.priorityId)assert.equal(f.state.courtesyConsented,true);}
 const end=scenarioFrame(id,120),eventTime=type=>end.events.find(e=>e.type===type).at;
 assert.ok(eventTime('priority-consented')<eventTime('corridor-opening')&&eventTime('corridor-opening')<eventTime('priority-at-counter')&&eventTime('priority-at-counter')<eventTime('bread-received'));
 assert.deepEqual(end.state.servedIds,['ba']);assert.equal(end.state.currentServiceId,'teacher');
 const ba=end.actors.find(a=>a.id==='ba');assert.equal(ba.mobility,'crutch');assert.equal(end.props.find(p=>p.id==='ba-crutch').attachment,'left-hand');
});

test('seeking and pause are deterministic, input bounds are finite and snapshots cannot corrupt the next frame',()=>{
 const definition=JSON.stringify(scenarioDefinitions);
 for(const d of scenarioDefinitions){const first=scenarioFrame(d.id,83.25);assert.deepEqual(scenarioFrame(d.id,83.25),first);scenarioFrame(d.id,119);assert.deepEqual(scenarioFrame(d.id,83.25),first,'Seek/backtracking has no hidden timer');const changed=scenarioFrame(d.id,83.25);changed.actors[0].position[0]=1e9;changed.actors[0].wardrobe.shirt='#000000';changed.environment[0].position[0]=1e9;changed.theme.skyHex[0]='#000000';assert.deepEqual(scenarioFrame(d.id,83.25),first);assert.equal(scenarioFrame(d.id,NaN).time,0);assert.equal(scenarioFrame(d.id,-1).time,0);assert.equal(scenarioFrame(d.id,Infinity).time,120);assert.equal(scenarioFrame(d.id,-Infinity).time,0);assert.equal(scenarioFrame(d.id,1e9).complete,true);}
 assert.equal(JSON.stringify(scenarioDefinitions),definition);assert.throws(()=>scenarioFrame('invented-id',0),RangeError);
});

for(const r of results)console.log(`${r.ok?'PASS':'FAIL'} ${r.name}${r.error?': '+r.error:''}`);
const report={suite:'scenario-benchmarks',mode:'headless-logic',scenarioCount:suites.length,caseCount:results.length,passed:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok).length,elapsedMs:Math.round(performance.now()-started),metrics,unverified:['pixel-level visibility/occlusion','actual model finger IK and contact','millimetre skin/hair/fabric detail','DOF/volumetrics/WebGPU ultra','physical GPU/mobile FPS','audio and rendered video','LLM weights or model fine-tuning']};
if(args.includes('--record-metrics')){mkdirSync('work',{recursive:true});writeFileSync('work/scenario-benchmarks.json',JSON.stringify({...report,results},null,2)+'\n');}
console.log(JSON.stringify(report));if(report.failed)process.exitCode=1;
