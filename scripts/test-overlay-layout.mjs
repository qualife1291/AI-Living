import assert from 'node:assert/strict';
import {speechRect,nameLabels} from '../lib/city/overlay-layout.ts';
for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1440,height:900}]){
 for(const anchor of [{x:0,y:60},{x:viewport.width,y:viewport.height-100},{x:viewport.width/2,y:viewport.height/2}]){
  const bubble=speechRect(anchor,{width:292,height:180},viewport);
  assert(bubble.x>=12&&bubble.x+bubble.width<=viewport.width-12);
  assert(bubble.y>=82&&bubble.y+bubble.height<=viewport.height-(viewport.width<=900?162:104));
  const labels=nameLabels(Array.from({length:100},(_,i)=>({id:`p${i}`,name:i?'Người hàng xóm có tên rất dài':'An',x:viewport.width/2+(i%5)*20,y:viewport.height/2+Math.floor(i/5)*28,selected:i===0,speaking:i===1})),viewport,bubble);
  assert(labels.length<=16);
  for(const a of labels){assert(a.width<=116&&a.height===26);assert(a.x>=10&&a.x+a.width<=viewport.width-10);for(const b of [...labels.filter(b=>b!==a),bubble])assert(a.x>=b.x+b.width||a.x+a.width<=b.x||a.y>=b.y+b.height||a.y+a.height<=b.y);}
 }
}
const crowded=Array.from({length:20},(_,i)=>({id:String(i),name:'An',x:190,y:300,selected:i===19,speaking:false}));
assert.equal(nameLabels(crowded,{width:390,height:844})[0].id,'19','Selected actor receives the first placement');
console.log('PASS compact labels: bounds, collision avoidance, priority and long names; speech fits safe viewport');
