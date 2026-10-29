import type {Actor} from '../life.ts';
/** Stable order, but selected/core/speaking actors cannot fall off a dense tail. */
export function visibleHumans(actors:Actor[],capacity:number,preferred:Iterable<string|undefined>){
 const ids=new Set(preferred),reserved=actors.filter(a=>ids.has(a.id)).slice(0,capacity),kept=new Set(reserved.map(a=>a.id));
 for(const actor of actors){if(kept.size>=capacity)break;kept.add(actor.id);}
 return actors.filter(a=>kept.has(a.id));
}
