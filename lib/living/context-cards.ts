import {z} from "zod";
import data from "../../data/contexts/neighborhood-contexts.json" with {type:"json"};
import {PLACES} from "../event-schema.ts";
import {worldTime,weatherAt,mulberry32,hashSeed,type WeatherKind} from "../clock.ts";
import type {World} from "../world";
import type {RealContext} from "./schema";

export const contextCardSchema=z.object({
  id:z.string().regex(/^[a-z][a-z0-9-]{0,79}$/),
  category:z.enum(["weather_season","micro_economy","commitments_social","ecology_animals","vietnamese_culture","empathy_resolution"]),
  title:z.string().min(1).max(160),
  phase:z.array(z.enum(["dawn","morning","noon","afternoon","dusk","evening","night"])).min(1).max(7),
  weather:z.array(z.enum(["clear","cloudy","rain","fog","windy"])).min(1).max(5),
  locations:z.array(z.enum(PLACES)).min(1).max(33),
  promptHint:z.string().min(1).max(1000),suggestedActivities:z.array(z.string().min(1).max(160)).min(1).max(8),
  tags:z.array(z.string().min(1).max(60)).max(20),
  activation:z.enum(["weekend","tet","mid-autumn","teachers-day"]).optional(),
  source:z.literal("editorial-suggestion").default("editorial-suggestion"),
}).strict();
export const contextCardsSchema=z.array(contextCardSchema).refine(cards=>new Set(cards.map(c=>c.id)).size===cards.length,{message:"Context IDs must be unique"});
export type ContextCard=z.infer<typeof contextCardSchema>;
export const neighborhoodContexts=contextCardsSchema.parse(data);
export type ContextOptions={location?:string;weather?:WeatherKind;context?:RealContext};
const fold=(text:string)=>text.normalize("NFD").replace(/\p{M}/gu,"").replace(/đ/gi,"d").toLowerCase();
function active(card:ContextCard,context:RealContext|undefined,weekend:boolean) {
  if(!card.activation)return true;
  if(card.activation==="weekend")return weekend;
  if(card.activation==="teachers-day")return context?.date.slice(5)==="11-20";
  if(context?.festivals.status!=="fresh")return false;
  return context.festivals.items?.some(item=>{
    if(item.startDate>context.date||item.endDate<context.date)return false;
    try{const url=new URL(item.url);if(url.protocol!=="https:"||url.hostname!=="visithcmc.vn")return false;}catch{return false;}
    return (card.activation==="tet"?/\btet (nguyen dan|co truyen|am lich)\b/:/\btrung thu\b/).test(fold(item.title));
  })??false;
}
/** Editorial possibilities, never receipts, memories, inventory or live events. */
export function selectContextCards(world:World,now:number,count=2,options:ContextOptions={}):ContextCard[] {
  const time=worldTime(world,now),weather=options.weather??weatherAt(world.born||"xom-ai",time,world.clock?.weatherOverride).kind;
  const context=options.context??world.realContext;
  const weekday=new Date(Date.parse(world.born)+time.simMs+7*3600000).getUTCDay();
  const weekend=context?.calendar.weekend??[0,6].includes(weekday);
  const random=mulberry32(hashSeed(`${world.born}:${time.dayIndex}:${time.phase}:${weather}:${options.location??"all"}`));
  const lowEnergy=world.people.some(p=>p.energy<40);
  return neighborhoodContexts.filter(card=>card.phase.includes(time.phase)&&card.weather.includes(weather)&&
    (!options.location||card.locations.includes(options.location as typeof PLACES[number]))&&active(card,context,weekend))
    .map(card=>({card,score:random()*1.5+(lowEnergy&&card.category==="empathy_resolution"?4:0)+(weather==="rain"&&card.tags.includes("rain")?5:0)}))
    .sort((a,b)=>b.score-a.score||a.card.id.localeCompare(b.card.id)).slice(0,Number.isFinite(count)?Math.max(0,Math.min(8,Math.floor(count))):0).map(r=>r.card);
}
