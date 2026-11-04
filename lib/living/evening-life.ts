import {hashSeed} from '../clock.ts';
import {decisionContext,linearScore} from './linucb.ts';
import {eveningActions,scenarios,type Scenario,type AgentLearning} from './learning.ts';
import {isSleepHour,homePlace,sleepSchedule} from './circadian.ts';
import type {RealContext} from './schema.ts';
export const isEveningAction=(id:string)=>eveningActions.some(s=>s.id===id);
export function runtimeTitle(s:Scenario){return s.id==='rest-home'?'Về nhà nằm ngủ trên giường':s.title;}
export function runtimePlace(s:Scenario,id:string):Scenario['place']{return ['rest-home','sleep-night','watch-tv','home-snack'].includes(s.id)?homePlace(id):s.place;}
export function eveningDuration(s:Scenario,id:string,hour:number){
  if(s.id==='sleep-night')return Math.round(Math.max(.5,((sleepSchedule(id).wake-hour+24)%24))*3600);
  return ({'night-cinema':5400,'watch-tv':2700,'evening-dinner':1800,'friends-supper':2400,'evening-tea':1500,'sidewalk-supper':1200,'late-promenade':1200,'home-snack':720} as Record<string,number>)[s.id];
}
/** Live-only chooser. Frozen41-arm studies remain unchanged; night actions
 * use personal posterior/needs/novelty and actual local context, never fake time. */
export function chooseEveningLife(agent:AgentLearning,id:string,context:RealContext,day:()=>Scenario):Scenario{
  if(agent.health<65)return scenarios.find(s=>s.id==='rehabilitate')!;
  if(agent.energy<28)return eveningActions.find(s=>s.id==='sleep-night')!;
  if(isSleepHour(id,context.hour)&&agent.hunger<=72)return eveningActions.find(s=>s.id==='sleep-night')!;
  if(context.hour>=7&&context.hour<18)return day();
  let candidates=eveningActions.filter(s=>s.id!=='sleep-night');
  if(agent.hunger>60)candidates=candidates.filter(s=>['evening-dinner','sidewalk-supper','home-snack'].includes(s.id));
  const rain=context.weather.status==='fresh'&&(context.weather.precipitation??0)>0;
  if(rain)candidates=candidates.filter(s=>!['late-promenade','sidewalk-supper'].includes(s.id));
  const slot=Math.floor(context.hour*2),preferred=hashSeed(`${id}:${context.date}:${slot}-evening`)%candidates.length;
  return candidates.map((s,i)=>{
    const own=agent.actions[s.id],linear=agent.linear?.[s.id];
    const reward=linear?linearScore(linear,decisionContext(agent,context.weather)).mean:own?.meanReward??0;
    const novelty=(agent.recentActions??[]).filter(a=>a===s.id).length*.18;
    const food=Math.max(0,agent.hunger-25)/75*(-s.hunger/30);
    return {s,score:reward*.7+food-novelty+(i===preferred?.65:0)};
  }).sort((a,b)=>b.score-a.score)[0].s;
}
