import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {cityBuildings} from '../lib/city/three-layout.ts';
import {bodyWalkable,groundObstacles} from '../lib/city/walk-ground.ts';
import {safeWalkPath} from '../lib/city/walkability.ts';
import {places,distance} from '../lib/life.ts';
const center=places['Khu dân cư'],buildings=cityBuildings().filter(b=>!b.tower).sort((a,b)=>distance([a.x,a.z],center)-distance([b.x,b.z],center)||a.x-b.x||a.z-b.z),anchors=[];
for(const b of buildings) {
 for(const [side,x,z] of [['front',b.x,b.z+b.depth/2+15],['back',b.x,b.z-b.depth/2-15],['left',b.x-b.width/2-15,b.z],['right',b.x+b.width/2+15,b.z]]) {
  const point=[x,z];if(!bodyWalkable(point,9.2)||[4.8,9.2].some(radius=>distance(safeWalkPath(center,point,radius).at(-1),point)>.1))continue;
  anchors.push({id:`home-${b.x}-${b.z}-${side}`,building:{x:b.x,z:b.z},point,address:`Nhà ${String(anchors.length+1).padStart(2,'0')}`});break;
 }
 if(anchors.length===60)break;
}
if(anchors.length!==60)throw Error('Sixty reachable low-rise home doors are required');
const result={version:1,layoutFingerprint:createHash('sha256').update(JSON.stringify(groundObstacles)).digest('hex'),anchors},text=JSON.stringify(result,null,2)+'\n',path='data/city/home-anchors.json';
if(process.argv.includes('--check')){if(readFileSync(path,'utf8')!==text)throw Error('Home anchors are stale: run precompute-home-anchors');}
else writeFileSync(path,text);
console.log(JSON.stringify({homeDoors:anchors.length,reachability:'verified',radius:9.2,mode:process.argv.includes('--check')?'checked':'generated'}));
