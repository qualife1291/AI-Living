import {actionSchema,resultSchema,attemptSchema,type Principal} from './schema.ts';
import {executeOntology,type StoreOptions,readOntology} from './store.ts';
import {mayRead,permissionRoleEntities,permissionRelationships} from './policy.ts';
import {analyze,outgoing} from './graph.ts';
import {readDomain} from './domain.ts';
/** Bind verified identity at the host boundary, not from an LLM tool argument.
 * Shared D1 stays authoritative across hosts; this closure holds no state cache. */
export function createOntologyAgentTools(db:D1Database,principal:Principal,options:StoreOptions={}){
 return {
  schemas:{request:attemptSchema,action:actionSchema,result:resultSchema},
  async query(){const {state,revision}=await readOntology(db);mayRead(state,principal,'entities');return {revision,entities:[...state.entities,...permissionRoleEntities],relationships:[...state.relationships,...permissionRelationships(state)],...analyze(state,options.now??Date.now())};},
  async relationships(id:string){const {state,revision}=await readOntology(db);mayRead(state,principal,'relationships');return {revision,relationships:[...permissionRelationships(state).filter(r=>r.from===id),...['assigned_to','depends_on','part_of','targets','concerns'].flatMap(kind=>outgoing(state,id,kind as Parameters<typeof outgoing>[2]))]};},
  async domain(){const {state}=await readOntology(db);mayRead(state,principal,'domain');return readDomain(db);},
  request:(input:unknown)=>executeOntology(db,principal,input,options),
 };
}
