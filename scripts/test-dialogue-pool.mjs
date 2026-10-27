import assert from 'node:assert/strict';
import {DialogueGrammar} from '../lib/living/dialogue-grammar.ts';
import {emptyDialoguePool,rememberDialogue,hasDialogue,readDialoguePool,writeDialoguePool,lineHash} from '../lib/living/dialogue-pool.ts';
import {pronounsFor,addressTemplate} from '../lib/living/identity.ts';
const young={id:'an',name:'An',age:24,gender:'male'},elder={id:'elder',name:'Minh',age:65,gender:'unspecified'},aunt={id:'aunt',name:'Lan',age:44,gender:'female'};
assert.deepEqual(pronounsFor(young,elder),{self:'cháu',other:'bác'});assert.deepEqual(pronounsFor(elder,young),{self:'bác',other:'cháu'});
assert.deepEqual(pronounsFor(young,aunt),{self:'cháu',other:'cô'});assert.deepEqual(pronounsFor(aunt,young),{self:'cô',other:'cháu'});
assert.equal(addressTemplate('Bạn có muốn đọc cùng mình không?',young,elder),'Bác có muốn đọc cùng cháu không?');
assert.equal(addressTemplate('Mình cùng bạn đọc nhé.',elder,young),'Bác cùng cháu đọc nhé.');
assert.deepEqual(pronounsFor({id:'x',name:'X'},elder),{self:'mình',other:'bạn'});
const initial=emptyDialoguePool(),saved=JSON.stringify(initial),grammar=new DialogueGrammar();
const lines=grammar.lines(young,elder,'Thư viện',0,6);assert(lines[0].text.includes('Bác')||lines[0].text.includes('cháu'));
const pool=rememberDialogue(initial,young.id,elder.id,lines,'rules');assert.equal(JSON.stringify(initial),saved);
assert(hasDialogue(pool,elder.id,young.id,lines));assert(!hasDialogue(pool,'binh',young.id,lines));assert.deepEqual(JSON.parse(JSON.stringify(pool)),pool);
const storageMap=new Map(),storage={getItem:k=>storageMap.get(k)??null,setItem:(k,v)=>storageMap.set(k,v)};
writeDialoguePool('world-one',pool,storage);assert.deepEqual(readDialoguePool('world-one',storage),pool);assert.deepEqual(readDialoguePool('world-two',storage),emptyDialoguePool());
const serialized=[...storageMap.values()][0];assert(!serialized.includes(lines[0].text),'Browser persistence contains hashes, not raw speech');
const afterReload=new DialogueGrammar();afterReload.seed(readDialoguePool('world-one',storage).entries.flatMap(e=>e.lineHashes));
const newer=afterReload.lines(young,elder,'Thư viện',0,6);assert(newer.every(l=>!lines.some(old=>lineHash(old.text)===lineHash(l.text))),'Reload cannot repeat the stored generated lines');
let bounded=pool;
for(let n=1;n<500;n++) {
 const g=new DialogueGrammar();g.seed(bounded.entries.flatMap(e=>e.lineHashes));const next=g.lines(young,elder,'Thư viện',n,6);
 assert(!hasDialogue(bounded,young.id,elder.id,next));bounded=rememberDialogue(bounded,young.id,elder.id,next,'rules');assert(bounded.entries.length<=64);
}
assert(JSON.stringify(bounded).length<64000);
const blocked={getItem(){throw Error('Storage denied');},setItem(){throw Error('Storage full');}};
assert.deepEqual(readDialoguePool('world-one',blocked),emptyDialoguePool());assert.doesNotThrow(()=>writeDialoguePool('world-one',pool,blocked));
const corrupt={getItem:()=>'{invalid',setItem(){}};assert.deepEqual(readDialoguePool('world-one',corrupt),emptyDialoguePool());
console.log(JSON.stringify({suite:'dialogue-pool',honorificReciprocity:true,serverJSONRoundtrip:true,reloadAntiRepeat:true,boundedScenes:64,generatedScenes:500,hashesOnlyBrowserPersistence:true,storageFailureFallback:true,notProofOfHearing:true}));
