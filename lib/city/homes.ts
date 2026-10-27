import data from '../../data/city/home-anchors.json' with {type:'json'};
import type {Point} from '../life.ts';
export type HomeAnchor={id:string;building:{x:number;z:number};point:Point;address:string};
// Generated offline against the same building/scenery footprints used by 3D.
// Server metadata paths need no geometry, pathfinding or Three.js imports.
export const HOME_ANCHORS:readonly HomeAnchor[]=data.anchors.map(a=>({...a,point:[a.point[0],a.point[1]]}));
const byId=new Map(HOME_ANCHORS.map(a=>[a.id,a]));
export function homeAnchor(id:string|undefined){return id?byId.get(id):undefined;}
export function homeCameraOffset(anchor:HomeAnchor,clear:(from:Point,to:Point)=>boolean):[number,number,number] {
  const outward=Math.atan2(anchor.point[0]-anchor.building.x,anchor.point[1]-anchor.building.z);
  for(const radius of [150,110,85])for(const shift of [0,.65,-.65,1.3,-1.3]) {
    const x=Math.sin(outward+shift)*radius,z=Math.cos(outward+shift)*radius;
    if(clear(anchor.point,[anchor.point[0]+x,anchor.point[1]+z]))return [x,Math.max(90,radius*.8),z];
  }
  return [0,220,.01];
}
