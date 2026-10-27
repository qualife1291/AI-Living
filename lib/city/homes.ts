import data from '../../data/city/home-anchors.json' with {type:'json'};
import type {Point} from '../life.ts';
export type HomeAnchor={id:string;building:{x:number;z:number};point:Point;address:string};
// Generated offline against the same building/scenery footprints used by 3D.
// Server metadata paths need no geometry, pathfinding or Three.js imports.
export const HOME_ANCHORS:readonly HomeAnchor[]=data.anchors.map(a=>({...a,point:[a.point[0],a.point[1]]}));
const byId=new Map(HOME_ANCHORS.map(a=>[a.id,a]));
export function homeAnchor(id:string|undefined){return id?byId.get(id):undefined;}
