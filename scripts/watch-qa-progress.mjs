/** Offline comparison only: no credentials, HTTP, D1 mutation or scheduler. */
import {openSync,readSync,closeSync,fstatSync,constants} from 'node:fs';
import {compareProgress} from '../lib/ops/progress-watch.ts';
function readProgressFile(path){
  const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{
    const stat=fstatSync(fd);if(!stat.isFile()||stat.size>8192)throw Error('Invalid snapshot');
    const bytes=Buffer.alloc(8193);let used=0,n;
    while(used<bytes.length&&(n=readSync(fd,bytes,used,bytes.length-used,null))>0)used+=n;
    if(used>8192)throw Error('Invalid snapshot');
    return JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(bytes.subarray(0,used)));
  }finally{closeSync(fd);}
}
{
  try{
    const args=process.argv.slice(2);
    if(args.length!==2)throw Error('Expected two snapshots');
    console.log(JSON.stringify(compareProgress(readProgressFile(args[0]),readProgressFile(args[1]))));
  }catch{console.error('Cannot compare progress snapshots. Supply two valid aggregate JSON files, earliest first.');process.exitCode=1;}
}
