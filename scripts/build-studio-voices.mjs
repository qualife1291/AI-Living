/** Offline optional asset authoring. Runtime never downloads a TTS model. */
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {scenarioDefinitions,scenarioFrame} from '../lib/city/scenarios/index.ts';
const root='.sites-runtime/tts',out='public/audio/studio';mkdirSync(out,{recursive:true});
const model=`${root}/vi_VN-vais1000-medium.onnx`,sha=createHash('sha256').update(readFileSync(model)).digest('hex');
if(sha!=='ec7c89e2c85f4d1edc24b6120c18aaf1bda614f06b511567eb9c7c0de15e2dab')throw Error('Unreviewed voice model');
const lines=[];for(const s of scenarioDefinitions)for(let t=0;t<120;t+=.25)for(const l of scenarioFrame(s.id,t).dialogue){const id=`${s.id}-${l.at}`;if(!lines.some(v=>v.id===id))lines.push({id,scenario:s.id,...l,url:`/audio/studio/${id}.ogg`});}
writeFileSync(`${root}/lines.json`,JSON.stringify(lines));
const run=spawnSync(`${root}/venv/bin/python`,['scripts/build-studio-voices.py'],{stdio:'inherit'});if(run.status!==0)process.exit(run.status??1);
const clips=JSON.parse(readFileSync(`${root}/rendered.json`));
writeFileSync(`${out}/manifest.json`,JSON.stringify({version:1,kind:'fictional-editorial-synthetic-speech',language:'vi-VN',engine:'piper-tts 1.4.1 (offline)',model:{repository:'rhasspy/piper-voices',revision:'5041a7a49ae5b3a0f30e6837769eb03fdbb231bd',path:'vi/vi_VN/vais1000/medium/vi_VN-vais1000-medium.onnx',sha256:sha,dataset:'VAIS-1000',license:'CC-BY-4.0',source:'https://ieee-dataport.org/documents/vais-1000-vietnamese-speech-synthesis-corpus'},clips},null,2)+'\n');
