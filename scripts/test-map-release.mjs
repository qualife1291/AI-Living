import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildingHeight,closedFootprint} from '../lib/city/osm.ts';
import {adminAllowed} from '../lib/admin.ts';
const osm=JSON.parse(readFileSync(new URL('../data/city/hcm-district1.json',import.meta.url)));
const buildings=osm.features.filter(closedFootprint);assert.ok(buildings.length>500);
for(const f of buildings)assert.ok(buildingHeight(f).meters>0);
const f=buildings[0];assert.equal(buildingHeight({...f,heightM:42}).source,'height-tag');assert.ok(Math.abs(buildingHeight({...f,heightM:-4,levels:3}).meters-9.6)<1e-9);assert.equal(buildingHeight({...f,heightM:Infinity,levels:NaN}).source,'default-estimate');assert.equal(closedFootprint({...f,points:[[1,2],[2,3],[4,5],[NaN,2]]}),false);
assert.equal(adminAllowed(new Request('https://private.example/api/events'),{privateOrigin:'https://private.example'}),true);
assert.equal(adminAllowed(new Request('https://other.example/api/events'),{privateOrigin:'https://private.example'}),false);
const j=JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url)));assert.equal(j.entries.at(-1).idx,4);assert.equal(j.entries.at(-1).tag,'0004_release_schema_reconciliation');
const sql=readFileSync(new URL('../drizzle/0004_release_schema_reconciliation.sql',import.meta.url),'utf8');
for(const statement of sql.split('--> statement-breakpoint')) {const clean=statement.replace(/^--.*$/mg,'').trim();assert.match(clean,/^CREATE (TABLE|INDEX) IF NOT EXISTS/);assert.equal(clean.split(';').filter(v=>v.trim()).length,1);}
console.log(`PASS: ${buildings.length} closed OSM footprints, height provenance, malformed input, exact-origin private boundary, schema-only reconciliation with one statement per breakpoint.`);
