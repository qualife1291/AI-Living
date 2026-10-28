import {readFileSync,writeFileSync,existsSync,mkdirSync,statSync,realpathSync} from 'node:fs';
import {resolve,dirname,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
export const replayRoot=fileURLToPath(new URL('../',import.meta.url));
export const digest=raw=>createHash('sha256').update(raw).digest('hex');
export function corpusDigest(corpus){const hash=createHash('sha256');for(const e of corpus.examples)hash.update(e.canonical+'\n');return hash.digest('hex');}
export function verifiedReplayFile(path){
 if(statSync(path).size>3_000_000)throw Error('Replay artifact exceeds size budget');
 let file;try{file=JSON.parse(readFileSync(path,'utf8'));}catch{throw Error('Invalid replay artifact JSON');}
 const {sha256,...payload}=file;if(digest(JSON.stringify(payload))!==sha256)throw Error('Replay artifact checksum mismatch');return file;
}
export function writeReplayFile(path,payload){
 const sha256=digest(JSON.stringify(payload)),raw=JSON.stringify({...payload,sha256},null,2)+'\n';
 if(existsSync(path)){if(readFileSync(path,'utf8')!==raw)throw Error('Different replay artifact exists; preserve the baseline');return sha256;}
 mkdirSync(dirname(path),{recursive:true});writeFileSync(path,raw,{flag:'wx'});return sha256;
}
export function privateReplayPath(path){
 const root=resolve(replayRoot,'.sites-runtime/training'),out=resolve(path);
 if(!out.startsWith(root+sep)||!out.endsWith('.json'))throw Error('Private replay output must be a JSON file under .sites-runtime/training');
 mkdirSync(dirname(out),{recursive:true});
 if(realpathSync(root)!==root)throw Error('Private replay directory must not redirect outside its path');
 if(!realpathSync(dirname(out)).startsWith(realpathSync(root)+sep)&&realpathSync(dirname(out))!==realpathSync(root))throw Error('Private replay output leaves its directory');
 if(relative(root,out).split(sep).some(p=>p==='..'))throw Error('Invalid private replay path');
 return out;
}
