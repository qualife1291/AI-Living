/** Audio API lifecycle/ordering contract. Actual decoding/output belongs to browser QA. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {StudioSound} from '../components/studio/sound.ts';
import {scenarioFrame} from '../lib/city/scenarios/index.ts';
const original={AudioContext:globalThis.AudioContext,document:globalThis.document,fetch:globalThis.fetch},nodes=[],contexts=[];
const parameter=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}});
class Node {connect(){}disconnect(){this.disconnected=true;}}
class Source extends Node {gain=parameter();frequency=parameter();playbackRate=parameter();started=false;stopped=false;constructor(){super();nodes.push(this);}start(){assert(!this.started,'Source starts once');this.started=true;}stop(){assert(this.started,'WebAudio requires start before stop');this.stopped=true;}}
class Context {
 currentTime=0;sampleRate=100;state='suspended';closes=0;
 constructor(){contexts.push(this);}async resume(){this.state='running';}async close(){this.state='closed';this.closes++;}
 createGain(){const n=new Node();n.gain=parameter();return n;}
 createAnalyser(){const n=new Node();n.fftSize=256;n.getFloatTimeDomainData=a=>a.fill(0);return n;}
 createBufferSource(){return new Source();}createOscillator(){return new Source();}
 createBuffer(_channels,length){return {getChannelData:()=>new Float32Array(length)};}
 async decodeAudioData(){return {duration:5};}
}
try{
 globalThis.AudioContext=Context;globalThis.document={hidden:false};globalThis.fetch=async url=>new Response(readFileSync('public'+url));
 let stats;const sound=new StudioSound(s=>stats=s);assert.equal(contexts.length,0,'No context before opt-in');assert(await sound.enable());assert.equal(stats.decoded,21);
 sound.sync(scenarioFrame('wallet-return',54.4),true);assert.equal(stats.voiceId,'wallet-return-54');assert.equal(stats.active,2);sound.sync(scenarioFrame('wallet-return',54.4),false);assert.equal(stats.active,0);
 // Actual scenario travel crosses footstep boundaries and exercises both source APIs.
 for(let n=0;n<60;n++)sound.sync(scenarioFrame('wallet-return',25+n/10),true);
 assert(stats.effects>0);
 globalThis.document.hidden=true;sound.sync(scenarioFrame('wallet-return',31),true);assert.equal(stats.active,0);globalThis.document.hidden=false;
 sound.sync(scenarioFrame('kitten-care',25.4),true);sound.mute();assert.equal(stats.active,0);assert.equal(stats.status,'off');
 assert(await sound.enable());sound.sync(scenarioFrame('bakery-courtesy',60.4),true);sound.dispose();sound.dispose();assert.equal(contexts[0].closes,1);assert.equal(contexts[0].state,'closed');assert(nodes.every(n=>n.stopped&&n.disconnected));
 console.log(JSON.stringify({suite:'studio-sound-lifecycle',voicesVerifiedByHash:21,sourceOrdering:true,footsteps:true,pauseHiddenMute:true,idempotentDispose:true,scope:'mocked WebAudio API contract; not an audio output or quality measurement'}));
}finally{Object.assign(globalThis,original);}
