/** Local numeric experiment artifacts only. No secret, DB, HTTP or runtime loader. */
import {lstatSync,fstatSync,mkdirSync,openSync,writeFileSync,closeSync,readSync,constants} from 'node:fs';
import {resolve,dirname,sep,parse} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve(fileURLToPath(new URL('../',import.meta.url)),'.sites-runtime/training');
export const studyDigest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function pathTo(value,create){
 if(typeof value!=='string'||value.split(/[\\/]/).includes('..'))throw Error('study-path');const out=resolve(value);
 if(!out.startsWith(root+sep)||!out.endsWith('.json'))throw Error('study-path');
 let current=parse(out).root;
 for(const part of dirname(out).slice(current.length).split(sep).filter(Boolean)){
  current=resolve(current,part);let s;try{s=lstatSync(current);}catch(e){if(e.code!=='ENOENT'||!create)throw Error('study-parent');mkdirSync(current);s=lstatSync(current);}
  if(!s.isDirectory()||s.isSymbolicLink())throw Error('study-parent');
 }
 return out;
}
export function prepareStudyOutput(value){const path=pathTo(value,true);try{lstatSync(path);}catch(e){if(e.code==='ENOENT')return path;throw e;}throw Error('study-output-exists');}
export function writeStudyOutput(path,payload,maxBytes=8_000_000){
 pathTo(path,false);const sha256=studyDigest(payload),raw=JSON.stringify({...payload,sha256},null,2)+'\n';if(Buffer.byteLength(raw)>maxBytes)throw Error('study-output-budget');
 const fd=openSync(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);try{writeFileSync(fd,raw);}finally{closeSync(fd);}return sha256;
}
export function readStudyModel(value,expected){
 const path=pathTo(value,false),s=lstatSync(path);if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size>1_000_000)throw Error('study-input');
 const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);let raw;try{const actual=fstatSync(fd);if(!actual.isFile()||actual.nlink!==1||actual.ino!==s.ino||actual.dev!==s.dev||actual.size>1_000_000)throw Error('study-input');const bytes=Buffer.alloc(1_000_001);let size=0,n;while(size<bytes.length&&(n=readSync(fd,bytes,size,bytes.length-size,null))>0)size+=n;if(size>1_000_000)throw Error('study-input-budget');raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,size));}finally{closeSync(fd);}
 if(raw.charCodeAt(0)===0xfeff)throw Error('study-utf8');const {sha256,...payload}=JSON.parse(raw);
 if(!/^[a-f0-9]{64}$/.test(expected??'')||sha256!==expected||studyDigest(payload)!==sha256||payload.kind!=='H3b-ground-study-v1'||payload.stage!=='train')throw Error('study-checksum-or-stage');return payload;
}
