import {hashSeed} from '../clock.ts';
/** Stable cosmetic selection; mesh filenames never change identity, age or knowledge. */
export const CORE_MODELS:Record<string,string>={an:'supplied/office',binh:'supplied/waistcoat',chi:'supplied/service'};
export const CITIZEN_MODELS=['jacket','service','leisure','office','waistcoat'].map(id=>`supplied/${id}`);
export const CITIZEN_FALLBACK='supplied/jacket';
export function residentModel(roleId:string,actorId=roleId){
 if(/security|police/.test(roleId))return 'supplied/jacket';
 return CITIZEN_MODELS[hashSeed(actorId)%CITIZEN_MODELS.length];
}
