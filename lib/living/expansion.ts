import { roleSchema, type LivingCatalog } from './schema.ts';
const normalized=(text:string)=>text.normalize('NFC').toLocaleLowerCase('vi-VN').replace(/[\p{P}\p{S}]/gu,' ').replace(/\s+/g,' ').trim();
function grams(text:string) {
 const words=normalized(text).split(' ');return new Set(words.slice(2).map((_,i)=>words.slice(i,i+3).join(' ')));
}
/** Structural/lexical guard, not a semantic model or automatic role approval. */
export function reviewRoleExpansion(candidate:unknown,existing:LivingCatalog['roles']) {
 const parsed=roleSchema.safeParse(candidate);
 if(!parsed.success)return {ok:false as const,reason:'Vai trò không đúng schema/địa điểm/hành động'};
 const role=parsed.data;
 if(existing.some(r=>r.id===role.id||r.id.startsWith(role.id+'-')&&/^\d{8}$/.test(r.id.slice(role.id.length+1))))
  return {ok:false as const,reason:'ID vai trò đã tồn tại'};
 if(!/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡợùúụủũưừứựửữỳýỵỷỹđ]/i.test(role.label+' '+role.activity+' '+role.greeting))
  return {ok:false as const,reason:'Vai trò cần nội dung tiếng Việt có dấu'};
 if(existing.some(r=>normalized(r.label)===normalized(role.label)))return {ok:false as const,reason:'Tên vai trò đã tồn tại'};
 const proposed=grams(role.greeting);
 for(const old of existing) {
  const prior=grams(old.greeting),union=new Set([...proposed,...prior]),intersection=[...proposed].filter(g=>prior.has(g)).length;
  if(normalized(role.greeting)===normalized(old.greeting)||(union.size>0&&intersection/union.size>.55))
   return {ok:false as const,reason:'Lời chào lặp lại nội dung vai trò cũ'};
 }
 return {ok:true as const,role};
}
