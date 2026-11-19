import {z} from 'zod';
import {fail,type State} from './schema.ts';
const actorSchema=z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),name:z.string().max(100),role:z.string().max(100),roleId:z.string().nullable(),householdId:z.string().nullable(),planAt:z.string().nullable(),stepCount:z.number().int().min(0).max(100)}).strict();
const rowSchema=z.object({revision:z.number().int().nonnegative(),born:z.string().datetime(),actors:z.string()});
export type DomainProjection={source:{system:'simulation';revision:number;born:string};entities:{id:string;kind:string;label:string;sourceId:string}[];relationships:{kind:string;from:string;to:string}[];warnings:string[]};
/** Whitelist JSON columns in SQL; never transfer policy matrices or memories. */
export async function readDomain(db:D1Database):Promise<DomainProjection>{
 const row=await db.prepare(`WITH actors AS (
 SELECT json_extract(p.value,'$.id') id,json_extract(p.value,'$.name') name,json_extract(p.value,'$.role') role,NULL roleId,NULL householdId,json_extract(p.value,'$.plan.createdAt') planAt,coalesce(json_array_length(p.value,'$.plan.steps'),0) stepCount FROM worlds w,json_each(w.data,'$.people') p WHERE w.id='home'
 UNION ALL
 SELECT json_extract(p.value,'$.id'),json_extract(p.value,'$.name'),coalesce((SELECT json_extract(r.value,'$.label') FROM json_each(w.data,'$.living.catalog.roles') r WHERE json_extract(r.value,'$.id')=json_extract(p.value,'$.roleId')),'Unknown profession'),json_extract(p.value,'$.roleId'),json_extract(p.value,'$.home.householdId'),json_extract(p.value,'$.plan.createdAt'),coalesce(json_array_length(p.value,'$.plan.steps'),0) FROM worlds w,json_each(w.data,'$.living.residents') p WHERE w.id='home')
 SELECT revision,json_extract(data,'$.born') born,(SELECT json_group_array(json_object('id',id,'name',name,'role',role,'roleId',roleId,'householdId',householdId,'planAt',planAt,'stepCount',stepCount)) FROM actors) actors FROM worlds WHERE id='home'`).first();
 const parsed=rowSchema.safeParse(row);if(!parsed.success)return fail('DOMAIN_UNAVAILABLE',503);
 let actors:z.infer<typeof actorSchema>[];try{actors=z.array(actorSchema).max(512).parse(JSON.parse(parsed.data.actors));}catch{return fail('DOMAIN_INCONSISTENT',503);}
 if(new Set(actors.map(a=>a.id)).size!==actors.length)return fail('DOMAIN_DUPLICATE_ID',503);
 const entities:DomainProjection['entities']=[],relationships:DomainProjection['relationships']=[],seen=new Set<string>();
 const add=(e:DomainProjection['entities'][number])=>{if(!seen.has(e.id)){entities.push(e);seen.add(e.id);}};
 for(const a of actors){
  const id='sim:actor:'+a.id,role='sim:profession:'+(a.roleId??'core-'+a.id);
  add({id,kind:'simulation_actor',label:a.name,sourceId:a.id});add({id:role,kind:'simulation_profession',label:a.role,sourceId:a.roleId??a.id});relationships.push({kind:'has_profession',from:id,to:role});
  if(a.householdId){const home='sim:household:'+a.householdId;add({id:home,kind:'simulation_household',label:a.householdId,sourceId:a.householdId});relationships.push({kind:'member_of',from:id,to:home});}
  if(a.planAt){const plan='sim:plan:'+a.id+':'+a.planAt;add({id:plan,kind:'simulation_plan',label:a.stepCount+' steps (intent, not completion)',sourceId:a.id});relationships.push({kind:'follows_plan',from:id,to:plan});}
 }
 return {source:{system:'simulation',revision:parsed.data.revision,born:parsed.data.born},entities,relationships,warnings:[]};
}
export function domainRefProblems(s:State,projection:DomainProjection){const ids=new Set(projection.entities.map(e=>e.id));return s.relationships.filter(r=>r.kind==='concerns'&&(r.worldBorn!==projection.source.born||!ids.has(r.to))).map(r=>({taskId:r.from,target:r.to,code:'STALE_DOMAIN_REFERENCE'}));}
