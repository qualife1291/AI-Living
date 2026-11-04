/** Exported aggregate files only; no HTTP, credentials, D1 or scheduling. */
import {openSync,readSync,closeSync,fstatSync,constants} from 'node:fs';
import {auditQaWindow} from '../lib/ops/qa-window.ts';
function read(path,limit){
  const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
  try{
    const stat=fstatSync(fd);if(!stat.isFile()||stat.size>limit)throw Error('Invalid input');
    const bytes=Buffer.alloc(limit+1);let used=0,n;
    while(used<bytes.length&&(n=readSync(fd,bytes,used,bytes.length-used,null))>0)used+=n;
    if(used>limit)throw Error('Input too large');
    return new TextDecoder('utf8',{fatal:true}).decode(bytes.subarray(0,used));
  }finally{closeSync(fd);}
}
try{
  const args=process.argv.slice(2);if(args.length!==3)throw Error('Expected three files');
  const before=JSON.parse(read(args[0],8192)),after=JSON.parse(read(args[1],8192));
  const lines=read(args[2],4*1024*1024).split(/\r?\n/).filter(s=>s.trim());
  if(lines.length>10000)throw Error('Too many logs');
  console.log(JSON.stringify(auditQaWindow(before,after,lines.map(s=>JSON.parse(s)))));
}catch{
  console.error('Cannot audit QA window. Supply two ordered aggregate snapshots and bounded custom-log NDJSON.');
  process.exitCode=1;
}
