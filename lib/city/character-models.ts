import {hashSeed} from '../clock.ts';
/** Original civilian rigs; stable selection never derives age/gender from a model. */
export const CORE_MODELS:Record<string,string>={an:'citizens/an',binh:'citizens/binh',chi:'citizens/chi'};
export const CITIZEN_MODELS=['linen','cardigan','field','courier','coat','senior','workshop','denim','summer'].map(id=>`citizens/${id}`);
export const CITIZEN_FALLBACK='citizens/linen';
export function residentModel(roleId:string,actorId=roleId){
 if(/doctor|nurse|medic/.test(roleId))return 'citizens/coat';
 if(/delivery|courier/.test(roleId))return 'citizens/courier';
 if(/garden|farmer/.test(roleId))return 'citizens/field';
 if(/worker|mechanic|colleague/.test(roleId))return 'citizens/workshop';
 return CITIZEN_MODELS[hashSeed(actorId)%CITIZEN_MODELS.length];
}
