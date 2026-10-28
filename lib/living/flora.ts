import {GARDEN_PLOTS,gardenPlot,type GardenPlot} from "../city/garden-plots.ts";
import {hashSeed} from "../clock.ts";
export const GARDEN_DAY_MS=86400000;
export const GROWTH_PHASES=[
  {id:"sprout",label:"Nảy mầm",days:2},
  {id:"young",label:"Lớn lên",days:4},
  {id:"bud",label:"Ra nụ",days:3},
  {id:"bloom",label:"Nở hoa",days:3},
  {id:"rest",label:"Nghỉ dưỡng",days:2},
] as const;
export type GrowthPhase=typeof GROWTH_PHASES[number]["id"];
export type PlantRecord={growthSimMs:number;anchoredSimMs:number;moisture:number};
export type FloraState={version:1;plots:Record<string,PlantRecord>};
export type GardenView=GardenPlot&{phase:GrowthPhase;phaseLabel:string;phaseProgress:number;moisture:number;growthSimMs:number};
function validTime(value:number){return Number.isFinite(value)&&value>=0&&value<=Number.MAX_SAFE_INTEGER;}
function validRecord(record:PlantRecord){return !!record&&validTime(record.growthSimMs)&&validTime(record.anchoredSimMs)&&Number.isFinite(record.moisture)&&record.moisture>=0&&record.moisture<=100;}
function validate(state:FloraState|undefined) {
  if(!state)return;
  if(state.version!==1||!state.plots||typeof state.plots!=="object"||Array.isArray(state.plots))throw Error("Unsupported garden state; data was preserved");
  for(const record of Object.values(state.plots))if(!validRecord(record))
    throw Error("Invalid garden state; data was preserved");
}
export function initialPlant(plot:GardenPlot):PlantRecord {
  // Authored initial age, not a resident's planting/harvesting history.
  return {growthSimMs:(hashSeed(plot.id)%56)/4*GARDEN_DAY_MS,anchoredSimMs:0,moisture:70};
}
export function projectPlant(record:PlantRecord,simMs:number) {
  if(!validTime(simMs)||!validRecord(record))throw Error("Invalid garden time or record");
  const days=Math.max(0,simMs-record.anchoredSimMs)/GARDEN_DAY_MS;
  const wetDays=Math.min(days,record.moisture/10);
  // Analytic integral: growth slows as moisture falls, with no hidden tick loop.
  const growthDays=.25*days+.75*(record.moisture*wetDays-5*wetDays*wetDays)/100;
  const growthSimMs=record.growthSimMs+growthDays*GARDEN_DAY_MS;
  if(!validTime(growthSimMs))throw Error("Garden growth exceeds the supported clock");
  return {growthSimMs,moisture:Math.max(0,record.moisture-10*days)};
}
function view(plot:GardenPlot,record:PlantRecord,simMs:number):GardenView {
  const projected=projectPlant(record,simMs),cycleDays=GROWTH_PHASES.reduce((sum,p)=>sum+p.days,0);
  let remaining=(projected.growthSimMs/GARDEN_DAY_MS)%cycleDays;
  for(const phase of GROWTH_PHASES){
    if(remaining<phase.days)return {...plot,...projected,phase:phase.id,phaseLabel:phase.label,phaseProgress:remaining/phase.days};
    remaining-=phase.days;
  }
  throw Error("Invalid growth phase");
}
export function gardenViews(state:FloraState|undefined,simMs:number):GardenView[] {
  validate(state);
  return GARDEN_PLOTS.map(plot=>view(plot,state?.plots[plot.id]??initialPlant(plot),simMs));
}
/** Owner care changes plant state only; never rewards or credits a resident. */
export function waterGarden(state:FloraState|undefined,id:string,simMs:number) {
  validate(state);const plot=gardenPlot(id);if(!plot)throw Error("Unknown garden plot");
  const old=state?.plots[id]??initialPlant(plot);
  if(simMs<old.anchoredSimMs)throw Error("Garden clock precedes the saved anchor; data was preserved");
  const current=view(plot,old,simMs);
  if(current.moisture>=99.5)return {changed:false,state:state??{version:1 as const,plots:{}},view:current};
  const next={...old,growthSimMs:current.growthSimMs,anchoredSimMs:simMs,moisture:100};
  return {changed:true,state:{...state,version:1 as const,plots:{...state?.plots,[id]:next}},view:view(plot,next,simMs)};
}
