/** Fresh temporary local D1 only. Never accepts a DB path or remote argument. */
import {mkdtempSync,writeFileSync,readdirSync,readFileSync} from 'node:fs';
import {join,resolve,basename} from 'node:path';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {readMigrationFiles} from 'drizzle-orm/migrator';
if(process.argv.length!==2)throw Error('Fixture accepts no arguments');
const config=JSON.parse(readFileSync('dist/server/wrangler.json','utf8'));
if(config.ai||config.browser||config.d1_databases?.length!==1||config.d1_databases[0].binding!=='DB'||config.d1_databases[0].remote)throw Error('Local-only fixture configuration required');
const statePath=mkdtempSync('/tmp/xom-phase-verification-');
writeFileSync(join(statePath,'.chat-verification-fixture.json'),JSON.stringify({purpose:'chat-verification-only',productionAccess:false}),{mode:0o600});
const sqlFile=join(statePath,'schema.sql');
writeFileSync(sqlFile,readMigrationFiles({migrationsFolder:'drizzle'}).flatMap(m=>m.sql).join(';\n'),{mode:0o600});
const migration=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to',statePath,'--file',sqlFile],{encoding:'utf8',timeout:60000});
if(migration.status!==0)throw Error('Temporary local migration failed');
const paths=readdirSync(join(statePath,'v3/d1'),{recursive:true}).filter(p=>p.endsWith('.sqlite')&&basename(p)!=='metadata.sqlite');
if(paths.length!==1)throw Error('Ambiguous temporary fixture');
const dbPath=resolve(statePath,'v3/d1',paths[0]),db=new DatabaseSync(dbPath,{readOnly:true});
try{
 const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
 for(const name of ['worlds','visitor_exchanges','context_cache'])if(!tables.some(t=>t.name===name))throw Error('Fixture schema missing');
 if(db.prepare('SELECT count(*) AS n FROM worlds').get().n||db.prepare('SELECT count(*) AS n FROM visitor_exchanges').get().n)throw Error('Fixture was not empty');
 console.log(JSON.stringify({statePath,dbPath,tableCount:tables.length,fixtureOnly:true,productionAccess:false}));
}finally{db.close();}
