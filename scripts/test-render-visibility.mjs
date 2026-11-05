import assert from 'node:assert/strict';
import {observeRenderVisibility} from '../components/city/three/render-visibility.ts';
const previous={document:globalThis.document,IntersectionObserver:globalThis.IntersectionObserver};
let callback,observed,root,disconnects=0;
const dialog={},host={clientWidth:540,clientHeight:360,closest:selector=>selector==='dialog'?dialog:null};
try{
 globalThis.document={hidden:false};
 globalThis.IntersectionObserver=class{constructor(fn,options){callback=fn;root=options.root;}observe(target){observed=target;}disconnect(){disconnects++;}};
 const gate=observeRenderVisibility(host);assert.equal(root,dialog);assert.equal(observed,host);
 const entry=inside=>({target:host,isIntersecting:inside,intersectionRect:{width:inside?540:0,height:inside?360:0}});
 callback([entry(false),entry(true)]);assert.equal(gate.visible(),true,'A visible dialog must not be stuck on its earlier hidden record');
 callback([entry(true),entry(false)]);assert.equal(gate.visible(),false,'A room scrolled away must stop drawing');
 callback([entry(true)]);assert.equal(gate.visible(),true);
 document.hidden=true;assert.equal(gate.visible(),false);document.hidden=false;assert.equal(gate.visible(),true);
 host.clientWidth=0;assert.equal(gate.visible(),false);host.clientWidth=540;
 gate.dispose();gate.dispose();callback([entry(true)]);assert.equal(gate.visible(),false);assert.equal(disconnects,1);
 globalThis.IntersectionObserver=undefined;
 const fallback=observeRenderVisibility(host);assert.equal(fallback.visible(),true);fallback.dispose();assert.equal(fallback.visible(),false);
 console.log(JSON.stringify({suite:'render-visibility',pass:true,latestQueuedTransition:true,dialogRoot:true,hiddenAndZeroSizeSuppressed:true,disposeIdempotent:true}));
}finally{
 for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
}
