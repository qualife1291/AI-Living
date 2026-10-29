/** Independent fault cases for the exact row/counter coupling, on isolated SQLite. */
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readMigrationFiles} from 'drizzle-orm/migrator';
import {saveVisitorExchange,CHAT_GATE_KEY} from '../lib/living/interaction-store.ts';
const t=1800000000000,results=[];
const cases=[
 ['counter-deleted-after-insert',"CREATE TRIGGER fault AFTER INSERT ON visitor_exchanges BEGIN DELETE FROM context_cache WHERE id='internal:visitor-chat:v1'; END"],
 ['exchange-rewritten-after-insert',"CREATE TRIGGER fault AFTER INSERT ON visitor_exchanges BEGIN UPDATE visitor_exchanges SET data='{}' WHERE id=NEW.id; END"],
 ['count-decremented-after-insert',"CREATE TRIGGER fault AFTER INSERT ON visitor_exchanges BEGIN UPDATE context_cache SET data=json_set(data,'$.count',json_extract(data,'$.count')-1) WHERE id='internal:visitor-chat:v1'; END"],
 ['counter-fraction',null,{count:.5,lastId:crypto.randomUUID()}],
 ['counter-boolean',null,{count:true,lastId:crypto.randomUUID()}],
 ['counter-stale-id-and-ignored-update',"CREATE TRIGGER fault BEFORE UPDATE ON context_cache BEGIN SELECT RAISE(IGNORE); END",'next-id'],
];
for(const [name,trigger,corrupt] of cases){
 const raw=new DatabaseSync(':memory:');
 try{
  for(const m of readMigrationFiles({migrationsFolder:'drizzle'}))for(const sql of m.sql)raw.exec(sql);
  const db={prepare:sql=>({bind:(...params)=>({sql,params})}),async batch(statements){raw.exec('BEGIN');try{const out=statements.map(({sql,params})=>{const s=raw.prepare(sql);return s.columns().length?{results:s.all(...params)}:{results:[],meta:s.run(...params)};});raw.exec('COMMIT');return out;}catch(e){raw.exec('ROLLBACK');throw e;}}};
  const make=()=>({id:crypto.randomUUID(),actorId:'an',message:'Chào bạn',reply:'Chào!',name:'An',source:'rules',createdAt:new Date(t).toISOString()});
  await saveVisitorExchange(db,make(),t);const next=make();
  if(corrupt)raw.prepare('UPDATE context_cache SET data=? WHERE id=?').run(JSON.stringify(corrupt==='next-id'?{count:1,lastId:next.id}:corrupt),CHAT_GATE_KEY);
  if(trigger)raw.exec(trigger);
  const snapshot=()=>JSON.stringify(['context_cache','visitor_exchanges'].map(table=>raw.prepare(`SELECT * FROM ${table} ORDER BY id`).all()));
  const before=snapshot();let rejected=false;try{await saveVisitorExchange(db,next,t+1);}catch{rejected=true;}
  results.push({name,rejected,unchanged:before===snapshot()});
 }finally{raw.close();}
}
console.log(JSON.stringify({suite:'chat-adversarial',results,productionAccess:false}));
assert(results.every(r=>r.rejected&&r.unchanged),'Every inconsistent write must fail and roll back counter+exchange');
