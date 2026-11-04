/** Synthetic transport only; no persistence or remote requests. */
import {seed} from '../lib/world.ts';
import {initializeLiving,planLivingTurn} from '../lib/living/engine.ts';
import {worldTime,weatherAt} from '../lib/clock.ts';
import {groundObstacles} from '../lib/city/walkability.ts';
const scene=process.argv[2]??'night',hour=scene==='night'?22.5:scene==='sleep'?2:21;
if(!['night','sleep','tv','fridge','cinema','dinner','friends','sidewalk'].includes(scene))throw Error('Unknown local fixture');
const now=Date.now(),born='2026-11-03T17:00:00.000Z';
let world={...structuredClone(seed),born,living:initializeLiving(now),clock:{scale:1,pausedAt:null,pausedMs:0,anchors:[{realMs:now,simMs:hour*3600000,scale:1}]}};
const context={date:'2026-11-04',hour,weekday:3,timezone:'Asia/Ho_Chi_Minh',fetchedAt:new Date(now).toISOString(),weather:{status:'unavailable',source:'fixture',observedAt:null,temperature:null,humidity:null,precipitation:null,code:null,windKph:null},calendar:{weekend:false,holidays:[],source:'fixture',status:'unavailable',coverage:'fixture'},traffic:{status:'unavailable',label:'fixture'},festivals:{status:'unavailable',label:'fixture'}};
world=planLivingTurn(world,context,now).world;
const variants={sleep:['Phòng An','rest','Nằm ngủ trên giường'],tv:['Phòng An','rest','Ngồi trên sofa xem tivi ở nhà'],fridge:['Phòng An','eat','Lấy đồ ăn nhẹ từ tủ lạnh'],cinema:['Rạp phim','play','Ngồi xem phim buổi tối'],dinner:['Nhà hàng','eat','Ăn bữa tối tại nhà hàng'],friends:['Nhà hàng','social','Nhậu và nhâm nhi cùng bạn'],sidewalk:['Phố đi bộ','eat','Ăn món nóng ở vỉa hè']};
if(scene!=='night')for(const p of world.people){
 const [location,kind,activity]=(p.id==='an'||(scene==='friends'&&p.id==='binh'))?variants[scene]:[`Phòng ${p.name}`,'rest','Nằm ngủ trên giường'];
 p.plan={createdAt:new Date(now).toISOString(),simStartedAt:hour*3600000-120000,pausedMs:0,from:location,transport:'walk',generator:'rules',steps:[{location,kind,activity,duration:7200}]};
}
console.log(JSON.stringify({world,events:[],revision:1,serverNow:new Date(now).toISOString(),obstacles:groundObstacles,weatherState:{...weatherAt(born,worldTime(world,now)),label:'Cảnh thử nghiệm buổi tối · mô phỏng'}}));
