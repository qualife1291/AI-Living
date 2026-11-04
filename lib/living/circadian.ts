import {hashSeed} from '../clock.ts';
import type {PersonPlan} from '../world.ts';
import type {Step} from '../life.ts';
import {route} from '../life.ts';

/** Personal bedtime spans22:45–00:45; no synchronous22h curfew. Cosmetic
 * cohorts are stable and independent of reward, identity and resident age. */
export function sleepSchedule(id:string){
  return {bed:22.75+(hashSeed(id+'-bedtime')%9)*.25,wake:6+(hashSeed(id+'-wake')%5)*.25};
}
export function isSleepHour(id:string,hour:number){
  const {bed,wake}=sleepSchedule(id),h=((hour%24)+24)%24;
  return bed>=24?h>=bed-24&&h<wake:h>=bed||h<wake;
}
export const isHomePlace=(place:string)=>/^Phòng (An|Bình|Chi)$/.test(place)||place==='Khu dân cư';
export const isSleepActivity=(activity:string)=>/ngủ|nghỉ đêm|sạc pin|sạc năng lượng/i.test(activity);
export function homePlace(id:string): (typeof import("../event-schema.ts").PLACES)[number] {return ({an:'Phòng An',binh:'Phòng Bình',chi:'Phòng Chi'} as Record<string,(typeof import("../event-schema.ts").PLACES)[number]>)[id]??'Khu dân cư';}
/** Planned rest only, never a physical bed receipt. Match the existing walking
 * projection, then allow30s to settle; no recovery during the planned trip. */
export function plannedSleepMinutes(plan:PersonPlan|undefined,start:number,end:number){
  if(plan?.simStartedAt===undefined||end<=start)return 0;
  let at=plan.simStartedAt,total=0;
  for(const [i,step] of plan.steps.entries()){const next=at+step.duration*1000;
    if(isHomePlace(step.location)&&step.kind==='rest'&&isSleepActivity(step.activity)&&(!plan.transport||plan.transport==='walk')){
      const from=i===0?plan.from??plan.steps.at(-1)!.location:plan.steps[i-1].location;
      const base=route(from,step.location),path=i===0&&plan.originPath?.length?[...plan.originPath,...base.slice(1)]:base;
      const length=path.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-path[i][0],p[1]-path[i][1]),0);
      const travel=Math.min(step.duration*.62,length/27);
      total+=Math.max(0,Math.min(end,next)-Math.max(start,at+(travel+30)*1000));
    }
    at=next;
  }
  return total/60000;
}
type Slot=[number,string,string,Step['kind']];
/** Routines remain alive between durable turns. No hidden night-only writer. */
export function eveningRoutine(base:readonly Slot[],id:string,home:string):Slot[]{
  const {bed,wake}=sleepSchedule(id),h=hashSeed(id+'-evening-venue');
  const late:[string,string,Step['kind']][]=[['Phố đi bộ','Dạo vỉa hè, ngắm phố buổi tối','social'],['Quán cà phê','Uống trà và trò chuyện tối muộn','drink'],['Rạp phim','Ngồi xem phim suất tối','play'],[home,'Ngồi trên sofa xem tivi','rest'],['Nhà hàng','Nhậu và ăn món chung cùng bạn','eat']];
  const activity=late[h%late.length],second=late[(h+2)%late.length];
  const rows:Slot[]=[[0,...(bed>=24?activity:[home,'Nằm ngủ trên giường','rest'] as [string,string,Step['kind']])],
    [wake,'Bếp chung','Ăn sáng sau khi thức dậy','eat'],...base.filter(s=>s[0]>wake&&s[0]<18),
    [18,'Nhà hàng','Đi ăn bữa tối','eat'],[19.5,...second],[21,...activity]];
  if(bed<24)rows.push([bed,home,'Nằm ngủ trên giường','rest']);
  else rows.push([bed-24,home,'Nằm ngủ trên giường','rest']);
  return rows.sort((a,b)=>a[0]-b[0]);
}

/** Awake public company after22h; viewing/bedtime stays quiet. Presentation and
 * idle scheduling only: no interruption or physical/social reward receipt. */
export function nightSocialActor(actor: Pick<import('../life.ts').Actor,'kind'|'activity'|'location'|'walking'>){
  return !actor.walking && ['Nhà hàng','Quán cà phê','Phố đi bộ','Quảng trường','Công viên'].includes(actor.location)
    && ['social','drink','eat','exercise','run'].includes(actor.kind) && !isSleepActivity(actor.activity);
}
