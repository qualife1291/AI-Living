import manifest from '../../public/audio/studio/manifest.json' with {type:'json'};
import type {ScenarioFrame} from '../../lib/city/scenarios/index.ts';
type Voice=typeof manifest.clips[number];
/** Seekable, opt-in audio for fictional Studio. Never affects live world state. */
export class StudioSound {
 private context:AudioContext|null=null;private master:GainNode|null=null;private analyser:AnalyserNode|null=null;
 private buffers=new Map<string,AudioBuffer>();private abort=new AbortController();private dead=false;private enabled=false;
 private voice:{source:AudioBufferSourceNode;clip:Voice;started:number;offset:number}|null=null;
 private sources=new Set<AudioScheduledSourceNode>();private ambient:AudioBufferSourceNode|null=null;
 private previous:{id:string;time:number;travel:Map<string,number>}|null=null;private noise:AudioBuffer|null=null;private loading:Promise<void>|null=null;
 private stats={status:'off',voices:0,effects:0,active:0,offset:0,voiceId:'',rms:0,decoded:0,failures:0};
 constructor(private report:(state:typeof this.stats)=>void){}
 async enable(){
  if(this.dead)return false;
  try{
   this.context??=new AudioContext();await this.context.resume();if(this.dead)return false;
   this.enabled=true;
   if(!this.master){this.master=this.context.createGain();this.master.gain.value=.55;this.analyser=this.context.createAnalyser();this.analyser.fftSize=256;this.master.connect(this.analyser);this.analyser.connect(this.context.destination);}
   this.stats.status='loading';this.publish();
   this.loading??=Promise.all(manifest.clips.map(async clip=>{try{const r=await fetch(clip.url,{signal:this.abort.signal});if(!r.ok)throw Error('Voice unavailable');const bytes=await r.arrayBuffer();const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');if(sha!==clip.sha256)throw Error('Voice integrity');const buffer=await this.context!.decodeAudioData(bytes);if(!this.dead)this.buffers.set(clip.id,buffer);}catch{if(!this.dead)this.stats.failures++;}})).then(()=>{this.stats.decoded=this.buffers.size;});
   await this.loading;if(this.dead)return false;this.stats.status=this.enabled?(this.stats.failures?'partial':'ready'):'off';this.publish();return this.enabled;
  }catch{this.stats.status='unavailable';this.enabled=false;this.publish();return false;}
 }
 mute(){this.enabled=false;this.stop();this.stats.status='off';this.publish();}
 private publish(){this.stats.active=this.sources.size;this.report({...this.stats});}
 private stop(){for(const source of this.sources){try{source.stop();}catch{ /* already ended */ }source.disconnect();}this.sources.clear();this.voice=null;this.ambient=null;this.previous=null;this.stats.rms=0;this.stats.voiceId='';}
 private connect(source:AudioScheduledSourceNode,gain:number,duration?:number){const ctx=this.context!,level=ctx.createGain();level.gain.setValueAtTime(0,ctx.currentTime);level.gain.linearRampToValueAtTime(gain,ctx.currentTime+.012);if(duration){level.gain.setTargetAtTime(0,ctx.currentTime+duration*.55,Math.max(.01,duration*.12));}
  (source as AudioNode).connect(level);level.connect(this.master!);this.sources.add(source);source.onended=()=>{source.disconnect();level.disconnect();this.sources.delete(source);};return level;}
 private noiseBuffer(){if(this.noise)return this.noise;const ctx=this.context!,buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),data=buffer.getChannelData(0);let seed=197,previous=0;for(let i=0;i<data.length;i++){seed=(1664525*seed+1013904223)>>>0;previous=(previous+(seed/4294967296*2-1)*.02)/1.02;data[i]=previous;}return this.noise=buffer;}
 private rustle(gain=.15,duration=.2){const source=this.context!.createBufferSource();source.buffer=this.noiseBuffer();source.playbackRate.value=2.5;this.connect(source,gain,duration);source.start(0,.2);source.stop(this.context!.currentTime+duration);this.stats.effects++;}
 private tone(frequency:number,gain:number,duration:number,to=frequency,type:OscillatorType='sine'){const ctx=this.context!,source=ctx.createOscillator();source.type=type;source.frequency.setValueAtTime(frequency,ctx.currentTime);source.frequency.exponentialRampToValueAtTime(to,ctx.currentTime+duration);this.connect(source,gain,duration);source.start();source.stop(ctx.currentTime+duration);this.stats.effects++;}
 sync(frame:ScenarioFrame,playing:boolean){
  if(this.dead)return;if(!this.enabled||!this.context||!this.master||document.hidden||!playing||frame.complete){if(this.sources.size)this.stop();this.publish();return;}
  const prior=this.previous,seek=!prior||prior.id!==frame.id||frame.time<prior.time||frame.time-prior.time>.45;
  if(seek)this.stop();
  if(!this.ambient){const source=this.context.createBufferSource();source.buffer=this.noiseBuffer();source.loop=true;this.connect(source,frame.theme.wetness>.2?.09:.035);source.start();this.ambient=source;}
  const clip=manifest.clips.find(c=>c.scenario===frame.id&&frame.time>=c.at&&frame.time<c.at+c.duration);
  if(this.voice&&(this.voice.clip.id!==clip?.id||Math.abs((this.context.currentTime-this.voice.started+this.voice.offset)-(frame.time-this.voice.clip.at))>.22)){this.voice.source.stop();this.voice=null;this.stats.voiceId='';}
  if(clip&&!this.voice&&this.buffers.has(clip.id)){const source=this.context.createBufferSource();source.buffer=this.buffers.get(clip.id)!;const offset=Math.max(0,frame.time-clip.at);this.connect(source,.94);source.start(0,offset);this.voice={source,clip,started:this.context.currentTime,offset};this.stats.voices++;this.stats.offset=offset;this.stats.voiceId=clip.id;}
  if(!seek&&prior){
   for(const a of frame.actors){const old=prior.travel.get(a.id);if(a.species==='cat'||old===undefined||a.speedMps<.05)continue;if(Math.floor(old/.65)!==Math.floor(a.travelMeters/.65)){this.tone(a.mobility?100:135,.09,.09,55);this.rustle(.09,.09);}}
   for(const e of frame.events)if(e.at>prior.time&&e.at<=frame.time){if(/cloth|warm|bread|wallet|broom|water|item-picked/.test(e.type))this.rustle(.18,.35);if(/received|returned|consented/.test(e.type))this.tone(520,.035,.12,650);}
   if(frame.id==='wallet-return'&&prior.time<12.391&&frame.time>=12.391){this.tone(145,.25,.11,60);this.rustle(.2,.12);}
   if(frame.id==='sanitation-gratitude'&&frame.actors.some(a=>a.action==='sweep')&&Math.floor(prior.time*1.3)!==Math.floor(frame.time*1.3))this.rustle(.13,.38);
   if(frame.id==='kitten-care'&&frame.time<55&&Math.floor(prior.time/8)!==Math.floor(frame.time/8))this.tone(740,.07,.48,410,'triangle');
  }
  this.previous={id:frame.id,time:frame.time,travel:new Map(frame.actors.map(a=>[a.id,a.travelMeters]))};
  if(this.analyser){const values=new Float32Array(this.analyser.fftSize);this.analyser.getFloatTimeDomainData(values);this.stats.rms=Math.sqrt(values.reduce((s,v)=>s+v*v,0)/values.length);}
  this.publish();
 }
 dispose(){if(this.dead)return;this.dead=true;this.enabled=false;this.abort.abort();this.stop();this.master?.disconnect();this.analyser?.disconnect();void this.context?.close();this.buffers.clear();}
}
