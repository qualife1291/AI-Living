import data from "../../data/city/garden-plots.json" with {type:"json"};
export type GardenPlot=typeof data.plots[number];
/** Generated from existing flower-bed footprints; lightweight on the server. */
export const GARDEN_PLOTS:readonly GardenPlot[]=data.plots;
const byId=new Map(GARDEN_PLOTS.map(plot=>[plot.id,plot]));
export const gardenPlot=(id:string|undefined)=>id?byId.get(id):undefined;
export function gardenCameraOffset(plot:GardenPlot,clear:(from:[number,number],to:[number,number])=>boolean):[number,number,number] {
  for(const radius of [48,36,24])for(let step=0;step<8;step++){
    const angle=(plot.seed%8+step)/8*Math.PI*2,x=Math.sin(angle)*radius,z=Math.cos(angle)*radius;
    if(clear([plot.x,plot.z],[plot.x+x,plot.z+z]))return [x,Math.max(22,radius*.55),z];
  }
  return [0,65,.01];
}
