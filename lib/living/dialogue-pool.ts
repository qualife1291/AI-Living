import {hashSeed} from '../clock.ts';
export type DialoguePool = {version:1;entries:{pair:string;hash:string;lineHashes:string[];source:'rules'|'local-llm'|'client-script'}[]};
type Line={speaker:string;text:string};
const MAX_ENTRIES=64;
export const emptyDialoguePool=():DialoguePool=>({version:1,entries:[]});
export const lineHash=(text:string)=>hashSeed(text.normalize('NFC').toLocaleLowerCase('vi-VN').replace(/\s+/g,' ').trim()).toString(16).padStart(8,'0');
const pairKey=(a:string,b:string)=>[a,b].sort().join(':');
const sceneHash=(lines:Line[])=>lineHash(lines.map(line=>line.speaker+':'+line.text).join('\n'));
export function hasDialogue(pool:DialoguePool|undefined,a:string,b:string,lines:Line[]) {
  return pool?.entries.some(entry=>entry.pair===pairKey(a,b)&&entry.hash===sceneHash(lines))??false;
}
export function rememberDialogue(pool:DialoguePool|undefined,a:string,b:string,lines:Line[],source:DialoguePool['entries'][number]['source']):DialoguePool {
  if(!lines.length)return pool??emptyDialoguePool();
  const entry={pair:pairKey(a,b),hash:sceneHash(lines),lineHashes:lines.slice(0,12).map(line=>lineHash(line.text)),source};
  return {version:1,entries:[...(pool?.entries??[]).filter(old=>old.pair!==entry.pair||old.hash!==entry.hash),entry].slice(-MAX_ENTRIES)};
}
export function mergeDialoguePools(a:DialoguePool,b:DialoguePool|undefined):DialoguePool {
  const entries=[...a.entries];
  for(const entry of b?.entries??[])if(!entries.some(old=>old.pair===entry.pair&&old.hash===entry.hash))entries.push(entry);
  return {version:1,entries:entries.slice(-MAX_ENTRIES)};
}
type StorageLike=Pick<Storage,'getItem'|'setItem'>;
function browserStorage():StorageLike|undefined {try{return typeof window==='undefined'?undefined:window.localStorage;}catch{return undefined;}}
const storageKey=(scope:string)=>'xom-ai-dialogue-hashes:'+lineHash(scope);
/** Only bounded hashes are persisted here; no raw dialogue, names or credentials. */
export function readDialoguePool(scope:string,storage:StorageLike|undefined=browserStorage()):DialoguePool {
  try {
    const raw=storage?.getItem(storageKey(scope));if(!raw||raw.length>64000)return emptyDialoguePool();
    const parsed=JSON.parse(raw) as Partial<DialoguePool>;
    if(parsed.version!==1||!Array.isArray(parsed.entries))return emptyDialoguePool();
    const hex=(value:unknown)=>typeof value==='string'&&/^[a-f0-9]{8}$/.test(value);
    return {version:1,entries:parsed.entries.filter(e=>typeof e?.pair==='string'&&e.pair.length<=200&&hex(e.hash)&&Array.isArray(e.lineHashes)&&e.lineHashes.length<=12&&e.lineHashes.every(hex)&&['rules','local-llm','client-script'].includes(e.source)).slice(-MAX_ENTRIES)};
  }catch{return emptyDialoguePool();}
}
export function writeDialoguePool(scope:string,pool:DialoguePool,storage:StorageLike|undefined=browserStorage()) {try{storage?.setItem(storageKey(scope),JSON.stringify(pool));}catch{/* Blocked/quota-full storage keeps session grammar functional. */}}
