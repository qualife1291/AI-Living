/** Isolated local QA only. No production URL, credential or --remote option. Stop preview first. */
import {writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {seed} from '../lib/world.ts';
import {initializeLiving,turnId,localDate} from '../lib/living/engine.ts';
const now=Date.now(),created=new Date(now).toISOString(),w=structuredClone(seed);
w.born='2026-10-24T17:00:00.000Z';w.living=initializeLiving(now);w.living.lastTurnId=turnId(now);w.living.lastTickAt=created;
w.clock={pausedAt:null,pausedMs:0,scale:.1,anchors:[{realMs:now,simMs:43200000,scale:.1}]};
w.people[0].plan={from:'Sân chung',createdAt:created,pausedMs:0,simStartedAt:43200000,steps:[{location:'Sân bay',kind:'work',activity:'Khảo sát đường đi',duration:900}]};
const turn={id:turnId(now),createdAt:created,date:localDate(now),title:'Fixture chuyển động',summary:'Chỉ QA local',location:'Sân bay',activity:'Đi khảo sát',kind:'work',residentId:w.living.residents[0].id,dialogue:[],generator:'rules',simStartedAt:43200000};
const literal=v=>"'"+JSON.stringify(v).replaceAll("'","''")+"'";
mkdirSync('work',{recursive:true});writeFileSync('work/experience-fixture.sql',`INSERT INTO worlds(id,revision,data) VALUES('home',0,${literal(w)}) ON CONFLICT(id) DO UPDATE SET data=excluded.data,revision=revision+1;\nINSERT OR IGNORE INTO living_turns(id,created_at,data) VALUES('${turn.id}','${created}',${literal(turn)});\n`);
const r=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','work/liveness-qa','--file','work/experience-fixture.sql'],{stdio:'inherit'});process.exit(r.status??1);
