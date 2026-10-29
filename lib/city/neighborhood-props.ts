import {venues} from './world.ts';
import {sceneryTrees,streetProps,venueSceneryPose} from './scenery.ts';
import {groundElevation} from './ground.ts';
import {openVenue} from './footprints.ts';
import catalog from '../../public/models/supplied/props/catalog.json' with {type:'json'};
import type {AssetPlacement} from '../../components/city/three/assets.ts';
/** Render replacements stay INSIDE existing reserved footprints. No new solid,
 * inventory, employment, chess skill or productive outcome is implied. */
export function neighborhoodProps(available:ReadonlySet<string>){
 const placements:AssetPlacement[]=[],replacedStreet=new Set<string>();
 const has=(key:string)=>available.has('supplied/props/'+key);
 const put=(key:string,x:number,z:number,width:number,height:number,depth:number,y=0,yaw=0)=>{if(!has(key))return 0;const size=catalog.assets.find(a=>a.id==='supplied/props/'+key)!.bounds.size;const actualHeight=size[1]*Math.min(width/size[0],height/size[1],depth/size[2]);placements.push({id:'supplied/props/'+key,x,y:groundElevation(x,z)+y,z,width,height,depth,yaw});return actualHeight;};
 const tables=has('table')&&has('chair'),planters=has('plant'),trees=available.has('suburban/tree-large');
 let plantCount=0;
 for(const venue of venues){const v=venueSceneryPose(venue);
  if(tables&&['cafe','restaurant'].includes(v.type))for(const side of [-1,1]){
   const x=v.x+side*65,z=v.y+20,top=put('table',x,z,13,8,13);
   for(const dz of [-10,10])put('chair',x,z+dz,5,10,5,0,dz>0?Math.PI:0);
   put(side<0?'chessboard':'book',x,z,6,.8,6,top);
  }
  if(planters&&!openVenue(v))for(const side of [-1,1])for(const [dx,dz] of [[-1.3,0],[1.3,0],[0,1.3]]){put('plant',v.x+side*53+dx,v.y-4+dz,2,9,2);plantCount++;}
 }
 for(const prop of streetProps){
  if(prop.kind==='books'&&has('shelf')&&has('books')){const top=put('shelf',prop.x,prop.z,prop.width,12,prop.depth);put('books',prop.x,prop.z,prop.width*.7,3,prop.depth*.7,top);replacedStreet.add(prop.id);}
  if(prop.kind==='workbench'&&has('table')&&has('monitor')&&has('keyboard')){const top=put('table',prop.x,prop.z,prop.width,8,prop.depth);put('monitor',prop.x,prop.z-2,10,6,3,top);put('keyboard',prop.x,prop.z+2,8,.7,3,top);put('mouse',prop.x+6,prop.z+2,1,.6,2,top);put('lamp',prop.x-7,prop.z,3,6,3,top);replacedStreet.add(prop.id);}
 }
 for(const tree of sceneryTrees){
  // Canopy starts above people; a narrow shared-footprint trunk joins it below.
  if(trees)placements.push({id:'suburban/tree-large',x:tree.x,y:groundElevation(tree.x,tree.z)+18,z:tree.z,width:36,height:32,depth:32,yaw:0,stretch:true});
  if(planters)for(const side of [-1,1]){put('plant',tree.x+side*.8,tree.z+.7,.8,3,.8);plantCount++;}
 }
 return {placements,tables,planters,trees,replacedStreet,plantCount};
}
