import type { LivingState, Resident } from './schema';
import {HOME_ANCHORS,homeAnchor} from '../city/homes.ts';
export type HomeAssignment = {householdId:string;label:string;place:string;anchorId?:string;address?:string};
export const HOUSEHOLD_SIZE=4;

/** Additive assignment: established groups, homes and history are never evicted. */
export function assignHomes(residents:Resident[]):Resident[] {
  const groups=new Map<string,{home:HomeAssignment;count:number;members:HomeAssignment[]}>();
  for(const resident of residents)if(resident.home?.householdId) {
    const group=groups.get(resident.home.householdId)??{home:resident.home,count:0,members:[]};
    group.count++;group.members.push(resident.home);groups.set(resident.home.householdId,group);
  }
  const assigned=residents.map(resident=>{
    if(resident.home?.householdId)return resident;
    let index=1;while((groups.get(`household-${index}`)?.count??0)>=HOUSEHOLD_SIZE)index++;
    const id=`household-${index}`,group=groups.get(id)??{home:{householdId:id,label:`Nhóm ở ${String(index).padStart(2,'0')}`,place:'Khu dân cư'},count:0,members:[]};
    const home={...group.home};group.count++;group.members.push(home);groups.set(id,group);return {...resident,home};
  });
  const used=new Set(assigned.map(r=>r.home?.anchorId).filter((id):id is string=>!!id)),metadata=new Map<string,{anchorId:string;address?:string}>();
  for(const [id,group] of [...groups].sort(([a],[b])=>a.localeCompare(b,'en',{numeric:true}))) {
    if(group.home.place!=='Khu dân cư')continue;
    const existing=group.members.find(home=>home.anchorId),anchor=existing?.anchorId?homeAnchor(existing.anchorId):HOME_ANCHORS.find(a=>!used.has(a.id));
    const anchorId=existing?.anchorId??anchor?.id;if(!anchorId)continue;
    used.add(anchorId);metadata.set(id,{anchorId,address:existing?.address??anchor?.address});
  }
  return assigned.map(resident=>{
    const home=resident.home!,extra=metadata.get(home.householdId);
    if(!extra||home.anchorId&&(home.address||!extra.address))return resident;
    return {...resident,home:{...home,anchorId:home.anchorId??extra.anchorId,...(!home.address&&extra.address?{address:extra.address}:{})}};
  });
}
export function households(state:Pick<LivingState,'residents'>) {
  const groups=new Map<string,{home:HomeAssignment;members:Resident[]}>();
  for(const resident of assignHomes(state.residents)) {
    const home=resident.home!,group=groups.get(home.householdId)??{home,members:[]};group.members.push(resident);groups.set(home.householdId,group);
  }
  return [...groups.values()];
}
export function householdFor(state:LivingState|undefined,id:string){return state&&households(state).find(group=>group.members.some(r=>r.id===id));}
