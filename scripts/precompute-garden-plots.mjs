import {readFileSync,writeFileSync} from 'node:fs';
import {streetProps} from '../lib/city/scenery.ts';
import {groundElevation} from '../lib/city/ground.ts';
const plots=streetProps.filter(p=>p.kind==='flowers').map(({id,venue,x,z,width,depth,seed})=>({id,venue,x,z,width,depth,seed,floor:groundElevation(x,z),label:`Khóm hoa · ${venue}`}));
if(!plots.length)throw Error('No garden plots share a rendered footprint');
const result=JSON.stringify({version:1,plots},null,2)+'\n',path='data/city/garden-plots.json';
if(process.argv.includes('--check')){if(readFileSync(path,'utf8')!==result)throw Error('Garden plots are stale: run precompute-garden-plots');}
else writeFileSync(path,result);
console.log(JSON.stringify({gardenPlots:plots.length,footprints:'existing street props',mode:process.argv.includes('--check')?'checked':'generated'}));
