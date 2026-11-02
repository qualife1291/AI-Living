import { metroLine, boulevards } from "./world.ts";
import { VEHICLES } from "./scale.ts";
import type { TrafficVehicle, TrafficPoint } from "./traffic.ts";
/** Independent, render-only services. Never mint passenger trips or rewards. */
export type TransitMode = "bus" | "metro";
type Service = { type:TransitMode; id:string; from:TrafficPoint; to:TrafficPoint; speed:number; dwell:number };
export const TRANSIT_SERVICES: readonly Service[] = [
  {type:"bus",id:"service-bus-01",from:[1170,boulevards[4][1][1]+8],to:[1830,boulevards[4][2][1]+8],speed:20,dwell:8},
  {type:"metro",id:"service-metro-01",from:[metroLine[1][0]+48,metroLine[1][1]],to:[metroLine[2][0]-48,metroLine[2][1]],speed:29,dwell:9},
];
export function serviceAt(seconds:number,service:Service):TrafficVehicle{
  const dx=service.to[0]-service.from[0],dz=service.to[1]-service.from[1];
  const length=Math.hypot(dx,dz),travel=length/service.speed,period=2*(travel+service.dwell);
  const t=Number.isFinite(seconds)?((seconds%period)+period)%period:0;
  const forward=t<travel+service.dwell;
  const moving=forward?t<travel:t>=travel+service.dwell&&t<2*travel+service.dwell;
  const fraction=forward?Math.min(1,t/travel):Math.max(0,1-(t-travel-service.dwell)/travel);
  return {id:service.id,type:service.type,
    position:[service.from[0]+dx*fraction,service.from[1]+dz*fraction],
    yaw:Math.atan2(dx,dz)+(forward?0:Math.PI),speed:moving?service.speed:0,
    ...VEHICLES[service.type]};
}
export const independentTransitAt=(seconds:number):TrafficVehicle[]=>TRANSIT_SERVICES.map(s=>serviceAt(seconds,s));
