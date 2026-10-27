import { writeFileSync } from 'node:fs';
import { places } from '../lib/life.ts';
import { safeWalkPath, nearestWalkable, segmentWalkable } from '../lib/city/walkability.ts';
const paths={};
for(const from of Object.values(places))for(const to of Object.values(places)) {
 const a=nearestWalkable(from),b=nearestWalkable(to),path=safeWalkPath(a,b);
 if(Math.hypot(path.at(-1)[0]-b[0],path.at(-1)[1]-b[1])>.1)throw new Error('Unreachable venue');
 if(path.some((p,i)=>i&&!segmentWalkable(path[i-1],p)))throw new Error('Unsafe route');
 paths[`${a.join(',')}>${b.join(',')}`]=path;
}
writeFileSync(new URL('../data/assets/walk-routes.json',import.meta.url),JSON.stringify(paths)+'\n');
console.log('Precomputed',Object.keys(paths).length,'venue routes; arbitrary actor endpoints still use A*.');
